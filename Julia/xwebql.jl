import Base.Iterators: flatten
using ArgParse
using CodecBzip2
using CodecLz4
using CodecZlib
using CodecZstd
using ConfParser
using HTTP
using JSON
using SQLite
using Sockets
using WebSockets
using x265_jll
using ZfpCompression
#using UUIDs

# needed by the x265 encoder
mutable struct x265_picture
    pts::Clong
    dts::Clong
    vbvEndFlag::Cint
    userData::Ptr{Cvoid}
    planeR::Ptr{Cuchar}
    planeG::Ptr{Cuchar}
    planeB::Ptr{Cuchar}
    planeA::Ptr{Cuchar}
    strideR::Cint
    strideG::Cint
    strideB::Cint
    strideA::Cint
    bitDepth::Cint
end

mutable struct x265_nal
    type::Cint
    sizeBytes::Cint
    payload::Ptr{UInt8}
end

x265_nal(nal::Ptr, idx::Integer) = unsafe_load(Ptr{x265_nal}(nal), idx)
x265_picture(picture::Ptr) = unsafe_load(Ptr{x265_picture}(picture))

function x265_apiver()
    @static if Sys.isapple()
        parts = split(x265_jll.get_libx265_path(), ".")
        return parts[length(parts)-1]
    end

    @static if Sys.islinux()
        parts = split(readlink(x265_jll.get_libx265_path()), ".")
        return last(parts)
    end

    @static if Sys.iswindows()
        error("Not implemented: don't know how to access a shared lib on Windows")
    end
end

@static if !Sys.iswindows()
    # version v4.1.0 changed the API yet again
    if parse(Int32, x265_apiver()) < 215
        error("x265 API version " * x265_apiver() * " used by Julia is too old, make sure Julia x265_jll package is v4.1.0 or higher.")
    end
end

@static if !Sys.iswindows()
    # the encoder_open function call uses the x265 API version
    const encoder_open = "x265_encoder_open_" * x265_apiver()
else
    const encoder_open = "x265_encoder_open"
end
# end of x265

include("kalman.jl")

function parse_commandline()
    s = ArgParseSettings()

    @add_arg_table s begin
        "--config"
        help = "a configuration file."
        default = "config.ini"
        "--port"
        help = "an HTTP listening port, defaults to 8080. WebSockets will use the next port (i.e. 8081). The port can also be specified in the .ini config file. Any config file will override this command-line argument."
        arg_type = Int
        default = 8080
    end

    return parse_args(s)
end

# parse command-line arguments (a config file, port numbers etc.)
parsed_args = parse_commandline()

LOCAL_VERSION = true
TIMEOUT = 60 # [s]

XHOME = ".cache"
XCACHE = ".cache"

const VERSION_MAJOR = 1
const VERSION_MINOR = 0
const VERSION_SUB = 21

const SERVER_STRING =
    "XWEBQL v" *
    string(VERSION_MAJOR) *
    "." *
    string(VERSION_MINOR) *
    "." *
    string(VERSION_SUB)

const WASM_VERSION = "25.03.18.0"
const VERSION_STRING = "J/SV2025-03-18.1-ALPHA"

const ZFP_HIGH_PRECISION = 16
const ZFP_MEDIUM_PRECISION = 11
const ZFP_LOW_PRECISION = 8

const SPECTRUM_HIGH_PRECISION = 24
const SPECTRUM_MEDIUM_PRECISION = 16

const FITS_CHUNK = 2880

# default config file
CONFIG_FILE = "config.ini"

const HT_DOCS = "htdocs"
HTTP_PORT = 8080
WS_PORT = HTTP_PORT + 1

# parse the command-line arguments
try
    global HTTP_PORT = parsed_args["port"]
    global WS_PORT = HTTP_PORT + 1
catch _
end

include("xevent.jl")

# a global list of FITS objects
XOBJECTS = Dict{String,XDataSet}()
XLOCK = ReentrantLock()

function streamFile(http::HTTP.Streams.Stream, path::String)
    # strip out a question mark (if there is any)
    pos = findlast("?", path)

    if !isnothing(pos)
        path = SubString(path, 1:(pos[1]-1))
    end

    # cache a response
    headers = ["Cache-Control" => "public, max-age=86400"]

    # add mime types
    if endswith(path, ".htm") || endswith(path, ".html")
        push!(headers, "Content-Type" => "text/html")
    end

    if endswith(path, ".txt")
        push!(headers, "Content-Type" => "text/plain")
    end

    if endswith(path, ".css")
        push!(headers, "Content-Type" => "text/css")
    end

    if endswith(path, ".js")
        push!(headers, "Content-Type" => "application/javascript")
    end

    if endswith(path, ".wasm")
        push!(headers, "Content-Type" => "application/wasm")
    end

    if endswith(path, ".pdf")
        push!(headers, "Content-Type" => "application/pdf")
    end

    if endswith(path, ".ico")
        push!(headers, "Content-Type" => "image/x-icon")
    end

    if endswith(path, ".png")
        push!(headers, "Content-Type" => "image/png")
    end

    if endswith(path, ".gif")
        push!(headers, "Content-Type" => "image/gif")
    end

    if endswith(path, ".webp")
        push!(headers, "Content-Type" => "image/webp")
    end

    if endswith(path, ".svg")
        push!(headers, "Content-Type" => "image/svg+xml")
    end

    if endswith(path, ".jpeg") || endswith(path, ".jpg")
        push!(headers, "Content-Type" => "image/jpeg")
    end

    if endswith(path, ".mp4")
        push!(headers, "Content-Type" => "video/mp4")
    end

    try
        if isfile(path)
            HTTP.setstatus(http, 200)

            # enumerate each header
            for (key, value) in headers
                HTTP.setheader(http, key => value)
            end

            startwrite(http)
            write(http, read(path))
        else
            HTTP.setstatus(http, 404)
            startwrite(http)
            write(http, "$path Not Found.")
        end
    catch e
        if occursin("ECONNRESET", string(e))
            println(e)
            return nothing
        end

        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Error: $e")
    end

    return nothing
end

