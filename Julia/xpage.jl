include("xevent.jl")

function get_download_url(filename::String)::String
    # extract the first 3 characters
    prefix = filename[1:3]

    # extract the string between "ah" and "sxs"    
    number = split(filename, "ah")[2]
    number = split(number, "sxs")[1]

    url = "https://data.darts.isas.jaxa.jp/pub/hitomi/obs/"

    # check if the last character in prefix if 0 or 1
    if endswith(prefix, "0")
        url *= "0/"
    end

    if endswith(prefix, "1")
        url *= "1/"
    end

    url *= number * "/sxs/event_cl/" * filename

    return url
end

function get_xwebql_url(filename::String)::String
    return "http://zodiac.mtk.nao.ac.jp:9000/xwebql/events.html?mission=" * lowercase(mission) * "&dataset=" * filename
end

dir = "/Volumes/OWC/JAXA/"
mission = "HITOMI"

# first get all files in dir
files = readdir("/Volumes/OWC/JAXA/" * mission)

html = IOBuffer()
write(html, "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n")
write(html, "<title>" * mission * "</title>\n</head>\n<body>\n")

# HTML h1
write(html, "<h1>X-ray Event Files</h1>\n")

# append HTML table header
write(html, "<table><tr><th>#</th><th>Dataset</th><th>Object</th><th>Ra [deg]</th><th>Dec [deg]</th><th>QL image</th><th>QL spectrum</th><th>XWEBQL</th><th>Event File</th></tr>\n")

count = 1
for entry in files
    global count

    uri = "/Volumes/OWC/JAXA/" * mission * "/" * entry
    dataset = entry

    download_url = get_download_url(dataset)
    xwebql_url = get_xwebql_url(dataset)

    println(count, " ", dataset, " ", download_url, " ", xwebql_url)

    xdataset = XDataSet(dataset, uri)
    load_events(xdataset, uri)

    # append HTML table row
    write(html, "<tr><td>$count</td><td>$dataset</td><td>unknown</td><td>0.0</td><td>0.0</td><td>image</td><td>spectrum</td><td><a href=\"$xwebql_url\">$xwebql_url</a></td><td><a href=\"$download_url\">$download_url</a></td></tr>\n")

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