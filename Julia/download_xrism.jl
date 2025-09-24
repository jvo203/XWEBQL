using Downloads
using Cascadia, Gumbo, HTTP

const pub = "https://data.darts.isas.jaxa.jp/pub/xrism/browse/public_list/?k=time&o=asc&c=ALL&q="
const root = "https://data.darts.isas.jaxa.jp/pub/xrism/data/obs/rev3/"

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
    println(hrefs)

    # for each href call get_directory
    for href in hrefs
        try
            get_directory(root * href)
        catch e
            println(e)
        end
    end
end

function get_directory(dir)
    println(dir)

    req = HTTP.get(dir)
    html = parsehtml(String(req.body))

    # get all href elements
    hrefs = eachmatch(sel"a", html.root)

    # get all href attributes
    hrefs = map(x -> x.attributes["href"], hrefs)
    println(hrefs)
    return

    # for each href try to download a clean event file
    for href in hrefs
        try
            get_file(dir, href)
        catch _
        end
    end
end

#get_table(pub)
get_root(root)