function streamDirectory(http::HTTP.Streams.Stream)
    request::HTTP.Request = http.message
    request.body = read(http)
    closeread(http)

    @show request.target

    headers = ["Content-Type" => "application/json"]

    params = HTTP.queryparams(HTTP.URI(request.target))

    dir = ""

    try
        dir = params["dir"]

        # on Windows remove the root slash
        if Sys.iswindows() && length(dir) > 0
            dir = lstrip(dir, '/')
        end

        if dir == ""
            dir = homedir()
        end
    catch _
        # if they keyword is not found fall back on a home directory
        dir = homedir()
    end

    # append a slash so that on Windows "C:" becomes "C:/"
    if dir == "C:"
        dir = dir * "/"
    end

    println("Scanning $dir ...")

    resp = chop(JSON.json(Dict("location" => dir)), tail=1) * ", \"contents\":["

    elements = false

    try
        foreach(readdir(dir)) do f
            filename = lowercase(f)

            if !startswith(filename, ".")

                path = dir * Base.Filesystem.path_separator * f

                info = stat(path)

                if isdir(path)
                    dict = Dict(
                        "type" => "dir",
                        "name" => f,
                        "last_modified" => Libc.strftime(info.mtime),
                    )

                    resp *= JSON.json(dict) * ","
                    elements = true
                end

                if isfile(path)

                    # filter the filenames
                    if (endswith(filename, "_cl.evt") || endswith(filename, "_cl.evt.gz")) # && contains(filename, "sxs") # XRISM does not contain "sxs" in the filename

                        dict = Dict(
                            "type" => "file",
                            "size" => info.size,
                            "name" => f,
                            "last_modified" => Libc.strftime(info.mtime),
                        )

                        resp *= JSON.json(dict) * ","
                        elements = true
                    end
                end

            end
        end
    catch _
    end

    if elements
        resp = chop(resp, tail=1) * "]}"
    else
        resp *= "]}"
    end

    try
        HTTP.setstatus(http, 200)

        # enumerate each header
        for (key, value) in headers
            HTTP.setheader(http, key => value)
        end

        startwrite(http)
        write(http, resp)
    catch e
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Error: $e")
    end

    return nothing
end

function exitFunc(exception=false)
    global ws_server, gc_task, running

    running = false
    #@async Base.throwto(gc_task, InterruptException())
    #wait(gc_task)

    @info "shutting down XWEBQL ..."

    remove_symlinks()

    try
        println("WebSocket Server .out channel: ", string(take!(ws_server.out)))
        close(ws_server)
    catch e
        println(e)
    end

    # empty XOBJECTS
    for (key, value) in XOBJECTS
        println("Purging a dataset '$key' ...")
        println("id: $(value.id), uri: $(value.uri)")

        lock(XLOCK)

        try
            xobject = pop!(XOBJECTS, key)
            println("Removed '$(xobject.id)' .")
            finalize(xobject)
        catch e
            println("Failed to remove a dataset: $e")
        finally
            unlock(XLOCK)
        end

        # do not wait, trigger garbage collection *NOW*
        GC.gc()

        # yet another run to trigger finalizers ...
        GC.gc()
    end

    @info "XWEBQL shutdown completed."
    exit()
end

# the SIGINT will be caught later on
running = true
Base.exit_on_sigint(false)

function gracefullyShutdown(http::HTTP.Streams.Stream)
    @async exitFunc(true)

    closeread(http)

    HTTP.setstatus(http, 200)
    startwrite(http)
    write(http, "Shutting down $(SERVER_STRING)")
    return nothing
end

function streamDocument(http::HTTP.Streams.Stream)
    host, port = Sockets.getpeername(http)
    request::HTTP.Request = http.message
    request.body = read(http)
    closeread(http)

    println("HTTP request '$(request.target)' from $host:$port")

    # prevent a simple directory traversal
    if occursin("../", request.target) || occursin("..\\", request.target)
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end

    path = HT_DOCS * HTTP.unescapeuri(request.target)

    if request.target == "/"
        if LOCAL_VERSION
            path *= "index.html"
        else
            path *= "test.html"
        end
    end

    return streamFile(http, path)
end


function create_root_path(root_path)
    link = HT_DOCS * Base.Filesystem.path_separator * root_path

    if !isdir(link)
        target = "xwebql"
        println("making a symbolic link $link --> $target")

        try
            symlink(target, link)
        catch err
            println(err)
        end

    end
end

function remove_symlinks()
    # scan HT_DOCS for any symlinks and remove them

    foreach(readdir(HT_DOCS, join=true)) do f

        # is it a symbolic link ?
        if islink(f)
            # if so remove it
            try
                println("removing a symbolic link $f")
                rm(f)
            catch err
                println(err)
            end
        end

    end
end

function streamHeartBeat(http::HTTP.Streams.Stream)
    request::HTTP.Request = http.message
    request.body = read(http)
    closeread(http)

    timestamp = HTTP.URIs.splitpath(HTTP.unescapeuri(request.target))[3]
    HTTP.setstatus(http, 200)
    startwrite(http)
    write(http, timestamp)
    return nothing
end

function streamProgress(http::HTTP.Streams.Stream)
    global XOBJECTS, XLOCK

    request::HTTP.Request = http.message
    request.body = read(http)
    closeread(http)

    datasetid = HTTP.URIs.splitpath(HTTP.unescapeuri(request.target))[3]
    xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

    if xobject.id == ""
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end

    if has_error(xobject)
        HTTP.setstatus(http, 500)
        startwrite(http)
        write(http, "Internal Server Error")
        return nothing
    end

    update_timestamp(xobject)

    # get the progress tuple
    progress, elapsed = get_progress(xobject)

    # form a JSON response
    resp = IOBuffer()
    write(resp, "{\"progress\" : $progress, \"elapsed\" : $elapsed}")

    HTTP.setstatus(http, 200)
    HTTP.setheader(http, "Content-Type" => "application/json")
    startwrite(http)
    write(http, take!(resp))
    return nothing
end

