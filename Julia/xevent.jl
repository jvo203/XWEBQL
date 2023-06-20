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

    # header    
    header::Any

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
        new("", "", 0, Nothing, Nothing, Nothing, Nothing, Nothing, Nothing, Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(0.0))
    end

    function XDataSet(id::String, uri::String)
        new(id, uri, 0, Nothing, Nothing, Nothing, Nothing, Nothing, Nothing, Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(datetime2unix(now())))
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
        xdataset.header = read_header(f[2])
        println("#keywords: ", length(xdataset.header))

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
    (pixels, xmin, xmax, ymin, ymax) = getImage(xobject)
    println("size(pixels) = ", size(pixels))
    println("x: ($xmin, $xmax); y: ($ymin, $ymax)")

    # the spectrum
    (spectrum, E_min, E_max) = getSpectrum(xobject, 512)
    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("spectrum:", spectrum)

    # JSON
    getJSON(xobject, xmin, xmax, ymin, ymax, E_min, E_max)
end

function getImage(xobject::XDataSet)
    x = xobject.x
    y = xobject.y

    xmin = minimum(x)
    xmax = maximum(x)
    ymin = minimum(y)
    ymax = maximum(y)

    @time h = Hist2D((x, y), (xmin-0.5:1:xmax+0.5, ymin-0.5:1:ymax+0.5))
    pixels = bincounts(h)

    return (pixels, xmin, xmax, ymin, ymax)
end

function getSpectrum(xobject::XDataSet, dx::Integer)
    energy = log.(xobject.energy)

    E_min = Float32(minimum(energy)) # eV    
    E_max = Float32(maximum(energy)) # eV
    ΔE = (E_max - E_min) / dx

    @time h = Hist1D(energy, E_min:ΔE:E_max, overflow=false)
    spectrum = bincounts(h)

    return (spectrum, E_min, E_max)
end

function getJSON(xobject::XDataSet, x1::Integer, x2::Integer, y1::Integer, y2::Integer, E1::Float32, E2::Float32)
    local CRVAL1, CDELT1, CRPIX1, CUNIT1, CTYPE1
    local CRVAL2, CDELT2, CRPIX2, CUNIT2, CTYPE2
    local CRVAL3, CDELT3, CRPIX3, CUNIT3, CTYPE3
    local BUNIT, BTYPE, SPECSYS
    local BITPIX, OBSRA, OBSDEC
    local OBJECT, DATEOBS, TIMESYS, LINE, FILTER

    # println(xobject.header)

    try
        CRVAL1 = xobject.header["TCRVL40"]
    catch _
        CRVAL1 = NaN
    end

    try
        CDELT1 = xobject.header["TCDLT40"]
    catch _
        CDELT1 = NaN
    end

    try
        CRPIX1 = xobject.header["TCRPX40"]
    catch _
        CRPIX1 = NaN
    end

    try
        CUNIT1 = xobject.header["TCUNI40"]
    catch _
        CUNIT1 = NaN
    end

    try
        CTYPE1 = xobject.header["TCTYP40"]
    catch _
        CTYPE1 = NaN
    end

    println("CRVAL1 = $CRVAL1, CDELT1 = $CDELT1, CRPIX1 = $CRPIX1, CUNIT1 = $CUNIT1, CTYPE1 = $CTYPE1")

    try
        CRVAL2 = xobject.header["TCRVL41"]
    catch _
        CRVAL2 = NaN
    end

    try
        CDELT2 = xobject.header["TCDLT41"]
    catch _
        CDELT2 = NaN
    end

    try
        CRPIX2 = xobject.header["TCRPX41"]
    catch _
        CRPIX2 = NaN
    end

    try
        CUNIT2 = xobject.header["TCUNI41"]
    catch _
        CUNIT2 = NaN
    end

    try
        CTYPE2 = xobject.header["TCTYP41"]
    catch _
        CTYPE2 = NaN
    end

    println("CRVAL2 = $CRVAL2, CDELT2 = $CDELT2, CRPIX2 = $CRPIX2, CUNIT2 = $CUNIT2, CTYPE2 = $CTYPE2")
end