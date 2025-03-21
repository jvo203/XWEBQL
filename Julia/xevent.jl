using Dates
using Distributed
using Downloads
using FITSIO
using FHist
using ImageTransformations, Interpolations
using JSON
using Printf
using ThreadsX

const HITOMI_SXS_Pi2evFactor = 0.5f0
const HITOMI_SXI_Pi2evFactor = 6.0f0
const XRISM_RESOLVE_Pi2evFactor = 0.5f0
const XRISM_XTEND_Pi2evFactor = 6.0f0

@enum Quality low medium high
@enum Beam CIRCLE SQUARE # "square" is a reserved Julia function

finale(x) = @async println("Finalized $(x.id) :: $(x.uri)")

# energy cap
const MAXIMUM_ENERGY = 30000.0 # eV

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

    # house-keeping
    has_events::Threads.Atomic{Bool}
    has_error::Threads.Atomic{Bool}
    created::Threads.Atomic{Float64}
    last_accessed::Threads.Atomic{Float64}
    progress::Threads.Atomic{Int}
    total::Threads.Atomic{Int}
    elapsed::Threads.Atomic{Float64}

    function XDataSet()
        new("", "", 0, Nothing, Nothing, Nothing, Nothing, Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(datetime2unix(now())), Threads.Atomic{Float64}(0.0), Threads.Atomic{Int}(0), Threads.Atomic{Int}(0), Threads.Atomic{Float64}(0.0))
    end

    function XDataSet(id::String, uri::String)
        new(id, uri, 0, Nothing, Nothing, Nothing, Nothing, Threads.Atomic{Bool}(false), Threads.Atomic{Bool}(false), Threads.Atomic{Float64}(datetime2unix(now())), Threads.Atomic{Float64}(datetime2unix(now())), Threads.Atomic{Int}(0), Threads.Atomic{Int}(0), Threads.Atomic{Float64}(0.0))
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

function get_elapsed(xobject::XDataSet)::Float64
    return datetime2unix(now()) - xobject.last_accessed[]
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
        dataset = XDataSet()
        println("Failed to retrieve a dataset: $e")
    finally
        unlock(xlock)
    end

    return dataset
end


function get_progress(xobject::XDataSet)
    progress = 0.0

    if xobject.total[] > 0
        progress = 100.0 * Float64(xobject.progress[]) / Float64(xobject.total[])
    end

    return progress, xobject.elapsed[]
end

