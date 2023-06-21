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
    (pixels, mask, xmin, xmax, ymin, ymax) = getImage(xobject)
    println("size(pixels) = ", size(pixels))
    println("size(mask) = ", size(mask))
    println("x: ($xmin, $xmax); y: ($ymin, $ymax)")

    # the spectrum
    (spectrum, E_min, E_max) = getSpectrum(xobject, 512)
    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("spectrum:", spectrum)

    # JSON + HEADER
    (header, json) = getHeader(xobject, pixels, xmin, xmax, ymin, ymax, E_min, E_max, length(spectrum))
    println(json)
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

    # make a mask for the pixels
    mask = pixels .> 0

    return (pixels, mask, xmin, xmax, ymin, ymax)
end

function getSpectrum(xobject::XDataSet, dx::Integer)
    energy = log.(xobject.energy)

    E_min = Float32(minimum(energy)) # eV    
    E_max = Float32(maximum(energy)) # eV
    ΔE = (E_max - E_min) / dx

    @time h = Hist1D(energy, E_min:ΔE:E_max, overflow=false)
    spectrum = bincounts(h)

    # get the bin centers
    centers = bincenters(h)

    # get the E_min and E_max from the bin centers
    E_min = Float32(minimum(centers)) # eV
    E_max = Float32(maximum(centers)) # eV

    return (spectrum, E_min, E_max)
end

