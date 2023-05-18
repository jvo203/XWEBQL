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

function get_row_bytes(type)
    local num_bytes = 0

    # get the number of bytes for the data type
    if type[end] == 'L'
        # logical (Boolean)
        try
            num_bytes = parse(Int, type[1:end-1])
        catch
            num_bytes = 1
        end
    elseif type[end] == 'X'
        # bit array (rounded to the nearest byte)
        try
            num_bytes = Int(max(parse(Int, type[1:end-1]) / 8, 1))
        catch
            num_bytes = 1
        end
    elseif type[end] == 'B'
        # Unsigned byte
        num_bytes = parse(Int, type[1:end-1])
    elseif type[end] == 'I'
        # 16-bit integer
        try
            num_bytes = 2 * parse(Int, type[1:end-1])
        catch
            num_bytes = 2
        end
    elseif type[end] == 'J'
        # 32-bit integer
        try
            num_bytes = 4 * parse(Int, type[1:end-1])
        catch
            num_bytes = 4
        end
    elseif type[end] == 'K'
        # 64-bit integer
        try
            num_bytes = 8 * parse(Int, type[1:end-1])
        catch
            num_bytes = 8
        end
    elseif type[end] == 'A'
        # character
        try
            num_bytes = parse(Int, type[1:end-1])
        catch
            num_bytes = 1
        end
    elseif type[end] == 'E'
        # single-precision float (32-bit)
        try
            num_bytes = 4 * parse(Int, type[1:end-1])
        catch
            num_bytes = 4
        end
    elseif type[end] == 'D'
        # double-precision float (64-bit)
        try
            num_bytes = 8 * parse(Int, type[1:end-1])
        catch
            num_bytes = 8
        end
    elseif type[end] == 'C'
        # single-precision complex
        try
            num_bytes = 8 * parse(Int, type[1:end-1])
        catch
            num_bytes = 8
        end
    elseif type[end] == 'M'
        # double-precision complex
        try
            num_bytes = 16 * parse(Int, type[1:end-1])
        catch
            num_bytes = 16
        end
    else
        # unknown
        throw(ArgumentError("Unhandled data type: $type"))
    end

    return num_bytes
end

function get_row_types(type)
    local row_type = Any

    # get the number of bytes for the data type
    if type[end] == 'L'
        # logical (Boolean)
        row_type = Bool
    elseif type[end] == 'X'
        # bit array
        row_type = BitVector
    elseif type[end] == 'B'
        # Unsigned byte
        row_type = UInt8
    elseif type[end] == 'I'
        # 16-bit integer
        row_type = Int16
    elseif type[end] == 'J'
        # 32-bit integer
        row_type = Int32
    elseif type[end] == 'K'
        # 64-bit integer
        row_type = Int64
    elseif type[end] == 'A'
        # character
        row_type = Char
    elseif type[end] == 'E'
        # single-precision float (32-bit)
        row_type = Float32
    elseif type[end] == 'D'
        # double-precision float (64-bit)
        row_type = Float64
    elseif type[end] == 'C'
        # single-precision complex
        row_type = ComplexF32
    elseif type[end] == 'M'
        # double-precision complex
        row_type = ComplexF64
    else
        # unknown
        throw(ArgumentError("Unhandled data type: $type"))
    end

    return row_type
end

function find_column(columns, name)
    for (i, column) in enumerate(columns)
        if column == name
            return i
        end
    end

    return nothing
end

function end_header(lines)
    indexes = findall(x -> startswith(x, "END"), lines)

    # check if indexes is empty
    if isempty(indexes)
        return false
    else
        return true
    end
end

function has_end(chunk::Vector{UInt8})
    header = String(chunk)

    # divide the header into lines 80-character long
    lines = [header[i:i+79] for i in 1:80:length(header)-79]

    return end_header(lines)
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

    # find "END" in the vector of lines
    has_end = end_header(lines)

    # println("has_end = ", has_end)

    # split each line into a key and a value
    lines = [split(line, "=") for line in lines]

    # remove leading and trailing whitespace from each key and value
    lines = [[strip(s) for s in line] for line in lines]

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

# get NAXIS1, NAXIS2 and TFIELDS
NAXIS1 = parse(Int, header["NAXIS1"])
NAXIS2 = parse(Int, header["NAXIS2"])
TFIELDS = parse(Int, header["TFIELDS"])

println("NAXIS1 = ", NAXIS1)
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

row_bytes = get_row_bytes.(column_types)
println("row_bytes = ", row_bytes)

row_types = get_row_types.(column_types)
println("row_types = ", row_types)

#=
# skip another header
@time begin
    global counter
    global sxs

    while !has_end(sxs[counter*2880+1:(counter+1)*2880])
        global counter
        counter += 1
    end

    counter += 1 # this is only needed by "has_end"
end
=#
println("counter = ", counter)

# the table data starts here
data_start = counter * 2880 + 1
data = @view sxs[data_start:data_start+NAXIS2*NAXIS1-1]

# get the "X", "Y" and "UPI" columns
idx = find_column(column_names, "X")
idy = find_column(column_names, "Y")
idupi = find_column(column_names, "UPI")

println("idx = ", idx)
println("idy = ", idy)
println("idupi = ", idupi)