function garbage_collector(xobjects, xlock, timeout::Int64)
    global running

    if timeout <= 0
        return
    end

    try
        while running
            sleep(10)

            purged = false

            # purge datasets
            for (datasetid, xobject) in xobjects
                elapsed = get_elapsed(xobject)

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

                    purged = true
                end
            end

            if purged
                # do not wait, trigger garbage collection *NOW*
                GC.gc()

                # yet another run to trigger finalizers ...
                GC.gc()
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
    global XCACHE
    local f

    println("loading $uri::$(xdataset.id)")

    # check if the uri starts with "http" or "ftp"
    if startswith(uri, "http") || startswith(uri, "ftp")
        # check if the uri is already in the cache (not implemented yet)
        try
            function download_progress(total::Integer, progress::Integer)
                println("$(xdataset.id) :: downloaded: $progress / $total")

                try
                    xdataset.total[] = total
                    xdataset.progress[] = progress
                    xdataset.elapsed[] = datetime2unix(now()) - xdataset.created[]
                catch e
                    println("Failed to update progress: $e")
                end
            end

            f = FITS(Downloads.download(uri, progress=download_progress))
        catch e
            println("Failed to download events: $e")
            xdataset.has_error[] = true
            return
        end
    else
        f = FITS(uri)
    end

    xdataset.total[] = 1
    xdataset.progress[] = 1

    try
        xdataset.header = read_header(f[2])
        println("#keywords: ", length(xdataset.header))

        PI2eV = getEnergyConversionFactor(xdataset.header)

        @time begin
            x = read(f[2], "X")
            y = read(f[2], "Y")
            energy = read(f[2], "PI") .* PI2eV
        end

        nevents = length(x)
        println("nevents = ", nevents)

        xdataset.num_events = nevents
        xdataset.x = x
        xdataset.y = y
        xdataset.energy = log.(energy)
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
    local min_count, max_count

    bDownsize = false

    println("getImage::$(xobject.id)/($width)/($height)")

    # first prepare (pixels,mask) then downsize as and when necessary
    (pixels, mask, xmin, xmax, ymin, ymax) = getImage(xobject)

    # get the maximum count    
    min_count = 1
    max_count = ThreadsX.maximum(pixels)

    println("size(pixels) = ", size(pixels))
    println("size(mask) = ", size(mask))
    println("x: ($xmin, $xmax); y: ($ymin, $ymax)")
    println("min_count = $min_count, max_count = ", max_count)

    # the spectrum
    (spectrum, E_min, E_max) = getSpectrum(xobject, getNumChannels(xobject.header))
    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("spectrum:", spectrum)

    # JSON + HEADER
    (header, json) = getHeader(xobject, pixels, xmin, xmax, ymin, ymax, E_min, E_max, length(spectrum))
    println(header)
    println(json)

    # finally downsize the image (optional)
    inner_width = size(pixels, 1)
    inner_height = size(pixels, 2)

    try
        scale = get_image_scale(width, height, inner_width, inner_height)
    catch e
        println(e)
        scale = 1.0
    end

    if scale < 1.0
        image_width = round(Integer, scale * inner_width)
        image_height = round(Integer, scale * inner_height)
        bDownsize = true
    else
        image_width = inner_width
        image_height = inner_height
    end

    println("scale = $scale, image: $image_width x $image_height, bDownsize: $bDownsize")

    # downsize the pixels & mask    
    if bDownsize
        try
            pixels = imresize(pixels, (image_width, image_height))
            mask =
                Bool.(
                    imresize(
                        mask,
                        (image_width, image_height),
                        method=Constant(),
                    ),
                ) # use Nearest-Neighbours for the mask
        catch e
            println(e)
        end
    end

    # apply a logarithm to pixels
    pixels = Float32.(log.(pixels))

    # replace Infinity by 0.0
    pixels[isinf.(pixels)] .= Float32(0.0)

    # return the image
    return (pixels, mask, Float32.(spectrum), header, json, min_count, max_count)
end

function getImage(xobject::XDataSet)
    x = xobject.x
    y = xobject.y
    energy = xobject.energy

    xmin = minimum(x)
    xmax = maximum(x)
    ymin = minimum(y)
    ymax = maximum(y)

    # make a mask
    mask = [energy[i] <= MAXIMUM_ENERGY for i in 1:length(x)]

    @time h = Hist2D((x[mask], y[mask]); binedges=(xmin-0.5:1:xmax+0.5, ymin-0.5:1:ymax+0.5))
    pixels = bincounts(h)

    # make a mask for the pixels
    mask = pixels .> 0

    return (pixels, mask, xmin, xmax, ymin, ymax)
end

function get_energy_range(xobject::XDataSet)
    energy = xobject.energy

    (E_min, E_max) = ThreadsX.extrema(energy) # log eV
    E_max = min(E_max, log(MAXIMUM_ENERGY)) # log eV

    return (exp(E_min) / 1000.0, exp(E_max) / 1000.0) # keV
end

function getSpectrum(xobject::XDataSet, dx::Integer)
    energy = xobject.energy

    (E_min, E_max) = ThreadsX.extrema(energy)
    E_max = min(E_max, log(MAXIMUM_ENERGY)) # log eV

    if E_min == E_max
        E_min *= 0.9
        E_max *= 1.1
    end

    ΔE = (E_max - E_min) / dx

    @time h = Hist1D(energy; binedges=E_min:ΔE:E_max, overflow=false)
    spectrum = bincounts(h)

    # get the bin centers
    centers = bincenters(h)

    # get the E_min and E_max from the bin centers
    E_min = Float32(minimum(centers)) # log eV
    E_max = Float32(maximum(centers)) # log eV

    return (spectrum, E_min, E_max)
end

