using HTTP
using ProgressMeter

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


function poll_progress(dataset)
    strURL =
        "http://" *
        host *
        ":" *
        string(port) *
        "/xwebql/progress/" *
        HTTP.escapeuri(dataset)

    resp = HTTP.get(strURL)
    println(resp)

    if resp.status == 200
        return JSON.parse(String(resp.body))["progress"]
    else
        println("Error polling progress: ", resp)
        return nothing
    end
end

function preload_dataset(dataset, url)
    local progress

    # access the XWEBQL
    resp = HTTP.get(url)

    # check the HTTP response code
    if resp.status != 200
        println(resp)
        return
    end

    sleep(30) # give it some time to start loading
    return

    # wait until a dataset has been loaded
    p = Progress(100, 1, "Loading...")

    # repeatedly poll for progress
    while true
        progress = poll_progress(dataset)

        if isnothing(progress)
            println("\nno progress")
            break
        end

        update!(p, Int(floor(progress)))

        # throw a DomainError if the progress is over 100% (should not happen, I want to catch any logical bugs, network problems, etc.)
        if progress > 100
            println("\nanomalous progress detected: $(progress)!")
            throw(DomainError(progress, "anomalous progress detected"))
        end

        if progress == 100
            break
        else
            println("dataset=$(dataset) progress=$(progress)")
            sleep(1)
        end

    end

    # then wait 20 seconds to allow for the 15s dataset timeout (avoid a RAM overload)
    sleep(20) # or not ...
end

function process_xrism_directory(dir)
    println("process_xrism_directory dir: ", dir)

    entries = readdir(dir; join = false)
    println("total number of entries: ", length(entries))

    for dataset in entries
        # check if the dataset ends with "_cl.evt.gz" or "_cl.evt", else continue
        if !(endswith(dataset, "_cl.evt.gz") || endswith(dataset, "_cl.evt"))
            continue
        end

        url = get_dataset_url(dataset)
        println("dataset: $dataset, xwebql: $url")

        preload_dataset(dataset, url)
    end

end

println("preload_xrism.jl dir: ", dir)
process_xrism_directory(dir)