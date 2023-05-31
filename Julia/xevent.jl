using Distributed
using FITSIO

finale(x) = @async println("Finalizing $(x.id).")

mutable struct XDataSet
    id::String
    uri::String
    # metadata
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