function getSquareSpectrum1(xobject::XDataSet, E_min::Float32, E_max::Float32, x1::Integer, x2::Integer, y1::Integer, y2::Integer, dx::Integer)
    ΔE = (E_max - E_min) / dx

    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("ΔE = ", ΔE)

    # find X indices between x1 and x2
    x = xobject.x
    y = xobject.y

    x_indices = findall(x -> x1 <= x <= x2, x)
    y_indices = findall(y -> y1 <= y <= y2, y)

    println("#x_indices: ", length(x_indices))
    println("#y_indices: ", length(y_indices))

    # take an intersection of the two
    indices = intersect(x_indices, y_indices)

    println("#indices: ", length(indices))

    # get the log-energy values
    energy = xobject.energy[indices]

    h = Hist1D(energy; binedges=E_min:ΔE:E_max, overflow=false)
    spectrum = Float32.(bincounts(h))

    return spectrum
end

function getSquareSpectrum2(xobject::XDataSet, E_min::Float32, E_max::Float32, x1::Integer, x2::Integer, y1::Integer, y2::Integer, dx::Integer)
    ΔE = (E_max - E_min) / dx

    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("ΔE = ", ΔE)

    # find X indices between x1 and x2
    x = xobject.x
    y = xobject.y

    # make xy a vector of tuples (x,y)
    # xy = [(x[i], y[i]) for i in 1:length(x)]

    # re-do xy using zip
    xy = zip(x, y)

    println("size(xy) = ", size(xy))

    indices = findall(xy -> x1 <= xy[1] <= x2 && y1 <= xy[2] <= y2, xy)
    println("#indices: ", length(indices))

    # get the log-energy values
    energy = xobject.energy[indices]

    h = Hist1D(energy; binedges=E_min:ΔE:E_max, overflow=false)
    spectrum = Float32.(bincounts(h))

    return spectrum
end

function getViewport(x, y, energy, xmin::Integer, xmax::Integer, ymin::Integer, ymax::Integer, emin::Float32, emax::Float32)
    # find E indices between emin and emax    
    # e_indices = findall(x -> x1 <= energy <= x2, energy)    

    # make a mask    
    mask = [(xmin <= x <= xmax && ymin <= y <= ymax && emin <= e <= emax) for (x, y, e) in zip(x, y, energy)]

    h = Hist2D((x[mask], y[mask]); binedges=(xmin-0.5:1:xmax+0.5, ymin-0.5:1:ymax+0.5), overflow=false)
    pixels = bincounts(h)

    # make a mask for the pixels
    mask = pixels .> 0

    # get the maximum count    
    min_count = 1
    max_count = ThreadsX.maximum(pixels)

    # apply a logarithm to pixels
    pixels = Float32.(log.(pixels))

    # replace Infinity by 0.0
    pixels[isinf.(pixels)] .= Float32(0.0)

    return (pixels, mask, min_count, max_count)
end

function getSquareSpectrum(x, y, energy, E_min::Float32, E_max::Float32, x1::Integer, x2::Integer, y1::Integer, y2::Integer, dx::Integer)
    ΔE = (E_max - E_min) / dx

    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("ΔE = ", ΔE)

    # find points within a square    
    mask = [(x1 <= x <= x2 && y1 <= y <= y2) for (x, y) in zip(x, y)]

    h = Hist1D(energy[mask]; binedges=E_min:ΔE:E_max, overflow=false)
    spectrum = Float32.(bincounts(h))

    return spectrum
end

function getCircleSpectrum(x, y, energy, E_min::Float32, E_max::Float32, cx::Integer, cy::Integer, r2::Integer, dx::Integer)
    ΔE = (E_max - E_min) / dx

    println("E_min = ", E_min)
    println("E_max = ", E_max)
    println("ΔE = ", ΔE)

    # find points within a circle    
    mask = [(x - cx)^2 + (y - cy)^2 <= r2 for (x, y) in zip(x, y)]

    h = Hist1D(energy[mask]; binedges=E_min:ΔE:E_max, overflow=false)
    spectrum = Float32.(bincounts(h))

    return spectrum
end

function getKeyValueByComment(hdr::FITSHeader, comment::String)
    for i = 1:length(hdr)
        # match the comment exactly, trim the comment string
        if strip(hdr.comments[i]) == comment
            #println("hdr.keys[$i] = |", hdr.keys[i], "|, hdr.values[$i] = |", hdr.values[i], "|", ", hdr.comments[$i] = |", hdr.comments[i], "|")
            return hdr.values[i]
        end
    end

    # throw an exception
    println("getKeyValueByComment: '$comment' not found in ", hdr.comments)
    throw("getKeyValueByComment: comment not found: $comment")
