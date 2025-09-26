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

    # iterate through sub-directories
    for href in hrefs
        try
            # Xtend
            list_directory(dir * href, "xtend")
        catch _
        end

        try
            # Resolve
            list_directory(dir * href, "resolve")
        catch _
        end
    end
end

function list_directory(dir, instrument)
    url = dir * instrument * "/event_cl/"
    println(url)

    req = HTTP.get(url)
    html = parsehtml(String(req.body))

    # get all href elements
    hrefs = eachmatch(sel"a", html.root)

    # get all href attributes
    hrefs = map(x -> x.attributes["href"], hrefs)
    #println(hrefs)

    # for each href try to download a clean event file
    for href in hrefs
        try
            get_file(url, instrument, href)
        catch e
            println(e)
        end
    end
end

# this function assumes that the user has created the directory structure as per below:
# ~/NAO/JAXA/XRISM/XTEND
# ~/NAO/JAXA/XRISM/RESOLVE
function get_file(url, instrument, file)
    # check if the file ends with "_cl.evt.gz"
    if !endswith(file, "_cl.evt.gz")
        return
    end

    #_home = homedir() * "/NAO/JAXA/XRISM/" # a local filesystem
    _home = "/Volumes/OWC/JAXA/XRISM/" # an SSD RAID Volume on zodiac

    println("downloading $file to $_home...")

    # download the file
    _url = url * file
    _target = _home * uppercase(instrument) * "/" * file
    Downloads.download(_url, _target)

    # gunzip the _target file
    run(`gunzip $_target`)
end

#get_table(pub)
get_root(root)