using ArgParse
using CodecLz4
using HTTP
using JSON
using Sockets
using WebSockets
using ZfpCompression

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

const VERSION_MAJOR = 1
const VERSION_MINOR = 0
const VERSION_SUB = 0
const SERVER_STRING =
    "XWEBQL v" *
    string(VERSION_MAJOR) *
    "." *
    string(VERSION_MINOR) *
    "." *
    string(VERSION_SUB)

const WASM_VERSION = "23.06.XX.X"
const VERSION_STRING = "J/SV2023-06-XX.X-ALPHA"

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
                    if (endswith(filename, "_cl.evt") || endswith(filename, "_cl.evt.gz")) && contains(filename, "sxs")

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
        #println("WebSocket Server .out channel: ", string(take!(ws_server.out)))
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
    request::HTTP.Request = http.message
    request.body = read(http)
    closeread(http)

    @show request.target

    # prevent a simple directory traversal
    if occursin("../", request.target) || occursin("..\\", request.target)
        HTTP.setstatus(http, 404)
        startwrite(http)
        write(http, "Not Found")
        return nothing
    end

    path = HT_DOCS * HTTP.unescapeuri(request.target)

    if request.target == "/"
        path *= "index.html"
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

function streamXEvents(http::HTTP.Streams.Stream)
    global XOBJECTS, XLOCK

    request::HTTP.Request = http.message
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

    try
        ext = params["ext"]
    catch _
    end

    try
        dir = params["dir"]
    catch _
    end

    try
        dataset = params["filename"]
    catch _
    end

    try
        dataset = params["uri"]
    catch _
    end

    println("dir: \"$dir\"")
    println("dataset: \"$dataset\"")
    println("ext: \"$ext\"")

    if !dataset_exists(dataset, XOBJECTS, XLOCK)
        local uri = ""

        if dir != ""
            uri = "file://" * dir * "/" * dataset

            if ext != ""
                uri *= "." * ext
            end
        else
            uri = dataset
        end

        # create a new dataset
        xdataset = XDataSet(dataset, uri)
        finalizer(finale, xdataset)

        # insert the dataset into the global list
        insert_dataset(xdataset, XOBJECTS, XLOCK)

        # start a new event processing thread
        Threads.@spawn load_events(xdataset, uri)
    else
        # update_timestamp
        xdataset = get_dataset(dataset, XOBJECTS, XLOCK)
        update_timestamp(xdataset)
    end

    HTTP.setstatus(http, 200)
    startwrite(http)

    write(http, "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n")
    write(
        http,
        "<link href=\"https://fonts.googleapis.com/css?family=Inconsolata\" rel=\"stylesheet\"/>\n",
    )
    write(
        http,
        "<link href=\"https://fonts.googleapis.com/css?family=Material+Icons\" rel=\"stylesheet\"/>\n",
    )
    write(http, "<script src=\"https://d3js.org/d3.v7.min.js\"></script>\n")
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/reconnecting-websocket.min.js\"></script>\n",
    )
    write(
        http,
        "<script src=\"//cdnjs.cloudflare.com/ajax/libs/numeral.js/2.0.6/numeral.min.js\"></script>\n",
    )
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/ra_dec_conversion.min.js\"></script>\n",
    )
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/sylvester.min.js\"></script>\n",
    )
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/shortcut.min.js\"></script>\n",
    )
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/colourmaps.min.js\"></script>\n",
    )
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/lz4.min.js\"></script>\n",
    )
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/marchingsquares-isocontours.min.js\" defer></script>\n",
    )
    write(
        http,
        "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/marchingsquares-isobands.min.js\" defer></script>\n",
    )

    # Font Awesome
    write(
        http,
        "<script src=\"https://kit.fontawesome.com/8433b7dde2.js\" crossorigin=\"anonymous\"></script>\n",
    )

    # HTML5 FileSaver
    write(http, "<script src=\"https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/FileSaver.js\"></script>\n")

    # WebAssembly
    write(http, "<script src=\"client.", WASM_VERSION, ".js\"></script>\n")
    write(
        http,
        "<script>\n",
        "Module.ready\n",
        "\t.then(status => console.log(status))\n",
        "\t.catch(e => console.error(e));\n",
        "</script>\n",
    )

    # Bootstrap viewport
    write(
        http,
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no, minimum-scale=1, maximum-scale=1\">\n",
    )

    # Bootstrap v3.4.1
    write(
        http,
        "<link rel=\"stylesheet\" href=\"https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css\" integrity=\"sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu\" crossorigin=\"anonymous\">",
    )
    write(
        http,
        "<script src=\"https://code.jquery.com/jquery-1.12.4.min.js\" integrity=\"sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ\" crossorigin=\"anonymous\"></script>",
    )
    write(
        http,
        "<script src=\"https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js\" integrity=\"sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd\" crossorigin=\"anonymous\"></script>",
    )

    # GLSL vertex shader
    write(http, "<script id=\"vertex-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/vertex-shader.vert"))
    write(http, "</script>\n")

    write(http, "<script id=\"legend-vertex-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/legend-vertex-shader.vert"))
    write(http, "</script>\n")

    # GLSL fragment shaders
    write(http, "<script id=\"common-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/common-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"legend-common-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/legend-common-shader.frag"))
    write(http, "</script>\n")

    # tone mappings    
    write(http, "<script id=\"legacy-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/legacy-shader.frag"))
    write(http, "</script>\n")

    # colourmaps
    write(http, "<script id=\"greyscale-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/greyscale-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"negative-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/negative-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"amber-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/amber-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"red-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/red-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"green-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/green-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"blue-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/blue-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"hot-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/hot-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"rainbow-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/rainbow-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"parula-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/parula-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"inferno-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/inferno-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"magma-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/magma-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"plasma-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/plasma-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"viridis-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/viridis-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"cubehelix-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/cubehelix-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"jet-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/jet-shader.frag"))
    write(http, "</script>\n")

    write(http, "<script id=\"haxby-shader\" type=\"x-shader/x-vertex\">\n")
    write(http, read(HT_DOCS * "/xwebql/haxby-shader.frag"))
    write(http, "</script>\n")

    # XWebQL main JavaScript + CSS
    write(http, "<script src=\"xwebql.js\"></script>\n")
    write(http, "<link rel=\"stylesheet\" href=\"xwebql.css\"/>\n")

    # HTML content    
    write(http, "<title>XWEBQL</title></head><body>\n")
    write(http, "<div id='htmlData' style='width: 0; height: 0;' ")
    write(http, "data-datasetId='$dataset' ")
    write(http, "data-root-path='/$root_path/' ")

    if !LOCAL_VERSION
        write(http, "data-root-path='/$root_path/' ")
    else
        write(http, "data-root-path='/' ")
    end

    write(
        http,
        " data-server-version='",
        VERSION_STRING,
        "' data-server-string='",
        SERVER_STRING,
    )

    if LOCAL_VERSION
        write(http, "' data-server-mode='LOCAL")
    else
        write(http, "' data-server-mode='SERVER")
    end

    write(http, "'></div>\n")

    write(http, "<script>var WS_PORT = $WS_PORT;</script>\n")

    # the page entry point
    write(
        http,
        "<script>",
        "const golden_ratio = 1.6180339887;",
        "var XWS = null ;",
        "var wsVideo = null ;",
        "var wsConn = null;",
        "var firstTime = true;",
        "var has_image = false;",
        "var ROOT_PATH = '/xwebql/';",
        "var idleResize = -1;",
        "var idleWindow = -1;",
        "window.onresize = resizeMe;",
        "window.onbeforeunload = close_websocket_connection;",
        "mainRenderer(); </script>\n",
    )

    write(http, "</body></html>")
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

        write(http, Int64(min_count))
        write(http, Int64(max_count))

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
HTTP.register!(XROUTER, "GET", "*/*", streamDocument)
HTTP.register!(XROUTER, "GET", "*", streamDocument)
HTTP.register!(XROUTER, "GET", "/*/image_spectrum/", streamImageSpectrum)

println("$SERVER_STRING")
println("DATASET TIMEOUT: $(TIMEOUT)s")
println("Point your browser to http://localhost:$HTTP_PORT")
println(
    "Press CTRL+C or send SIGINT to exit. Alternatively point your browser to http://localhost:$HTTP_PORT/exit",
)

# Sockets.localhost or Sockets.IPv4(0)
host = Sockets.IPv4(0)

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

            # ws_coroutine(ws, ids)
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
# global gc_task = @async garbage_collector(XOBJECTS, XLOCK, TIMEOUT)

try
    HTTP.serve(XROUTER, host, UInt16(HTTP_PORT), stream=true)
catch e
    @warn(e)
    typeof(e) == InterruptException && rethrow(e)
finally
    exitFunc()
end