end

function getEnergyConversionFactor(header::FITSHeader)::Float32
    # deliberately pass any exceptions higher up
    TELESCOP = uppercase(header["TELESCOP"])
    INSTRUME = uppercase(header["INSTRUME"])

    # HITOMI
    if TELESCOP == "HITOMI"
        if INSTRUME == "SXS"
            return HITOMI_SXS_Pi2evFactor
        end

        if INSTRUME == "SXI"
            return HITOMI_SXI_Pi2evFactor
        end
    end

    # XRISM
    if TELESCOP == "XRISM"
        if INSTRUME == "RESOLVE"
            return XRISM_RESOLVE_Pi2evFactor
        end

        if INSTRUME == "XTEND"
            return XRISM_XTEND_Pi2evFactor
        end
    end

    # throw an exception    
    throw("getEnergyConversionFactor: unsupported 'TELESCOP'($TELESCOP) or 'INSTRUME'($INSTRUME)")
end

function getNumChannels(header::FITSHeader)
    try
        # convert to uppercase
        TELESCOP = uppercase(header["TELESCOP"])

        # HITOMI: 128
        if TELESCOP == "HITOMI"
            return 128
        end

        # XRISM: 512
        if TELESCOP == "XRISM"
            return 512
        end
    catch _
        println("getNumChannels: 'TELESCOP' not found")
    end

    # a default number of channels
    return 256
end

