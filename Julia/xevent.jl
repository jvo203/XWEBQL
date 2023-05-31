using Dates
using Distributed
using FITSIO

finale(x) = @async println("Finalizing $(x.id).$(x.uri)\n")

mutable struct XDataSet
    id::String
    uri::String
    # metadata

    # house-keeping
    has_events::Threads.Atomic{Bool}
    has_error::Threads.Atomic{Bool}
    last_accessed::Threads.Atomic{Float64}

    function XDataSet()
        new("", "", Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(0.0))
    end

    function XDataSet(id::String, uri::String)
        new(id, uri, Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(datetime2unix(now())))
    end
end

function update_timestamp(xobject::XDataSet)
    xobject.last_accessed[] = datetime2unix(now())
end

function dataset_exists(datasetid::String, xobjects, xlock)::Bool
    key_exists = false

    lock(xlock)

    try
        key_exists = haskey(xobjects, datasetid)
    finally
        unlock(xlock)
    end

    return key_exists
end

function insert_dataset(dataset::XDataSet, xobjects, xlock)
    lock(xlock)

    try
        datasetid = dataset.id
        xobjects[datasetid] = dataset
    catch e
        println("Failed to insert a dataset: $e")
    finally
        unlock(xlock)
    end
end

function get_dataset(datasetid::String, xobjects, xlock)::XDataSet
    local dataset::XDataSet

    lock(xlock)

    try
        dataset = xobjects[datasetid]
    catch e
        dataset = xDataSet()
        println("Failed to retrieve a dataset: $e")
    finally
        unlock(xlock)
    end

    return dataset
end

function load_events(xdataset::XDataSet, uri::String)
    println("loading $uri::$(xdataset.id)")
end