using Downloads
using Cascadia, Gumbo, HTTP

#const pub = "https://data.darts.isas.jaxa.jp/pub/xrism/browse/public_list/"
const pub = "https://data.darts.isas.jaxa.jp/pub/xrism/browse/public_list/?k=time&o=asc&c=ALL&q="

function get_root(pub)
    html = HTTP.get(pub).body
    doc = parsehtml(html)

    println(doc)
end

get_root(pub)