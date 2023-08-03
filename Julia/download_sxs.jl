using Downloads
using Cascadia, Gumbo, HTTP

pub = "https://data.darts.isas.jaxa.jp/pub/hitomi/obs/"

function get_root(suffix::String)
    url = pub * suffix * "/"
    println(url)

    # download the HTML, parse the table    
    req = HTTP.get(url)
    html = parsehtml(String(req.body))

    # get all href elements
    hrefs = eachmatch(sel"a", html.root)

    # get all href attributes
    hrefs = map(x -> x.attributes["href"], hrefs)
    println(hrefs)

    # for each href try to download a clean event file
    for href in hrefs
        try
            get_directory(url * href * "sxs/event_cl")
        catch _
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

    # for each href try to download a clean event file
    for href in hrefs
        try
            get_file(dir, href)
        catch e
            println(e)
        end
    end
end

function get_file(dir, file)
    # check if the file ends with "_cl.evt.gz"
    if !endswith(file, "_cl.evt.gz") || !endswith(file, "_cl.evt")
        return
    end

    println("downloading $file...")

    # download the file
    _url = dir * "/" * file
    _target = homedir() * "/NAO/JAXA/HITOMI/" * file
    Downloads.download(_url, _target)
end


get_root("0")
get_root("1")