function getHeader(xobject::XDataSet, pixels::AbstractArray, x1::Integer, x2::Integer, y1::Integer, y2::Integer, E1::Float32, E2::Float32, NAXIS3::Integer)
    global SERVER_STRING

    local CRVAL1, CDELT1, CRPIX1, CUNIT1, CTYPE1
    local CRVAL2, CDELT2, CRPIX2, CUNIT2, CTYPE2
    local CRVAL3, CDELT3, CRPIX3, CUNIT3, CTYPE3
    local BUNIT, BTYPE
    local OBJECT, RA_OBJ, DEC_OBJ, DATEOBS, TIMESYS
    local TELESCOP, INSTRUME, OBSERVER, EQUINOX, RADECSYS

    #println(xobject.header)

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

    BUNIT = "counts"
    BTYPE = "COUNTS"

    println("TELESCOP = $TELESCOP, INSTRUME = $INSTRUME, OBSERVER = $OBSERVER, EQUINOX = $EQUINOX, RADECSYS = $RADECSYS")

    try
        CRPIX1 = getKeyValueByComment(xobject.header, "X image ref. pixel")
    catch _
        CRPIX1 = NaN
    end

    try
        CUNIT1 = getKeyValueByComment(xobject.header, "X units")
    catch _
        CUNIT1 = NaN
    end

    try
        CRVAL1 = getKeyValueByComment(xobject.header, "X image ref. pixel coord. ($CUNIT1)")
    catch _
        CRVAL1 = NaN
    end

    try
        CDELT1 = getKeyValueByComment(xobject.header, "X image scale ($CUNIT1/pixel)")
    catch _
        CDELT1 = NaN
    end

    try
        CTYPE1 = getKeyValueByComment(xobject.header, "X coordinate type")
    catch _
        CTYPE1 = NaN
    end

    println("CRVAL1 = $CRVAL1, CDELT1 = $CDELT1, CRPIX1 = $CRPIX1, CUNIT1 = $CUNIT1, CTYPE1 = $CTYPE1")

    try
        CRPIX2 = getKeyValueByComment(xobject.header, "Y image ref. pixel")
    catch _
        CRPIX2 = NaN
    end

    try
        CUNIT2 = getKeyValueByComment(xobject.header, "Y units")
    catch _
        CUNIT2 = NaN
    end

    try
        CRVAL2 = getKeyValueByComment(xobject.header, "Y image ref. pixel coord. ($CUNIT2)")
    catch _
        CRVAL2 = NaN
    end

    try
        CDELT2 = getKeyValueByComment(xobject.header, "Y image scale ($CUNIT2/pixel)")
    catch _
        CDELT2 = NaN
    end

    try
        CTYPE2 = getKeyValueByComment(xobject.header, "Y coordinate type")
    catch _
        CTYPE2 = NaN
    end

    println("CRVAL2 = $CRVAL2, CDELT2 = $CDELT2, CRPIX2 = $CRPIX2, CUNIT2 = $CUNIT2, CTYPE2 = $CTYPE2")

    # adjust the CRPIX1 and CRPIX2
    # CRPIX1 = CRPIX1 - x1 + 1
    # CRPIX2 = CRPIX2 - y1 + 1

    # re-base the axes 1 and 2
    OFFSETX = x1 - 1
    OFFSETY = y1 - 1

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
    CTYPE3 = "LOG-ENERGY"

    println("CRVAL1 = $CRVAL1, CDELT1 = $CDELT1, CRPIX1 = $CRPIX1, CUNIT1 = $CUNIT1, CTYPE1 = $CTYPE1")
    println("CRVAL2 = $CRVAL2, CDELT2 = $CDELT2, CRPIX2 = $CRPIX2, CUNIT2 = $CUNIT2, CTYPE2 = $CTYPE2")
    println("CRVAL3 = $CRVAL3, CDELT3 = $CDELT3, CRPIX3 = $CRPIX3, CUNIT3 = $CUNIT3, CTYPE3 = $CTYPE3")

    # RA_OBJ
    try
        RA_OBJ = xobject.header["RA_OBJ"]
    catch _
        RA_OBJ = CRVAL1
    end

    # DEC_OBJ
    try
        DEC_OBJ = xobject.header["DEC_OBJ"]
    catch _
        DEC_OBJ = CRVAL2
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

    println("OBJECT = $OBJECT, RA_OBJ = $RA_OBJ, DEC_OBJ = $DEC_OBJ, DATEOBS = $DATEOBS, TIMESYS = $TIMESYS")

    # make a new header from pixels
    new_header = default_header(pixels)
    #FITSIO.fitswrite("test.fits", pixels)

    # remove the "EXTEND" keyword
    delete!(new_header, "EXTEND")

    # manually override the number of axes
    new_header["NAXIS"] = 3
    new_header["NAXIS3"] = NAXIS3

    set_comment!(new_header, "NAXIS1", "width")
    set_comment!(new_header, "NAXIS2", "height")
    set_comment!(new_header, "NAXIS3", "energy bins")

    # information about the target
    new_header["OBJECT"] = OBJECT
    new_header["TELESCOP"] = TELESCOP
    new_header["INSTRUME"] = INSTRUME
    new_header["OBSERVER"] = OBSERVER
    new_header["EQUINOX"] = EQUINOX
    new_header["RADECSYS"] = RADECSYS
    new_header["RA_OBJ"] = RA_OBJ
    new_header["DEC_OBJ"] = DEC_OBJ
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

    set_comment!(new_header, "CRVAL3", "natural logarithm of eV")
    set_comment!(new_header, "CDELT3", "natural logarithm of eV")
    set_comment!(new_header, "CUNIT3", "natural logarithm of eV")
    set_comment!(new_header, "CTYPE3", "natural logarithm of energy")

    # other    
    new_header["BUNIT"] = BUNIT
    new_header["BTYPE"] = BTYPE
    set_comment!(new_header, "BTYPE", "Counts per channel")

    new_header["ORIGIN"] = "JAXA/JVO"
    new_header["SOFTVER"] = SERVER_STRING

    header_buf = IOBuffer()
    write_html_header(header_buf, new_header)
    header_str = String(take!(header_buf))

    buf = IOBuffer()

    # get pixels dimensions
    width = size(pixels, 1)
    height = size(pixels, 2)

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
        "OFFSETX" => OFFSETX,
        "OFFSETY" => OFFSETY,
        "BUNIT" => BUNIT,
        "BTYPE" => BTYPE,
        "RA_OBJ" => RA_OBJ,
        "DEC_OBJ" => DEC_OBJ,
        "OBJECT" => OBJECT,
        "DATEOBS" => DATEOBS,
        "TIMESYS" => TIMESYS,
    )

    write(buf, JSON.json(dict))
    json = String(take!(buf))

    return (header_str, json)

end

function get_screen_scale(x::Integer)

    return floor(0.9 * Float32(x))