function streamXEvents(http::HTTP.Streams.Stream)
    global XOBJECTS, XLOCK

    request::HTTP.Request = http.message

    # extract Accept-Encoding header
    accept_encoding = HTTP.header(http, "Accept-Encoding")

    request.body = read(http)
    closeread(http)

    root_path = HTTP.URIs.splitpath(request.target)[1]

    params = HTTP.queryparams(HTTP.URI(request.target))

    println("root path: \"$root_path\"")
    # println(params)

    create_root_path(root_path)

    dir = ""
    dataset = ""
    ext = ""
    mission = ""
    uri = ""

    try
        ext = params["ext"]
    catch _
    end

    try
        dir = params["dir"]
    catch _
    end

    try
        uri = params["url"]
    catch _
    end

    if LOCAL_VERSION
        pattern = "filename"
    else
        pattern = "dataset"
    end

    try
        dataset = params[pattern]
    catch _
    end

    try
        mission = params["mission"]
    catch _
    end

    println("uri: \"$uri\"")
    println("dir: \"$dir\"")
    println("mission: \"$mission\"")
    println("dataset: \"$dataset\"")
    println("ext: \"$ext\"")

    data_has_events = false

    if !dataset_exists(dataset, XOBJECTS, XLOCK)
        if uri == ""
            if dir != ""
                uri = "file://" * dir * "/" * dataset

                if ext != ""
                    uri *= "." * ext
                end
            else
                uri = "file://" * XHOME

                if mission != ""
                    # convert mission to uppercase
                    uri *= "/" * uppercase(mission)
                end

                uri *= "/" * dataset
            end
        else
            # extract the dataset name from the URI, take the string after the last slash
            dataset = String(split(uri, "/")[end])
        end

        # create a new dataset
        xdataset = XDataSet(dataset, uri)
        finalizer(finale, xdataset)

        # insert the dataset into the global list
        insert_dataset(xdataset, XOBJECTS, XLOCK)

        # start a new event processing thread
        Threads.@spawn load_events(xdataset, uri)
    else
        # update_timestamp and data_has_events
        xdataset = get_dataset(dataset, XOBJECTS, XLOCK)
        update_timestamp(xdataset)
        data_has_events = has_events(xdataset)
    end

    println("data_has_events: $data_has_events")

    html = IOBuffer()

    write(html, "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n")
    write(
        html,
        "<link href=\"https://fonts.googleapis.com/css?family=Inconsolata\" rel=\"stylesheet\"/>\n",
    )
    write(
        html,
        "<link href=\"https://fonts.googleapis.com/css?family=Material+Icons\" rel=\"stylesheet\"/>\n",
    )
    write(html, "<script src=\"https://cdn.jsdelivr.net/npm/d3@7\"></script>\n")
    write(
        html,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/reconnecting-websocket.min.js\"></script>\n",
    )
    write(
        html,
        "<script src=\"//cdnjs.cloudflare.com/ajax/libs/numeral.js/2.0.6/numeral.min.js\"></script>\n",
    )
    write(
        html,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/ra_dec_conversion.min.js\"></script>\n",
    )
    write(
        html,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/sylvester.min.js\"></script>\n",
    )
    write(
        html,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/shortcut.min.js\"></script>\n",
    )
    write(
        html,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/lz4.min.js\"></script>\n",
    )
    write(
        html,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/marchingsquares-isocontours.min.js\" defer></script>\n",
    )
    write(
        html,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/marchingsquares-isobands.min.js\" defer></script>\n",
    )

    # Font Awesome
    write(
        html,
        "<script src=\"https://kit.fontawesome.com/8433b7dde2.js?ver=5.15.4\" crossorigin=\"anonymous\"></script>\n",
    )

    # Bzip2 decoder
    if LOCAL_VERSION
        write(html, "<script src=\"bzip2.js\"></script>\n")
    else
        write(html, "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/XWEBQL@$VERSION_MAJOR.$VERSION_MINOR.$VERSION_SUB/htdocs/xwebql/bzip2.min.js\"></script>\n")
    end

    # scrollIntoView with ZenScroll (the original one does not work in Safari)
    write(html, "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/zenscroll-min.js\" defer></script>\n")
    # write(html, "<script type=\"module\" src=\"zenscroll5.js\"></script>\n")

    # Bootstrap viewport
    write(
        html,
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no, minimum-scale=1, maximum-scale=1\">\n",
    )

    # Bootstrap v3.4.1
    write(
        html,
        "<link rel=\"stylesheet\" href=\"https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css\" integrity=\"sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu\" crossorigin=\"anonymous\">",
    )
    write(
        html,
        "<script src=\"https://code.jquery.com/jquery-1.12.4.min.js\" integrity=\"sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ\" crossorigin=\"anonymous\"></script>",
    )
    write(
        html,
        "<script src=\"https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js\" integrity=\"sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd\" crossorigin=\"anonymous\"></script>",
    )

    # GLSL vertex shader
    write(html, "<script id=\"vertex-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/vertex-shader.vert"))
    write(html, "</script>\n")

    write(html, "<script id=\"legend-vertex-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/legend-vertex-shader.vert"))
    write(html, "</script>\n")

    # GLSL fragment shaders
    write(html, "<script id=\"common-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/common-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"legend-common-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/legend-common-shader.frag"))
    write(html, "</script>\n")

    # tone mapping (only one for the time being)
    write(html, "<script id=\"log-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/log-shader.frag"))
    write(html, "</script>\n")

    # colourmaps
    write(html, "<script id=\"greyscale-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/greyscale-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"negative-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/negative-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"amber-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/amber-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"red-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/red-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"green-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/green-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"blue-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/blue-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"hot-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/hot-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"rainbow-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/rainbow-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"parula-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/parula-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"inferno-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/inferno-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"magma-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/magma-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"plasma-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/plasma-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"viridis-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/viridis-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"cubehelix-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/cubehelix-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"jet-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/jet-shader.frag"))
    write(html, "</script>\n")

    write(html, "<script id=\"haxby-shader\" type=\"x-shader/x-vertex\">\n")
    write(html, read(HT_DOCS * "/xwebql/haxby-shader.frag"))
    write(html, "</script>\n")

    # XWebQL main JavaScript + CSS
    if LOCAL_VERSION
        write(html, "<script src=\"xwebql.js\"></script>\n")
        write(html, "<link rel=\"stylesheet\" href=\"xwebql.css\"/>\n")
    else
        write(html, "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/XWEBQL@$VERSION_MAJOR.$VERSION_MINOR.$VERSION_SUB/htdocs/xwebql/xwebql.min.js\"></script>\n")
        write(html, "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/gh/jvo203/XWEBQL@$VERSION_MAJOR.$VERSION_MINOR.$VERSION_SUB/htdocs/xwebql/xwebql.min.css\"/>\n")
    end

    # Asynchronous WebAssembly
    if LOCAL_VERSION
        write(html, "<script async type=\"text/javascript\" src=\"client.$WASM_VERSION.js\"></script>\n")
    else
        write(html, "<script async type=\"text/javascript\" src=\"https://cdn.jsdelivr.net/gh/jvo203/XWEBQL@$VERSION_MAJOR.$VERSION_MINOR.$VERSION_SUB/htdocs/xwebql/client.$WASM_VERSION.min.js\"></script>\n")
    end

    # HTML content    
    write(html, "<title>XWEBQL</title></head><body>\n")
    write(html, "<div id='htmlData' style='width: 0; height: 0;' ")
    write(html, "data-datasetId='$dataset' ")
    write(html, "data-root-path='/$root_path/' ")

    if !LOCAL_VERSION
        write(html, "data-root-path='/$root_path/' ")
    else
        write(html, "data-root-path='/' ")
    end

    write(
        html,
        " data-server-version='",
        VERSION_STRING,
        "' data-server-string='",
        SERVER_STRING,
    )

    write(html, "' data-version-major='$VERSION_MAJOR")
    write(html, "' data-version-minor='$VERSION_MINOR")
    write(html, "' data-version-sub='$VERSION_SUB")

    if LOCAL_VERSION
        write(html, "' data-server-mode='LOCAL")
    else
        write(html, "' data-server-mode='SERVER")
    end

    has_events_str = data_has_events ? "1" : "0"
    write(html, "' data-has-events='$has_events_str'></div>\n")
    write(html, "<script>var WS_PORT = $WS_PORT;</script>\n")

    # the page entry point
    write(
        html,
        "<script>",
        "const golden_ratio = 1.6180339887;",
        "var XWS = null ;",
        "var wsVideo = null ;",
        "var wsConn = null;",
        "var firstTime = true;",
        "var has_image = false;",
        "var ROOT_PATH = '/xwebql/';",
        "var idleSearch = -1;",
        "var idleResize = -1;",
        "var idleWindow = -1;",
        "var WASM = null;",
        "window.onresize = resizeMe;",
        "window.onbeforeunload = close_websocket_connection;",
        "mainRenderer(); </script>\n",
    )

    write(html, "</body></html>")

    HTTP.setstatus(http, 200)

    # compression support
    if occursin("zstd", accept_encoding)
        # check if accept_encoding contains zstd
        HTTP.setheader(http, "Content-Encoding" => "zstd")
        startwrite(http)
        write(http, transcode(ZstdCompressor, take!(html)))
    elseif occursin("gzip", accept_encoding)
        # check if accept_encoding contains gzip
        HTTP.setheader(http, "Content-Encoding" => "gzip")
        startwrite(http)
        write(http, transcode(GzipCompressor, take!(html)))
    elseif occursin("deflate", accept_encoding)
        # check if accept_encoding contains deflate
        HTTP.setheader(http, "Content-Encoding" => "deflate")
        startwrite(http)
        write(http, transcode(DeflateCompressor, take!(html)))
    else
        # no compression
        startwrite(http)
        write(http, take!(html))
    end

    return nothing
