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
    url = root
    println(url)

    # download the HTML, parse the table    
    req = HTTP.get(url)
    html = parsehtml(String(req.body))

    # get all href elements
    hrefs = eachmatch(sel"a", html.root)

    # get all href attributes
    hrefs = map(x -> x.attributes["href"], hrefs)
    println(hrefs)
end

get_table(pub)
get_root(root)