end

function get_image_scale_square(
    width::Integer,
    height::Integer,
    img_width::Integer,
    img_height::Integer,
)

    screen_dimension = get_screen_scale(min(width, height))
    image_dimension = Float32(max(img_width, img_height))

    return screen_dimension / image_dimension

end

function get_image_scale(
    width::Integer,
    height::Integer,
    img_width::Integer,
    img_height::Integer,
)

    scale = Float32(1.0)

    if img_width == img_height
        return get_image_scale_square(width, height, img_width, img_height)
    end

    if img_height < img_width
        screen_dimension = 0.9 * Float32(height)
        image_dimension = Float32(img_height)
        scale = screen_dimension / image_dimension
        new_image_width = scale * img_width

        if new_image_width > 0.8 * Float32(width)
            screen_dimension = 0.8 * Float32(width)
            image_dimension = Float32(img_width)
            scale = screen_dimension / image_dimension
        end

        return scale
    end

    if img_width < img_height

        screen_dimension = 0.8 * Float32(width)
        image_dimension = Float32(img_width)
        scale = screen_dimension / image_dimension
        new_image_height = scale * img_height

        if new_image_height > 0.9 * Float32(height)
            screen_dimension = 0.9 * Float32(height)
            image_dimension = img_height
            scale = screen_dimension / image_dimension
        end

        return scale
    end

    # default scale
    return scale
end

# functions for displaying header values in show(io, header)
hdrval_repr(v::Bool) = v ? "T" : "F"
hdrval_repr(v::String) = @sprintf "'%-8s'" v
hdrval_repr(v::Union{AbstractFloat,Integer}) = string(v)

function write_html_header(io::IO, hdr::FITSHeader)
    n = length(hdr)
    for i = 1:n
        @printf io "%-8s" hdr.keys[i]
        if hdr.values[i] === nothing
            print(io, "                      ")
            rc = 50  # remaining characters on line
        elseif hdr.values[i] isa String
            val = hdrval_repr(hdr.values[i])
            @printf io "= %-20s" val
            rc = length(val) <= 20 ? 50 : 70 - length(val)
        else
            val = hdrval_repr(hdr.values[i])
            @printf io "= %20s" val
            rc = length(val) <= 20 ? 50 : 70 - length(val)
        end

        if length(hdr.comments[i]) > 0
            @printf io " / %s" hdr.comments[i][1:min(rc - 3, end)]
        end
        i != n && println(io, "<br/>") # HTML line break
    end
end