end

function streamSpectralLines(http::HTTP.Streams.Stream)
    global atom_db, XOBJECTS, XLOCK

    request::HTTP.Request = http.message
    request.body = read(http)
    closeread(http)

    params = HTTP.queryparams(HTTP.URI(request.target))
    # println(params)    

    datasetid = ""
    ene_start::Float32 = 0.0
    ene_end::Float32 = 0.0

    try
        datasetid = params["datasetId"]
        ene_start = parse(Float32, params["ene_start"])
        ene_end = parse(Float32, params["ene_end"])
    catch e
        println(e)
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end

    if ene_start == 0.0 || ene_end == 0.0
        # get the energy range from the dataset

        xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

        if xobject.id == ""
            HTTP.setstatus(http, 404)
            startwrite(http)
            write(http, "Not Found")
            return nothing
        end

        if has_error(xobject)
            HTTP.setstatus(http, 500)
            startwrite(http)
            write(http, "Internal Server Error")
            return nothing
        end

        if !has_events(xobject)
            HTTP.setstatus(http, 202)
            startwrite(http)
            write(http, "Accepted")
            return nothing
        end

        try
            ene_start, ene_end = get_energy_range(xobject)
        catch e
            println("streamSpectralLines::$e")

            HTTP.setstatus(http, 404)
            startwrite(http)
            write(http, "Not Found")
            return nothing
        end
    end

    println("get_atomdb::$datasetid; [$ene_start, $ene_end] [keV]")

    # fetch the molecules from AtomDB
    strSQL = "SELECT * FROM lines WHERE energy>=$ene_start AND energy<=$ene_end;"

    has_lines = false
    resp = IOBuffer()
    write(resp, "{\"lines\" : [")

    try
        for row in SQLite.DBInterface.execute(atom_db, strSQL)
            has_lines = true
            json = JSON.json(row)
            write(resp, json, ",")
        end
    catch e
        println("streamSpectralLines::$e")

        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end

    json = String(take!(resp))

    if !has_lines
        json = "{\"lines\" : []}"
    else
        # remove the last character (comma) from json, end an array
        json = chop(json, tail=1) * "]}"
    end

    # compress with bzip2 (more efficient than LZ4HC)
    compressed = transcode(Bzip2Compressor, json)
    println(
        "SPECTRAL LINES JSON length: $(length(json)); bzip2-compressed: $(length(compressed))",
    )

    # cache a response
    HTTP.setheader(http, "Cache-Control" => "public, max-age=86400")

    # sending binary data
    HTTP.setheader(http, "Content-Type" => "application/octet-stream")

    HTTP.setstatus(http, 200)
    startwrite(http)
    write(http, compressed)

    return nothing
end

