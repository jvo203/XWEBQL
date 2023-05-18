using Mmap

filename = homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
io = open(filename, "r+")
sxs = Mmap.mmap(io, Vector{UInt8})
close(io)

println(typeof(sxs))
println(length(sxs))

function get_string(value)
    # get location of the first and second single quote
    start = findfirst("'", value)[1]
    stop = findlast("'", value)[1]

    # trim and return the string between the quotes
    return strip(value[start+1:stop-1])
end

function get_num_bytes(type)
    # get the number of bytes for the data type
    if type[end] == 'L'
        # logical (Boolean)
        num_bytes = parse(Int, type[1:end-1])
    elseif type[end] == 'X'
        # bit array (rounded to the nearest byte)
        num_bytes = Int(max(parse(Int, type[1:end-1]) / 8, 1))
    elseif type[end] == 'B'
        # Unsigned byte
        num_bytes = parse(Int, type[1:end-1])
    elseif type[end] == 'I'
        # 16-bit integer
        num_bytes = 2 * parse(Int, type[1:end-1])
    elseif type[end] == 'J'
        # 32-bit integer
        num_bytes = 4 * parse(Int, type[1:end-1])
    elseif type[end] == 'K'
        # 64-bit integer
        num_bytes = 8 * parse(Int, type[1:end-1])
    elseif type[end] == 'A'
        # character
        num_bytes = parse(Int, type[1:end-1])
    elseif type[end] == 'E'
        # single-precision float (32-bit)
        num_bytes = 4 * parse(Int, type[1:end-1])
    elseif type[end] == 'D'
        # double-precision float (64-bit)
        num_bytes = 8 * parse(Int, type[1:end-1])
    elseif type[end] == 'C'
        # single-precision complex
        num_bytes = 8 * parse(Int, type[1:end-1])
    elseif type[end] == 'M'
        # double-precision complex
        num_bytes = 16 * parse(Int, type[1:end-1])
    else
        # unknown
        throw(ArgumentError("Unhandled data type: $type"))
    end

    return num_bytes
end

function has_end(chunk::Vector{UInt8})
    header = String(chunk)
    if findfirst("END", header) !== nothing
        return true
    else
        return false
    end
end

function has_table(chunk::Vector{UInt8})
    header = String(chunk)
    if findfirst("XTENSION= 'BINTABLE'", header) !== nothing
        return true
    else
        return false
    end
end

function process_header(chunk::Vector{UInt8})
    header = String(chunk)
    has_end = false

    # divide the header into lines 80-character long
    lines = [header[i:i+79] for i in 1:80:length(header)-79]

    if findfirst("END", header) !== nothing
        has_end = true
    end

    # println("has_end = ", has_end)

    # split each line into a key and a value
    lines = [split(line, "=") for line in lines]

    # remove leading and trailing whitespace from each key and value
    lines = [[strip(s) for s in line] for line in lines]

    # println(lines)

    # remove empty (1-element) lines
    lines = filter(line -> length(line) > 1, lines)

    # convert the lines into a Dict
    header = Dict(lines)
    return (header, has_end)
end

counter = 0

# find the table
@time begin
    global counter
    global sxs

    while !has_table(sxs[counter*2880+1:(counter+1)*2880])
        global counter
        counter += 1
    end

    # counter += 1 # this is only needed by "has_end"
end
println("counter = ", counter)

# OK, we should be at the start of the second HDU
header = Dict()
@time begin
    local has_end = false

    while !has_end
        global counter, header, sxs
        new_header, has_end = process_header(sxs[counter*2880+1:(counter+1)*2880])
        merge!(header, new_header)
        counter += 1
    end
end

#println("header = ", header)
println("counter = ", counter)

# the table data starts here
# get NAXIS2 and TFIELDS
NAXIS2 = parse(Int, header["NAXIS2"])
TFIELDS = parse(Int, header["TFIELDS"])

println("NAXIS2 = ", NAXIS2)
println("TFIELDS = ", TFIELDS)

# iterate through TTYPE1, TFORM1, TUNIT1, etc.
# to get the column names, data types, and units
column_names = []
column_types = []

for i in 1:TFIELDS
    global column_names, column_types, header

    try
        name = get_string(header["TTYPE$i"])
        type = get_string(header["TFORM$i"])
        column_names = [column_names; name]
        column_types = [column_types; type]
    catch KeyError
        println("KeyError: ", i)
    end
end

println("column_names = ", column_names)
println("column_types = ", column_types)

get_num_bytes.(column_types)