function getViewportSpectrum(x, y, energy, req::Dict{String,Any}, num_channels::Integer)
    local pixels, mask, spectrum
    local min_count, max_count
    local view_resp, spec_resp

    view_resp = Nothing
    spec_resp = Nothing

    x1 = req["x1"]
    x2 = req["x2"]
    y1 = req["y1"]
    y2 = req["y2"]

    image = req["image"]
    width = req["width"]
    height = req["height"]
    dx = req["dx"]

    println("x1: ", x1)
    println("x2: ", x2)
    println("y1: ", y1)
    println("y2: ", y2)

    println("image: ", image)
    println("width: ", width)
    println("height: ", height)
    println("dx: ", dx)

    quality::Quality = medium # by default use medium quality
    try
        quality = eval(Meta.parse(req["quality"]))
    catch _
    end

    println("quality: ", quality)

    beam = eval(Meta.parse(uppercase(req["beam"])))
    println("beam: ", beam)

    # calculate the centre and squared radius
    cx = abs(x1 + x2) >> 1
    cy = abs(y1 + y2) >> 1
    r = min(abs(x2 - x1) >> 1, abs(y2 - y1) >> 1)
    r2 = r * r

    println("cx: $cx, cy: $cy, r: $r, r2: $r2")

    energy_start = Float32(req["frame_start"])
    energy_end = Float32(req["frame_end"])

    println("log-energy start: ", energy_start)
    println("log-energy_end: ", energy_end)

    # viewport dimensions
    dimx = abs(x2 - x1 + 1)
    dimy = abs(y2 - y1 + 1)

    println("dimx: $dimx, dimy: $dimy")

    # get the image
    if image
        pixels, mask, min_count, max_count = getViewport(x, y, energy, x1, x2, y1, y2, energy_start, energy_end)

        println("pixels: ", size(pixels), " mask: ", size(mask), " min_count: ", min_count, " max_count: ", max_count)
    end

    # get the spectrum
    if beam == CIRCLE
        spectrum = getCircleSpectrum(x, y, energy, energy_start, energy_end, cx, cy, r2, num_channels)
    elseif beam == SQUARE
        spectrum = getSquareSpectrum(x, y, energy, energy_start, energy_end, x1, x2, y1, y2, num_channels)
    end

    # optionally downsample the spectrum
    if length(spectrum) > (dx >> 1)
        println("downsampling spectrum from $(length(spectrum)) to $(dx >> 1)")
        spectrum = imresize(spectrum, (dx >> 1,))
    end

    if image
        view_resp = IOBuffer()

        write(view_resp, Int32(dimx))
        write(view_resp, Int32(dimy))

        # compress pixels with ZFP
        prec = ZFP_MEDIUM_PRECISION

        if quality == high
            prec = ZFP_HIGH_PRECISION
        elseif quality == medium
            prec = ZFP_MEDIUM_PRECISION
        elseif quality == low
            prec = ZFP_LOW_PRECISION
        end

        compressed_pixels = zfp_compress(pixels, precision=prec)
        write(view_resp, Int32(length(compressed_pixels)))
        write(view_resp, compressed_pixels)

        compressed_mask = lz4_hc_compress(collect(flatten(UInt8.(mask))))
        write(view_resp, Int32(length(compressed_mask)))
        write(view_resp, compressed_mask)

        write(view_resp, UInt64(min_count))
        write(view_resp, UInt64(max_count))
    end

    spec_resp = IOBuffer()

    # compress spectrum with ZFP
    prec = SPECTRUM_MEDIUM_PRECISION

    if image
        prec = SPECTRUM_HIGH_PRECISION
    end

    compressed_spectrum = zfp_compress(spectrum, precision=prec)

    write(spec_resp, Int32(length(spectrum)))
    write(spec_resp, compressed_spectrum)

    return (view_resp, spec_resp)
end

function getVideoFrame(
    x,
    y,
    energy,
    energy_start::Float64,
    energy_end::Float64,
    inner_width::Integer,
    inner_height::Integer,
    offsetx::Integer,
    offsety::Integer,
    image_width::Integer,
    image_height::Integer,
    bDownsize::Bool,
    keyframe::Bool,
    fill::UInt8,
)
    local frame_pixels, frame_mask
    local pixels, mask
    local dstWidth, dstHeight

    x1 = offsetx
    x2 = offsetx + inner_width - 1
    y1 = offsety
    y2 = offsety + inner_height - 1

    frame_pixels, frame_mask, _, _ = getViewport(x, y, energy, x1, x2, y1, y2, Float32(energy_start), Float32(energy_end))
    max_count = ThreadsX.maximum(frame_pixels)

    dims = size(frame_pixels)
    width = dims[1]
    height = dims[2]

    if bDownsize
        dstWidth = image_width
        dstHeight = image_height
    else
        dstWidth = width
        dstHeight = height
    end

    pixels = Matrix{UInt8}(undef, (dstWidth, dstHeight))
    mask = Matrix{UInt8}(undef, (dstWidth, dstHeight))

    if bDownsize
        pixels =
            round.(
                UInt8,
                clamp.(imresize(frame_pixels, (dstWidth, dstHeight)), 0, 255),
            )

        mask =
            round.(
                UInt8,
                clamp.(
                    imresize(frame_mask, (dstWidth, dstHeight), method=Constant()),
                    0,
                    255,
                ),
            ) # use Nearest-Neighbours for the mask
    else
        if max_count > 0
            pixels = round.(UInt8, clamp.(frame_pixels ./ max_count .* 255, 0, 255))
        else
            pixels .= 0
            pixels[frame_mask] .= UInt8(255)

            println("mask range:", ThreadsX.extrema(frame_mask))
            println("pixels range:", ThreadsX.extrema(pixels))
        end

        # fill pixels with the fill colour where mask is false
        pixels[.!frame_mask] .= fill

        mask = UInt8(255) .* UInt8.(frame_mask)
    end

    return (pixels, mask)
end