function streamImageSpectrum(http::HTTP.Streams.Stream)
    global XOBJECTS, XLOCK

    request::HTTP.Request = http.message
    request.body = read(http)
    closeread(http)

    params = HTTP.queryparams(HTTP.URI(request.target))
    # println(params)    

    datasetid = ""
    quality::Quality = medium
    width::Integer = 0
    height::Integer = 0
    fetch_data::Bool = false

    try
        datasetid = params["datasetId"]
        width = round(Integer, parse(Float64, params["width"]))
        height = round(Integer, parse(Float64, params["height"]))
    catch e
        println(e)
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end

    try
        quality = eval(Meta.parse(params["quality"]))
    catch _
    end

    try
        fetch_data = parse(Bool, params["fetch_data"])
    catch _
    end

    HTTP.setheader(http, "Cache-Control" => "no-cache")
    HTTP.setheader(http, "Cache-Control" => "no-store")
    HTTP.setheader(http, "Pragma" => "no-cache")
    HTTP.setheader(http, "Content-Type" => "application/octet-stream")

    xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

    if xobject.id == "" || width <= 0 || height <= 0
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end

    if has_error(xobject)
        HTTP.setstatus(http, 500)
        startwrite(http)
        write(http, "Internal Server Error")
        return nothing
    end

    if !has_events(xobject)
        HTTP.setstatus(http, 202)
        startwrite(http)
        write(http, "Accepted")
        return nothing
    end

    @time (pixels, mask, spectrum, header, json, min_count, max_count) = getImageSpectrum(xobject, width, height)

    try
        HTTP.setstatus(http, 200)
        startwrite(http)

        flux = "LOG"

        # pad flux with spaces so that the length is a multiple of 4
        # this is needed for an array alignment in JavaScript
        len = 4 * (length(flux) ÷ 4 + 1)
        flux = lpad(flux, len, " ")

        write(http, UInt32(length(flux)))
        write(http, flux)

        write(http, UInt64(min_count))
        write(http, UInt64(max_count))

        # next the image
        img_width = size(pixels, 1)
        img_height = size(pixels, 2)

        write(http, Int32(img_width))
        write(http, Int32(img_height))

        # compress pixels with ZFP
        prec = ZFP_MEDIUM_PRECISION

        if quality == high
            prec = ZFP_HIGH_PRECISION
        elseif quality == medium
            prec = ZFP_MEDIUM_PRECISION
        elseif quality == low
            prec = ZFP_LOW_PRECISION
        end

        println("typeof(pixels) = ", typeof(pixels))
        compressed_pixels = zfp_compress(pixels, precision=prec)
        write(http, Int32(length(compressed_pixels)))
        write(http, compressed_pixels)

        println("typeof(mask) = ", typeof(mask))
        compressed_mask = lz4_hc_compress(collect(flatten(UInt8.(mask))))
        write(http, Int32(length(compressed_mask)))
        write(http, compressed_mask)

        if fetch_data
            # JSON
            json_len = length(json)
            compressed_json = lz4_hc_compress(Vector{UInt8}(json))
            compressed_len = length(compressed_json)

            write(http, Int32(json_len))
            write(http, Int32(compressed_len))
            write(http, compressed_json)

            # FITS HEADER            
            header_len = length(header)
            compressed_header = lz4_hc_compress(Vector{UInt8}(header))
            compressed_len = length(compressed_header)

            write(http, Int32(header_len))
            write(http, Int32(compressed_len))
            write(http, compressed_header)

            # spectrum
            println("typeof(spectrum) = ", typeof(spectrum))
            compressed_spectrum = zfp_compress(
                spectrum,
                precision=SPECTRUM_HIGH_PRECISION,
            )

            write(http, Int32(length(spectrum)))
            write(http, Int32(length(compressed_spectrum)))
            write(http, compressed_spectrum)
        end

        return nothing
    catch e
        println(e)
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end
end

const XROUTER = HTTP.Router()
HTTP.register!(XROUTER, "GET", "/", streamDocument)
HTTP.register!(XROUTER, "GET", "/exit", gracefullyShutdown)
HTTP.register!(XROUTER, "GET", "/get_directory", streamDirectory)
HTTP.register!(XROUTER, "GET", "/*/events.html", streamXEvents)
HTTP.register!(XROUTER, "POST", "/*/heartbeat/*", streamHeartBeat)
HTTP.register!(XROUTER, "POST", "/*/progress/*", streamProgress)
HTTP.register!(XROUTER, "GET", "*/*", streamDocument)
HTTP.register!(XROUTER, "GET", "*", streamDocument)
HTTP.register!(XROUTER, "GET", "/*/image_spectrum/", streamImageSpectrum)
HTTP.register!(XROUTER, "GET", "/*/get_atomdb/", streamSpectralLines)

try
    global CONFIG_FILE = parsed_args["config"]
catch _
    println("A config file not supplied. Will try a default config.ini .")
end

# read the config file (if available)
try
    conf = ConfParse(CONFIG_FILE)
    parse_conf!(conf)

    # [xwebql]

    try
        global HTTP_PORT = parse(Int64, retrieve(conf, "xwebql", "port"))
        global WS_PORT = HTTP_PORT + 1
    catch _
        # cannot find the port, try the command-line arguments
        try
            global HTTP_PORT = parsed_args["port"]
            global WS_PORT = HTTP_PORT + 1
        catch _
        end
    end

    try
        global LOCAL_VERSION = parse(Bool, retrieve(conf, "xwebql", "local"))
    catch _
    end

    try
        global TIMEOUT = parse(Int64, retrieve(conf, "xwebql", "timeout"))
    catch _
    end

    try
        global XHOME = retrieve(conf, "xwebql", "home")
    catch _
    end

    try
        global LOGS = retrieve(conf, "xwebql", "logs")
    catch _
    end

    try
        global XCACHE = retrieve(conf, "xwebql", "cache")
    catch _
    end
catch e
    println("Cannot parse the config file $CONFIG_FILE: $e")
end

# open an Atom DB connection
const atom_db = SQLite.DB("atom.db")

println("$SERVER_STRING")
println("DATASET TIMEOUT: $(TIMEOUT)s")
println("Point your browser to http://localhost:$HTTP_PORT")
println(
    "Press CTRL+C or send SIGINT to exit. Alternatively point your browser to http://localhost:$HTTP_PORT/exit",
)

# Sockets.localhost or Sockets.IPv4(0)
host = Sockets.IPv4(0)

