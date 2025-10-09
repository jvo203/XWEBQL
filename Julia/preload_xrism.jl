using HTTP

mission = "xrism"
host = "jvow"
port = 10000
dir = "/Volumes/OWC/JAXA/XRISM"

# get the dir from the first command line argument
if length(ARGS) > 0
    dir = ARGS[1]
    #else
    #    println("Usage: julia preload_xrism.jl <xrism_dir>")
    #    exit(1)
end

function get_dataset_url(dataset)
    # HTTP-encode the dataset    
    return "http://" *
           host *
           ":" *
           string(port) *
           "/xwebql/events.html?mission=" *
           mission *
           "&dataset=" *
           HTTP.escapeuri(dataset)
end

function process_xrism_directory(dir)
    println("process_xrism_directory dir: ", dir)

    entries = readdir(dir; join = false)
    println("total number of entries: ", length(entries))

    # do nothing if there are no entries
    # --- IGNORE ---
    if isempty(entries)
        return
    end

    for dataset in entries
        # check if the dataset ends with "_cl.evt.gz" or "_cl.evt", else continue
        if !(endswith(dataset, "_cl.evt.gz") || endswith(dataset, "_cl.evt"))
            continue
        end

        url = get_dataset_url(dataset)

        println("dataset: $dataset, xwebql: $url")
    end

end

println("preload_xrism.jl dir: ", dir)
process_xrism_directory(dir)