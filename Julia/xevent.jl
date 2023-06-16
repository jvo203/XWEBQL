using Dates
using Distributed
using FITSIO
using FHist

@enum Quality low medium high
@enum Beam CIRCLE SQUARE # "square" is a reserved Julia function

finale(x) = @async println("Finalizing $(x.id).$(x.uri)")

mutable struct XDataSet
    id::String
    uri::String
    # metadata
    num_events::Integer

    # data
    x::Any
    y::Any
    energy::Any
    pixels::Any
    mask::Any

    # house-keeping
    has_events::Threads.Atomic{Bool}
    has_error::Threads.Atomic{Bool}
    last_accessed::Threads.Atomic{Float64}

    function XDataSet()
        new("", "", 0, Nothing, Nothing, Nothing, Nothing, Nothing, Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(0.0))
    end

    function XDataSet(id::String, uri::String)
        new(id, uri, 0, Nothing, Nothing, Nothing, Nothing, Nothing, Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(datetime2unix(now())))
    end
end

function update_timestamp(xobject::XDataSet)
    xobject.last_accessed[] = datetime2unix(now())
end

function has_events(xobject::XDataSet)::Bool
    return xobject.has_events[]
end

function has_error(xobject::XDataSet)::Bool
    return xobject.has_error[]
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

function garbage_collector(xobjects, xlock, timeout::Int64)
    global running

    if timeout <= 0
        return
    end

    try
        while running
            println("sleeping ...")
            sleep(10)
            println("done sleeping.")

            # purge datasets
            for (datasetid, xobject) in xobjects
                elapsed = datetime2unix(now()) - xobject.last_accessed[]

                if elapsed > timeout
                    println("Purging a dataset '$datasetid' ...")

                    lock(xlock)

                    try
                        xobject = pop!(XOBJECTS, datasetid)
                        println("Removed '$(xobject.id)' .")
                        finalize(xobject)
                    catch e
                        println("Failed to remove a dataset: $e")
                    finally
                        unlock(xlock)
                    end

                    # do not wait, trigger garbage collection *NOW*
                    GC.gc()

                    # yet another run to trigger finalizers ...
                    GC.gc()
                end
            end
        end
    catch e
        global running = false
        @warn(e)
        #typeof(e) == InterruptException && rethrow(e)        
    end

    @info "Garbage collection loop terminated."
end

function load_events(xdataset::XDataSet, uri::String)
    println("loading $uri::$(xdataset.id)")

    f = FITS(uri)

    try
        @time begin
            x = read(f[2], "X")
            y = read(f[2], "Y")
            energy = read(f[2], "UPI")
        end

        nevents = length(x)
        println("nevents = ", nevents)

        xdataset.num_events = nevents
        xdataset.x = x
        xdataset.y = y
        xdataset.energy = energy
        xdataset.has_events[] = true
    catch e
        println("Failed to load events: $e")
        xdataset.has_error[] = true
    finally
        update_timestamp(xdataset)
    end

    close(f)
end

function getImageSpectrum(xobject::XDataSet, width::Integer, height::Integer)
    local scale::Float32, pixels, mask
    local image_width::Integer, image_height::Integer
    local inner_width::Integer, inner_height::Integer

    inner_width = 0
    inner_height = 0
    bDownsize = false

    println("getImage::$(xobject.id)/($width)/($height)")

    # first prepare (pixels,mask) then downsize as and when necessary
    pixels = getImage(xobject)

    # the spectrum
    (spectrum, E_min, E_max) = getSpectrum(xobject)
    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("Spectrum:", spectrum)
end

function getImage(xobject::XDataSet)
    x = xobject.x
    y = xobject.y

    @time h2 = Hist2D((x, y), (minimum(x)-0.5:1:maximum(x)+0.5, minimum(y)-0.5:1:maximum(y)+0.5))
    pixels = bincounts(h2)
    println("size(pixels) = ", size(pixels))

    return pixels
end

function getSpectrum(xobject::XDataSet)
    energy = xobject.energy

    E_min = Float32(minimum(energy)) # eV
    E_max = Float32(1000.0) * 2^10 # eV

    @time (spectrum, E_max) = makeSpectrum(energy, E_min, E_max, Float32(10.0), Int32(512))
    println("E_max = ", E_max)

    return (spectrum, E_min, E_max)
end

function truncate_spectrum(spectrum::Vector{Int64})
    # find the first non-zero bin from the end
    i = length(spectrum)
    while i > 0 && spectrum[i] == 0
        i -= 1
    end

    return spectrum[1:i]
end

function makeSpectrum(data::Vector{Float32}, E_min::Float32, E_max::Float32, ΔE_min::Float32, dx::Int32)
    local new_spectrum, max_energy, ΔE::Float32

    #ΔE = max(ΔE_min, (E_max - E_min) / dx)
    ΔE = (E_max - E_min) / dx
    println("ΔE = ", ΔE)

    max_energy = E_max

    while ΔE >= ΔE_min
        # prepare the histogram
        h1 = Hist1D(data, E_min:ΔE:max_energy, overflow=false)
        spectrum = bincounts(h1)
        new_spectrum = truncate_spectrum(spectrum)
        new_length = length(new_spectrum)

        if new_length == length(spectrum)
            break
        end

        # get the upper energy limit based on the new spectrum
        max_energy = E_min + ΔE * new_length
        println("max_energy = ", max_energy)

        #ΔE = max(ΔE_min, (max_energy - E_min) / dx)
        ΔE = (max_energy - E_min) / dx
        println("ΔE = ", ΔE)

        h1 = Hist1D(data, E_min:ΔE:max_energy, overflow=false)
        spectrum = bincounts(h1)
    end

    return (new_spectrum, max_energy)
end