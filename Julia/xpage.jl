using CSV
using DataFrames
using HTTP
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

function get_download_url(filename::String)::String
    # extract the first 3 characters
    prefix = filename[1:3]

    # extract the string between "ah" and "sxi/sxs"
    number = split(filename, "ah")[2]
    number = split(number, "sx")[1]

    url = "https://data.darts.isas.jaxa.jp/pub/hitomi/obs/"

    # check if the last character in prefix if 0 or 1
    if endswith(prefix, "0")
        url *= "0/"
    end

    if endswith(prefix, "1")
        url *= "1/"
    end

    # check if the filename contains "sxi" or "sxs"
    if contains(filename, "sxi")
        url *= number * "/sxi/event_cl/" * filename
    elseif contains(filename, "sxs")
        url *= number * "/sxs/event_cl/" * filename
    end

    return url
end

function get_xwebql_url(filename::String)::String
    return "http://$HOST:$PORT/xwebql/events.html?mission=" *
           lowercase(mission) *
           "&dataset=" *
           filename
end

function get_darts_xwebql(url::String)::String
    # HTML-encode the URL    
    return "http://$HOST:$PORT/xwebql/events.html?url=" * HTTP.escape(url)
end

#dir = "/Volumes/OWC/JAXA/"
dir = homedir() * "/NAO/JAXA/"
mission = "HITOMI"
SERVER_STRING = "xpage.jl"

#HOST = "zodiac.mtk.nao.ac.jp"
#PORT = 10000

HOST = "localhost"
PORT = 8080

# first get all files in dir
files = readdir(homedir() * "/NAO/JAXA/" * mission)
println("files: ", files)

html = IOBuffer()
write(html, "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n")
write(html, "<title>" * mission * "</title>\n</head>\n<body>\n")

# HTML h1
write(html, "<h1>" * mission * " X-ray SXI / SXS Event Files</h1>\n")

# append HTML table header
write(
    html,
    "<table><tr><th>#</th><th>Dataset</th><th>Object</th><th>Ra [deg]</th><th>Dec [deg]</th><th>QL image</th><th>QL spectrum</th><th>XWEBQL Preview</th><th>Event File Download</th></tr>\n",
)

# open a CSV file for writing
csv = CSV.open(dir * "DEMO/" * lowercase(mission) * ".csv", "w")

# create an empty DataFrame
df = DataFrame(
    index = Integer[],
    dataset = String[],
    object = String[],
    ra = Float64[],
    dec = Float64[],
    image = String[],
    spectrum = String[],
    xwebql = String[],
    download = String[],
)

# write the CSV header
#CSV.write(csv, IOBuffer(["#", "Dataset", "Object", "Ra [deg]", "Dec [deg]", "QL image", "QL spectrum", "XWEBQL Preview", "Event File Download"]))

count = 1
for entry in files
    global count
    local pixels, mask, spectrum, header, json, min_count, max_count

    #uri = "/Volumes/OWC/JAXA/" * mission * "/" * entry
    uri = homedir() * "/NAO/JAXA/" * mission * "/" * entry
    dataset = entry

    download_url = get_download_url(dataset)
    #xwebql_url = get_xwebql_url(dataset)
    xwebql_url = get_darts_xwebql(download_url)

    println(count, " ", dataset, " ", download_url, " ", xwebql_url)

    xdataset = XDataSet(dataset, uri)
    load_events(xdataset)

    width = 128
    height = 128

    try
        (pixels, mask, spectrum, header, json, min_count, max_count) =
            getImageSpectrum(xdataset, width, height)
    catch e
        println("Error: ", e)
        continue
    end

    max_count = ThreadsX.maximum(pixels)

    # convert pixels/mask to RGB
    dims = size(pixels)
    img_width = dims[1]
    img_height = dims[2]
    fill = 0

    if max_count > 0
        pixels = clamp.(pixels ./ max_count, 0.0, 1.0)
    else
        pixels .= Float32(0)
        pixels[mask] .= Float32(1)

        println("mask range:", ThreadsX.extrema(mask))
        println("pixels range:", ThreadsX.extrema(pixels))
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
    save(dir * "DEMO/images/" * entry * "_image.png", img)

    println(max_count, extrema(pixels))

    # plot the spectrum as PNG
    println(spectrum)

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

    println("heights: ", heights)
    println("edges: ", edges)

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
    Plots.savefig(plot_ref, dir * "DEMO/images/" * entry * "_spectrum.png")

    # parse the JSON to a dictionary
    json = JSON.parse(json)

    object = json["OBJECT"]
    ra = json["RA_OBJ"]
    dec = json["DEC_OBJ"]

    # replace "_" with " "
    object = replace(object, "_" => " ")

    image_link = "images/" * entry * "_image.png"
    spectrum_link = "images/" * entry * "_spectrum.png"

    # append HTML table row
    write(
        html,
        "<tr><td>$count</td><td>$dataset</td><td>$object</td><td>$ra</td><td>$dec</td><td><img src='$image_link'></td><td><img src='$spectrum_link' width='$width'></td><td><a href=\"$xwebql_url\">$xwebql_url</a></td><td><a href=\"$download_url\">$download_url</a></td></tr>\n",
    )

    # append the DataFrame row
    push!(
        df,
        [
            count,
            dataset,
            object,
            ra,
            dec,
            image_link,
            spectrum_link,
            xwebql_url,
            download_url,
        ],
    )

    # increment the index
    count = count + 1
end

# end the HTML table
write(html, "</table>\n")

# end the HTML document
write(html, "</body>\n</html>\n")

# write the HTML document to disk
open(dir * "DEMO/index.html", "w") do f
    write(f, String(take!(html)))
end

# write the DataFrame to CSV
#CSV.write(dir * "DEMO/" * lowercase(mission) * ".csv", df)
CSV.write(csv, df)
close(csv)