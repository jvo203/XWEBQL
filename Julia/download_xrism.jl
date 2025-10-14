using CSV
using DataFrames
using Downloads
using Cascadia, Gumbo, HTTP
using ThreadsX

# no longer in use
#=
using JSON
using Images
using Plots

include("xevent.jl")

function to_pdf(edges, heights; lb = minimum(heights) / 3)
    X = Float32[]
    Y = Float32[]
    push!(X, edges[begin])
    push!(Y, lb)
    for i in eachindex(heights)
        push!(X, edges[i])
        push!(X, edges[i+1])
        push!(Y, heights[i])
        push!(Y, heights[i])
    end
    push!(X, edges[end])
    push!(Y, lb)
    return X, Y
end
=#

const pub = "https://data.darts.isas.jaxa.jp/pub/xrism/browse/public_list/?k=time&o=asc&c=ALL&q="
const root = "https://data.darts.isas.jaxa.jp/pub/xrism/data/obs/rev3/"
const SERVER_STRING = "download_xrism.jl"

function get_table(pub)
    req = HTTP.get(pub)
    html = parsehtml(String(req.body))
    println(html)

    # get the table element (id = obs-list)
    table = eachmatch(sel"#obs-list", html.root)
    println(table)
end

function get_root(root::String)
    # download the HTML, parse the table    
    req = HTTP.get(root)
    html = parsehtml(String(req.body))

    # get all href elements
    hrefs = eachmatch(sel"a", html.root)

    # get all href attributes
    hrefs = map(x -> x.attributes["href"], hrefs)
    #println(hrefs)

    entries = []

    # for each href call get_directory
    for href in hrefs
        try
            rows = get_directory(root * href)

            # only push non-empty results
            if !isempty(rows)
                append!(entries, rows)
            end
        catch e
            println(e)
        end
    end

    println("total number of entries: ", length(entries))

    # if the length is 0 return
    if isempty(entries)
        return
    end

    println("the first entry: ", entries[1])
    println("the last entry: ", entries[end])

    # convert to DataFrame    
    df = DataFrame(
        dataset = String[],
        url = String[],
        instrument = String[],
        #object=String[],
        #ra=Float64[],
        #dec=Float64[],
    )
    push!(df, entries...)

    # save to CSV
    CSV.write("xrism.csv", df)
end

function get_directory(dir)
    println("dir: ", dir)

    req = HTTP.get(dir)
    html = parsehtml(String(req.body))

    # get all href elements
    hrefs = eachmatch(sel"a", html.root)

    # get all href attributes
    hrefs = map(x -> x.attributes["href"], hrefs)
    #println(hrefs)

    rows = []

    # iterate through sub-directories
    for href in hrefs
        try
            # Xtend
            files = list_directory(dir * href, "xtend")

            # only push non-empty results
            if !isempty(files)
                push!(rows, files)
            end
        catch _
        end

        try
            # Resolve
            files = list_directory(dir * href, "resolve")

            # only push non-empty results
            if !isempty(files)
                push!(rows, files)
            end
        catch _
        end
    end

    # flatten rows
    rows = vcat(rows...)
    println("number of files: ", length(rows))

    return rows
end

function list_directory(dir, instrument)
    url = dir * instrument * "/event_cl/"

    req = HTTP.get(url)
    html = parsehtml(String(req.body))

    # get all href elements
    hrefs = eachmatch(sel"a", html.root)

    # get all href attributes
    hrefs = map(x -> x.attributes["href"], hrefs)
    #println(hrefs)

    # map get_file to hrefs    
    skipmissing(ThreadsX.map(href -> get_file(url, instrument, href), hrefs)) |> collect
end

# this function assumes that the user has created the directory structure as per below:
# ~/NAO/JAXA/XRISM/XTEND
# ~/NAO/JAXA/XRISM/RESOLVE
function get_file(url, instrument, file)
    local pixels, mask, spectrum, header, json, min_count, max_count

    # check if the file ends with "_cl.evt.gz"
    if !endswith(file, "_cl.evt.gz")
        return missing
    end

    #_home = homedir() * "/JAXA/XRISM/" # a local filesystem (Mac Studio)
    #_home = homedir() * "/NAO/JAXA/XRISM/" # a local filesystem
    _home = "/Volumes/OWC/JAXA/XRISM/" # an SSD RAID Volume on zodiac    

    # download the file
    _url = url * file
    _target = _home * file
    #_target = _home * uppercase(instrument) * "/" * file

    # check if the file already exists
    if isfile(replace(_target, ".gz" => ""))
        println("file already exists: ", replace(_target, ".gz" => ""))
        return missing
    end

    try
        # download and gunzip the _target file
        Downloads.download(_url, _target)
        run(`gunzip $_target`)
        println("downloaded $file to $_home...")

        # _target without the .gz extension
        _target = replace(_target, ".gz" => "")
        dataset = replace(file, ".gz" => "")

        return [dataset, _url, instrument] # return early

        #=
        # preload the dataset, create thumbnails
        xdataset = XDataSet(dataset, _target)
        load_events(xdataset)

        width = 128
        height = 128

        (pixels, mask, spectrum, header, json, min_count, max_count) =
            getImageSpectrum(xdataset, width, height)

        max_count = maximum(pixels)

        # convert pixels/mask to RGB        
        fill = 0

        if max_count > 0
            pixels = clamp.(pixels ./ max_count, 0.0, 1.0)
        else
            pixels .= Float32(0)
            pixels[mask] .= Float32(1)
        end

        # fill pixels with the fill colour where mask is false
        pixels[.!mask] .= fill

        # transpose the pixels array
        pixels = pixels'

        # flip the image
        pixels = reverse(pixels, dims = 1)

        # make an image from pixels
        img = colorview(Gray, pixels)

        # save image as PNG
        save(_home * "DEMO/images/" * dataset * "_image.png", img)

        # plot the spectrum as PNG
        # parse the spectrum JSON array "{"height":0.27966323,"center":5.432244,"width":0.17027283}",
        # extract height, center and width Float32 arrays
        bins = JSON.parse(spectrum)

        heights = Float32[]
        edges = Float32[]
        # iterate through the bins dictionary
        for i = 1:length(bins)
            bin = bins[i]
            bheight = Float32(bin["height"])
            bcenter = Float32(bin["center"])
            bwidth = Float32(bin["width"])
            push!(heights, bheight)
            push!(edges, bcenter - bwidth / 2)
        end
        push!(edges, Float32(bins[end]["center"]) + Float32(bins[end]["width"]) / 2)

        # convert to PDF 
        support, density = to_pdf(edges, heights)

        plot_ref = Plots.plot(
            support,
            log.(density);
            legend = false,
            border = true,
            grid = false,
            axis = ([], false),
            color = :black,
            linewidth = 4,
        )
        Plots.savefig(plot_ref, _home * "DEMO/images/" * dataset * "_spectrum.png")

        # parse the JSON to a dictionary
        json = JSON.parse(json)

        object = json["OBJECT"]
        ra = json["RA_OBJ"]
        dec = json["DEC_OBJ"]

        # replace "_" with " "
        object = replace(object, "_" => " ")

        return [dataset, _url, instrument, object, ra, dec]
        =#
    catch e
        println(e)
        return missing
    end
end

#get_table(pub)
get_root(root)