function ws_coroutine(ws, ids)
    global XOBJECTS, XLOCK

    local inner_width, inner_height, offsetx, offsety
    local scale::Float32, fps::Integer, bitrate::Integer
    local last_video_seq::Integer, last_frame::Float64
    local image_width::Integer, image_height::Integer, bDownsize::Bool

    #local annexb

    # user session    
    x = nothing
    y = nothing
    energy = nothing

    # HEVC
    local param, encoder, picture, luma, alpha
    local filter::KalmanFilter, ts

    local video_mtx = ReentrantLock()

    param = C_NULL
    encoder = C_NULL
    picture = C_NULL

    datasetid = String(ids[1])

    begin
        xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

        if xobject.id == "" || has_error(xobject)
            @error "$datasetid not found, closing a websocket coroutine."
            writeguarded(ws, "[close]")
            return
        end
    end

    @info "Started a websocket coroutine for $datasetid" ws

    # speed-up the underlying TCP socket
    Sockets.nagle(ws.socket, false)
    Sockets.quickack(ws.socket, true)

    # an outgoing queue for messages to be sent
    outgoing = RemoteChannel(() -> Channel{Any}(32))
    sent_task = @async while true
        try
            msg = take!(outgoing)

            if typeof(msg) == IOBuffer
                msg = take!(msg)
            end

            if !writeguarded(ws, msg)
                break
            end
        catch e
            if isa(e, InvalidStateException) && e.state == :closed
                println("sent task completed")
                break
            else
                println(e)
            end
        end
    end

    viewport_requests = Channel{Dict{String,Any}}(32)

    realtime = @async while true
        try
            req = take!(viewport_requests)
            #println(data   setid, "::", req)

            xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

            if xobject.id == "" || has_error(xobject)
                error("$datasetid not found.")
            end

            if !has_events(xobject)
                error("$datasetid: no events found.")
            end

            # check if x, y, energy are nothing
            if x === nothing || y === nothing || energy === nothing
                x = xobject.x
                y = xobject.y
                energy = xobject.energy
            end

            elapsed =
                @elapsed viewport, spectrum = getViewportSpectrum(x, y, energy, req, getNumChannels(xobject.header))
            elapsed *= 1000.0 # [ms]

            println("[getViewportSpectrum] elapsed: $elapsed [ms]")

            Threads.@spawn begin
                if viewport != Nothing
                    # send a viewport                    
                    resp = IOBuffer()

                    # the header
                    write(resp, Float32(req["timestamp"]))
                    write(resp, Int32(req["seq_id"]))
                    write(resp, Int32(1)) # 0 - spectrum, 1 - viewport
                    write(resp, Float32(elapsed))

                    # the body
                    write(resp, take!(viewport))

                    put!(outgoing, resp)
                end

                if spectrum != Nothing
                    # send a spectrum
                    resp = IOBuffer()

                    # the header
                    write(resp, Float32(req["timestamp"]))
                    write(resp, Int32(req["seq_id"]))
                    write(resp, Int32(0)) # 0 - spectrum, 1 - viewport
                    write(resp, Float32(elapsed))

                    # the body
                    write(resp, take!(spectrum))

                    put!(outgoing, resp)
                end
            end

            update_timestamp(xobject)
        catch e
            if isa(e, InvalidStateException) && e.state == :closed
                println("real-time viewport task completed")
                break
            else
                println(e)
            end
        end
    end

    video_requests = Channel{Dict{String,Any}}(32)

    video = @async while true
        try
            req = take!(video_requests)

            xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

            if xobject.id == "" || has_error(xobject)
                error("$datasetid not found.")
            end

            if !has_events(xobject)
                error("$datasetid: no data found.")
            end

            # check if x, y, energy are nothing
            if x === nothing || y === nothing || energy === nothing
                x = xobject.x
                y = xobject.y
                energy = xobject.energy
            end

            keyframe = req["key"]
            fill = UInt8(req["fill"])

            # obtain a cube channel
            frame_start = Float64(req["frame_start"])
            frame_end = Float64(req["frame_end"])

            # an override (debugging)
            #frame_start = Float64(8.763479640732266)
            #frame_end = Float64(8.799425640732265)

            frame = (frame_start + frame_end) / 2.0

            try
                # lock(video_mtx)

                deltat = Float64(Dates.value(now() - ts)) # [ms]
                ts = now()

                # Kalman Filter tracking/prediction
                update(filter, frame, deltat)
                frame2 = predict(filter, frame, deltat)

                println(
                    "deltat: $deltat [ms]; frame: $frame, predicted: $frame2, fill: $fill",
                )

                # use a predicted frame for non-keyframes
                if !keyframe
                    # disable Kalman Filter for now, deltat needs to be reduced
                    # frame = frame2
                end

                if !keyframe && (last_frame == frame)
                    println("skipping a repeat video frame")
                    continue
                else
                    last_frame = frame
                    println("video frame: $frame; keyframe: $keyframe")
                end

                # by this point the VideoToneMapping variable is valid                

                Threads.@spawn begin
                    # interpolate variable values into a thread
                    t_x = x
                    t_y = y
                    t_energy = energy
                    t_frame_start = $frame_start
                    t_frame_end = $frame_end
                    t_inner_width = $inner_width
                    t_inner_height = $inner_height
                    t_offsetx = $offsetx
                    t_offsety = $offsety
                    t_image_width = $image_width
                    t_image_height = $image_height
                    t_bDownsize = $bDownsize
                    t_keyframe = $keyframe
                    t_fill = $fill

                    try
                        # get a video frame                        
                        elapsed = @elapsed luma, alpha = getVideoFrame(
                            x,
                            y,
                            energy,
                            t_frame_start,
                            t_frame_end,
                            t_inner_width,
                            t_inner_height,
                            t_offsetx,
                            t_offsety,
                            t_image_width,
                            t_image_height,
                            t_bDownsize,
                            t_keyframe,
                            t_fill,
                        )
                        elapsed *= 1000.0 # [ms]

                        println(
                            typeof(luma),
                            ";",
                            typeof(alpha),
                            ";",
                            size(luma),
                            ";",
                            size(alpha),
                            "; bDownsize:",
                            bDownsize,
                            "; elapsed: $elapsed [ms]",
                        )

                        lock(video_mtx)

                        if picture != C_NULL
                            # update the x265_picture structure                
                            picture_jl = x265_picture(picture)
                            picture_jl.bitDepth = 8

                            picture_jl.planeR = pointer(luma)
                            picture_jl.strideR = strides(luma)[2]

                            picture_jl.planeG = pointer(alpha)
                            picture_jl.strideG = strides(alpha)[2]

                            picture_jl.planeB = pointer(alpha)
                            picture_jl.strideB = strides(alpha)[2]

                            # sync the Julia structure back to C
                            unsafe_store!(Ptr{x265_picture}(picture), picture_jl)

                            if encoder != C_NULL
                                # HEVC-encode the luminance and alpha channels
                                iNal = Ref{Cint}(0)
                                pNals = Ref{Ptr{Cvoid}}(C_NULL)

                                # version v4.0.0 broke the API
                                # version 4.1.0 restored the original API
                                # int x265_encoder_encode(x265_encoder* encoder, x265_nal** pp_nal, uint32_t* pi_nal, x265_picture* pic_in, x265_picture* pic_out);

                                encoding = @elapsed stat = ccall(
                                    (:x265_encoder_encode, libx265),
                                    Cint,
                                    (
                                        Ptr{Cvoid},
                                        Ref{Ptr{Cvoid}},
                                        Ref{Cint},
                                        Ptr{x265_picture},
                                        Ptr{x265_picture},
                                    ),
                                    encoder,
                                    pNals,
                                    iNal,
                                    picture,
                                    C_NULL,
                                )
                                encoding *= 1000.0 # [ms]

                                println(
                                    "x265_encoder_encode::stat = $stat, iNal = ",
                                    iNal[],
                                    ", pNals($pNals): ",
                                    pNals[],
                                    "; elapsed: $encoding [ms]",
                                )

                                for idx = 1:iNal[]
                                    nal = x265_nal(pNals[], idx)
                                    # println("NAL #$idx: $nal")

                                    resp = IOBuffer()

                                    # the header
                                    write(resp, Float32(req["timestamp"]))
                                    write(resp, Int32(req["seq_id"]))
                                    write(resp, Int32(2)) # 2 - video frame
                                    write(resp, Float32(elapsed + encoding))

                                    # the body
                                    payload = Vector{UInt8}(undef, nal.sizeBytes)
                                    unsafe_copyto!(
                                        pointer(payload),
                                        nal.payload,
                                        nal.sizeBytes,
                                    )
                                    write(resp, payload)

                                    put!(outgoing, resp)

                                    # append the NAL unit to the Annex-B file
                                    #write(annexb, payload)
                                end
                            end
                        end

                    catch e
                        println("Inner error: ", e)
                    finally
                        if islocked(video_mtx)
                            unlock(video_mtx)
                        end
                    end
                end
            catch e
                println("Outer error: ", e)
            end

            update_timestamp(xobject)
        catch e
            if isa(e, InvalidStateException) && e.state == :closed
                println("real-time video task completed")
                break
            else
                println(e)
            end
        end
    end

    while isopen(ws)
        data, = readguarded(ws)
        s = String(data)

        if s == ""
            break
        end

        # ping back heartbeat messages
        if occursin("[heartbeat]", s)
            # @info "[ws] heartbeat"

            xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

            if xobject.id == "" || has_error(xobject)
                @error "$datasetid not found, closing a websocket coroutine."
                writeguarded(ws, "[close]")
                break
            end

            if has_error(xobject)
                @error "$datasetid: an error detected, closing a websocket coroutine."
                writeguarded(ws, "[close]")
                break
            end

            update_timestamp(xobject)

            try
                put!(outgoing, s)
            catch e
                println(e)
            finally
                continue
            end
        end

        #@info "Received: $s"

        # convert the message into JSON
        try
            msg = JSON.parse(s)
            @info msg

            if msg["type"] == "realtime_image_spectrum"
                # replace!(viewport_requests, msg)
                push!(viewport_requests, msg) # there is too much lag
                continue
            end

            if msg["type"] == "image"
                xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

                if xobject.id == "" || has_error(xobject)
                    error("$datasetid not found.")
                end

                if !has_events(xobject)
                    error("$datasetid: no events found.")
                end

                # check if x, y, energy are nothing
                if x === nothing || y === nothing || energy === nothing
                    x = xobject.x
                    y = xobject.y
                    energy = xobject.energy
                end

                # turn a msg into a rectangular ViewportSpectrum request
                req = msg
                req["image"] = true
                req["beam"] = "square"

                # set x1, x2, y1, y2 to the full FITS image; HINT: use "init_video" inner_width, inner_height, offsetx, offsety
                req["x1"] = offsetx
                req["x2"] = offsetx + inner_width - 1
                req["y1"] = offsety
                req["y2"] = offsety + inner_height - 1

                elapsed =
                    @elapsed image, spectrum = getViewportSpectrum(x, y, energy, req, getNumChannels(xobject.header))
                elapsed *= 1000.0 # [ms]

                println("[getViewportSpectrum] elapsed: $elapsed [ms]")

                Threads.@spawn begin
                    if image != Nothing
                        # send an image 
                        resp = IOBuffer()

                        # the header
                        write(resp, Float32(req["timestamp"]))
                        write(resp, Int32(0))
                        write(resp, Int32(3)) # 3 - image refresh
                        write(resp, Float32(elapsed))

                        # the body
                        write(resp, take!(image))

                        put!(outgoing, resp)
                    end

                    if spectrum != Nothing
                        # send a spectrum
                        resp = IOBuffer()

                        # the header
                        write(resp, Float32(req["timestamp"]))
                        write(resp, Int32(0))
                        write(resp, Int32(4)) # 4 - full spectrum refresh
                        write(resp, Float32(elapsed))

                        # the body
                        write(resp, take!(spectrum))

                        put!(outgoing, resp)
                    end
                end

                update_timestamp(xobject)

                continue
            end

            # init_video
            if msg["type"] == "init_video"
                width = round(Integer, msg["width"])
                height = round(Integer, msg["height"])
                inner_width = round(Integer, msg["inner_width"])
                inner_height = round(Integer, msg["inner_height"])
                offsetx = 1 + round(Integer, msg["offsetx"])
                offsety = 1 + round(Integer, msg["offsety"])
                last_video_seq = msg["seq_id"]
                last_frame = -1.0
                bitrate = msg["bitrate"]
                fps = round(Integer, msg["fps"])

                xobject = get_dataset(datasetid, XOBJECTS, XLOCK)

                if xobject.id == "" || has_error(xobject)
                    error("$datasetid not found.")
                end

                if !has_events(xobject)
                    error("$datasetid: no data found.")
                end

                # obtain an initial cube channel
                frame_start = Float64(msg["frame_start"])
                frame_end = Float64(msg["frame_end"])
                frame = (frame_start + frame_end) / 2.0

                try
                    scale = get_image_scale(width, height, inner_width, inner_height)
                catch e
                    println(e)
                    scale = 1.0
                end

                if scale < 1.0
                    image_width = round(Integer, scale * inner_width)
                    image_height = round(Integer, scale * inner_height)
                    bDownsize = true
                else
                    image_width = inner_width
                    image_height = inner_height
                    bDownsize = false
                end

                println(
                    "scale = $scale, image: $image_width x $image_height, bDownsize: $bDownsize",
                )

                dict = Dict(
                    "type" => "init_video",
                    "width" => image_width,
                    "height" => image_height,
                    "padded_width" => image_width,
                    "padded_height" => image_height,
                )

                resp = JSON.json(dict)

                put!(outgoing, resp)

                # open a binary file for the Annex-B format, the filename containing image_width and image_height
                #uuid = UUIDs.uuid4()
                #fname = "/tmp/video-$uuid-$image_width-$image_height.h265"
                #annexb = open(fname, "w")

                begin
                    try
                        lock(video_mtx)

                        # initialize the Kalman Filter
                        filter = KalmanFilter(frame, true)
                        ts = now()

                        # upon success init the HEVC encoder
                        param = ccall((:x265_param_alloc, libx265), Ptr{Cvoid}, ())

                        if param == C_NULL
                            @error "NULL x265_param"
                            continue
                        end

                        # set default parameters
                        ccall(
                            (:x265_param_default_preset, libx265),
                            Cvoid,
                            (Ptr{Cvoid}, Cstring, Cstring),
                            param,
                            "superfast",
                            "zerolatency",
                        )

                        # extra parameters

                        # FPS
                        stat = ccall(
                            (:x265_param_parse, libx265),
                            Cint,
                            (Ptr{Cvoid}, Cstring, Cstring),
                            param,
                            "fps",
                            #string(fps),
                            "30",
                        )

                        if stat != 0
                            @error "Cannot set FPS"
                        end

                        # bRepeatHeaders = 1
                        stat = ccall(
                            (:x265_param_parse, libx265),
                            Cint,
                            (Ptr{Cvoid}, Cstring, Ptr{Cvoid}),
                            param,
                            "repeat-headers",
                            C_NULL,
                        )

                        if stat != 0
                            @error "Cannot set repeat-headers"
                        end

                        # internalCsp = X265_CSP_I444
                        stat = ccall(
                            (:x265_param_parse, libx265),
                            Cint,
                            (Ptr{Cvoid}, Cstring, Cstring),
                            param,
                            "input-csp",
                            "i444",
                        )

                        if stat != 0
                            @error "Cannot set input-csp"
                        end

                        # set video resolution
                        res = string(image_width) * "x" * string(image_height)
                        stat = ccall(
                            (:x265_param_parse, libx265),
                            Cint,
                            (Ptr{Cvoid}, Cstring, Cstring),
                            param,
                            "input-res",
                            res,
                        )

                        if stat != 0
                            @error "Cannot set input-res"
                        end

                        # set constant quality rate
                        crf = Integer(28)
                        stat = ccall(
                            (:x265_param_parse, libx265),
                            Cint,
                            (Ptr{Cvoid}, Cstring, Cstring),
                            param,
                            "crf",
                            string(crf),
                        )

                        if stat != 0
                            @error "Cannot set CRF"
                        end

                        # x265 encoder
                        encoder =
                            ccall((encoder_open, libx265), Ptr{Cvoid}, (Ptr{Cvoid},), param)
                        println("typeof(encoder): ", typeof(encoder), "; value: $encoder")

                        if encoder == C_NULL
                            @error "NULL x265_encoder"
                            continue
                        end

                        # x265 picture
                        picture = ccall((:x265_picture_alloc, libx265), Ptr{Cvoid}, ())
                        println("typeof(picture): ", typeof(picture), "; value: $picture")

                        if picture == C_NULL
                            @error "NULL x265_picture"
                            continue
                        end

                        ccall(
                            (:x265_picture_init, libx265),
                            Cvoid,
                            (Ptr{Cvoid}, Ptr{Cvoid}),
                            param,
                            picture,
                        )
                    catch e
                        println(e)
                    finally
                        unlock(video_mtx)
                    end
                end

                continue
            end

            # end_video
            if msg["type"] == "end_video"
                # clean up x265
                try
                    lock(video_mtx)

                    if encoder ≠ C_NULL
                        # release the x265 encoder
                        ccall((:x265_encoder_close, libx265), Cvoid, (Ptr{Cvoid},), encoder)
                        encoder = C_NULL

                        @info "cleaned up the x265 encoder"
                    end

                    if picture ≠ C_NULL
                        # release the x265 picture structure
                        ccall((:x265_picture_free, libx265), Cvoid, (Ptr{Cvoid},), picture)
                        picture = C_NULL

                        @info "cleaned up the x265 picture"
                    end

                    if param ≠ C_NULL
                        # release the x265 parameters structure
                        ccall((:x265_param_free, libx265), Cvoid, (Ptr{Cvoid},), param)
                        param = C_NULL

                        @info "cleaned up x265 parameters"
                    end

                    #close(annexb)
                catch e
                    println(e)
                finally
                    unlock(video_mtx)
                end

                continue
            end

            # realtime streaming video frame requests
            if msg["type"] == "video"
                # replace!(video_requests, msg)
                push!(video_requests, msg)
                continue
            end
        catch e
            println("ws_coroutine::$e")
            # @error "ws_coroutine::" exception = (e, catch_backtrace())
        end

    end

    close(outgoing)
    wait(sent_task)

    close(viewport_requests)
    wait(realtime)

    close(video_requests)
    wait(video)

    # clean up x265
    if encoder ≠ C_NULL
        # release the x265 encoder
        ccall((:x265_encoder_close, libx265), Cvoid, (Ptr{Cvoid},), encoder)

        @info "cleaned up the x265 encoder"
    end

    if picture ≠ C_NULL
        # release the x265 picture structure
        ccall((:x265_picture_free, libx265), Cvoid, (Ptr{Cvoid},), picture)

        @info "cleaned up the x265 picture"
    end

    if param ≠ C_NULL
        # release the x265 parameters structure
        ccall((:x265_param_free, libx265), Cvoid, (Ptr{Cvoid},), param)

        @info "cleaned up x265 parameters"
    end

    @info "$datasetid will now close " ws