function getHeader(xobject::XDataSet, pixels::AbstractArray, x1::Integer, x2::Integer, y1::Integer, y2::Integer, E1::Float32, E2::Float32, NAXIS3::Integer)
    global SERVER_STRING

    local CRVAL1, CDELT1, CRPIX1, CUNIT1, CTYPE1
    local CRVAL2, CDELT2, CRPIX2, CUNIT2, CTYPE2
    local CRVAL3, CDELT3, CRPIX3, CUNIT3, CTYPE3
    local BUNIT, BTYPE, SPECSYS
    local OBJECT, OBSRA, OBSDEC, DATEOBS, TIMESYS
    local TELESCOP, INSTRUME, OBSERVER, EQUINOX, RADECSYS

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

    # adjust the CRPIX1 and CRPIX2
    # CRPIX1 = CRPIX1 - x1 + 1
    # CRPIX2 = CRPIX2 - y1 + 1

    # re-base the axes 1 and 2

    # get the ra at x1    
    ra = CRVAL1 + (x1 - CRPIX1) * CDELT1

    # get the dec at y1
    dec = CRVAL2 + (y1 - CRPIX2) * CDELT2

    println("ra = $ra, dec = $dec")

    # re-base CRPIX1 and CRPIX2
    CRPIX1 = (x2 - x1 + 1) / 2
    CRPIX2 = (y2 - y1 + 1) / 2

    # re-base CRVAL1 and CRVAL2
    CRVAL1 = ra - (1 - CRPIX1) * CDELT1
    CRVAL2 = dec - (1 - CRPIX2) * CDELT2

    # manually create the third axis
    CRPIX3 = Float32(1.0) # first fix CRPIX3
    CDELT3 = (E2 - E1) / (NAXIS3 - 1)
    CRVAL3 = E1
    CUNIT3 = "eV"
    CTYPE3 = "ENERGY"

    println("CRVAL1 = $CRVAL1, CDELT1 = $CDELT1, CRPIX1 = $CRPIX1, CUNIT1 = $CUNIT1, CTYPE1 = $CTYPE1")
    println("CRVAL2 = $CRVAL2, CDELT2 = $CDELT2, CRPIX2 = $CRPIX2, CUNIT2 = $CUNIT2, CTYPE2 = $CTYPE2")
    println("CRVAL3 = $CRVAL3, CDELT3 = $CDELT3, CRPIX3 = $CRPIX3, CUNIT3 = $CUNIT3, CTYPE3 = $CTYPE3")

    # OBSRA
    try
        OBSRA = xobject.header["RA_OBJ"]
    catch _
        OBSRA = CRVAL1
    end

    # OBSDEC
    try
        OBSDEC = xobject.header["DEC_OBJ"]
    catch _
        OBSDEC = CRVAL2
    end

    # OBJECT
    try
        OBJECT = xobject.header["OBJECT"]
    catch _
        OBJECT = "UNKNOWN"
    end

    # DATE-OBS
    try
        DATEOBS = xobject.header["DATE-OBS"]
    catch _
        DATEOBS = "UNKNOWN"
    end

    # TIMESYS
    try
        TIMESYS = xobject.header["TIMESYS"]
    catch _
        TIMESYS = "UNKNOWN"
    end

    # BUNIT
    try
        BUNIT = xobject.header["TUNIT43"]
    catch _
        BUNIT = "UNKNOWN"
    end

    # BTYPE
    try
        BTYPE = xobject.header["TTYPE43"]
    catch _
        BTYPE = "UNKNOWN"
    end

    # SPECSYS
    try
        SPECSYS = xobject.header["SPECSYS"]
    catch _
        SPECSYS = "UNKNOWN"
    end

    println("OBJECT = $OBJECT, OBSRA = $OBSRA, OBSDEC = $OBSDEC, DATEOBS = $DATEOBS, TIMESYS = $TIMESYS")
    println("BUNIT = $BUNIT, BTYPE = $BTYPE, SPECSYS = $SPECSYS")

    # TELESCOP
    try
        TELESCOP = xobject.header["TELESCOP"]
    catch _
        TELESCOP = "UNKNOWN"
    end

    # INSTRUME
    try
        INSTRUME = xobject.header["INSTRUME"]
    catch _
        INSTRUME = "UNKNOWN"
    end

    # OBSERVER
    try
        OBSERVER = xobject.header["OBSERVER"]
    catch _
        OBSERVER = "UNKNOWN"
    end

    # EQUINOX
    try
        EQUINOX = xobject.header["EQUINOX"]
    catch _
        EQUINOX = "UNKNOWN"
    end

    # RADECSYS
    try
        RADECSYS = xobject.header["RADECSYS"]
    catch _
        RADECSYS = "UNKNOWN"
    end

    println("TELESCOP = $TELESCOP, INSTRUME = $INSTRUME, OBSERVER = $OBSERVER, EQUINOX = $EQUINOX, RADECSYS = $RADECSYS")

    # make a new header from pixels
    new_header = default_header(pixels)

    # manually override the number of axes
    new_header["NAXIS"] = 3
    new_header["NAXIS3"] = NAXIS3

    # information about the target
    new_header["OBJECT"] = OBJECT
    new_header["TELESCOP"] = TELESCOP
    new_header["INSTRUME"] = INSTRUME
    new_header["OBSERVER"] = OBSERVER
    new_header["EQUINOX"] = EQUINOX
    new_header["RADECSYS"] = RADECSYS
    new_header["OBSRA"] = OBSRA
    new_header["OBSDEC"] = OBSDEC
    new_header["DATE-OBS"] = DATEOBS
    new_header["TIMESYS"] = TIMESYS

    # WCS
    new_header["CRVAL1"] = CRVAL1
    new_header["CDELT1"] = CDELT1
    new_header["CRPIX1"] = CRPIX1
    new_header["CUNIT1"] = CUNIT1
    new_header["CTYPE1"] = CTYPE1

    new_header["CRVAL2"] = CRVAL2
    new_header["CDELT2"] = CDELT2
    new_header["CRPIX2"] = CRPIX2
    new_header["CUNIT2"] = CUNIT2
    new_header["CTYPE2"] = CTYPE2

    new_header["CRVAL3"] = CRVAL3
    new_header["CDELT3"] = CDELT3
    new_header["CRPIX3"] = CRPIX3
    new_header["CUNIT3"] = CUNIT3
    new_header["CTYPE3"] = CTYPE3

    # other    
    new_header["BUNIT"] = BUNIT
    new_header["BTYPE"] = BTYPE
    new_header["SPECSYS"] = SPECSYS
    new_header["ORIGIN"] = "JAXA/JVO"
    new_header["SOFTVER"] = SERVER_STRING

    header_buf = IOBuffer()
    show(header_buf, new_header)
    seek(header_buf, 0)
    header_str = String(take!(header_buf))

    buf = IOBuffer()

    # get pixels dimensions
    width = size(pixels)[1]
    height = size(pixels)[2]

    BITPIX = new_header["BITPIX"]

    # estimate the filesize
    filesize = convert(Int64, width * height * NAXIS3 * BITPIX / 8)

    dict = Dict(
        "width" => width,
        "height" => height,
        "depth" => NAXIS3,
        "filesize" => convert(Int64, filesize),
        "BITPIX" => BITPIX,
        "IGNRVAL" => -1,
        "CRVAL1" => CRVAL1,
        "CDELT1" => CDELT1,
        "CRPIX1" => CRPIX1,
        "CUNIT1" => CUNIT1,
        "CTYPE1" => CTYPE1,
        "CRVAL2" => CRVAL2,
        "CDELT2" => CDELT2,
        "CRPIX2" => CRPIX2,
        "CUNIT2" => CUNIT2,
        "CTYPE2" => CTYPE2,
        "CRVAL3" => CRVAL3,
        "CDELT3" => CDELT3,
        "CRPIX3" => CRPIX3,
        "CUNIT3" => CUNIT3,
        "CTYPE3" => CTYPE3,
        "BUNIT" => BUNIT,
        "BTYPE" => BTYPE,
        "SPECSYS" => SPECSYS,
        "OBSRA" => OBSRA,
        "OBSDEC" => OBSDEC,
        "OBJECT" => OBJECT,
        "DATEOBS" => DATEOBS,
        "TIMESYS" => TIMESYS,
    )

    write(buf, JSON.json(dict))
    json = String(take!(buf))

    return (header_str, json)

end