end

function ws_gatekeeper(req, ws)
    orig = WebSockets.origin(req)
    target = HTTP.unescapeuri(req.target)

    @info "\nOrigin: $orig   Target: $target   subprotocol: $(subprotocol(req))"

    # check if there is a '<sessionid>/<datasetid>' present in <target>
    pos = findlast("/", target)

    if !isnothing(pos)
        sessionid = SubString(target, pos[1] + 1)
        @info "\n[ws] sessionid $sessionid"

        target = SubString(target, 1, pos[1] - 1)
        pos = findlast("/", target)

        if !isnothing(pos)

            targets = SubString(target, pos[1] + 1)
            ids = split(targets, ";")

            @info "\n[ws] datasetid $(ids[1])"

            ws_coroutine(ws, ids)
        else
            @info "[ws] Missing datasetid"
        end
    else
        @info "[ws] Missing sessionid"
    end

end

ws_handle(req) = SERVER_STRING |> WebSockets.Response
const ws_server = WebSockets.ServerWS(ws_handle, ws_gatekeeper)

Threads.@spawn :interactive WebSockets.serve(ws_server, host, WS_PORT)

# a garbage collection loop (dataset timeout)
global gc_task = @async garbage_collector(XOBJECTS, XLOCK, TIMEOUT)

try
    HTTP.serve(XROUTER, host, UInt16(HTTP_PORT), stream=true)
catch e
    @warn(e)
    typeof(e) == InterruptException && rethrow(e)
finally
    exitFunc()
end