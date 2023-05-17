using Mmap

filename = homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
io = open(filename, "r+")
sxs = Mmap.mmap(io, Vector{UInt8})

println(typeof(sxs))
println(length(sxs))

# convert Vector{UInt8} to String

function process_header_copilot(chunk)
    # convert Vector{UInt8} to String
    header = String(chunk)
    # split the header into lines
    lines = split(header, "\n")
    # remove the last line
    lines = lines[1:end-1]
    # remove the first line
    lines = lines[2:end]
    # remove the last 3 characters from each line
    lines = [line[1:end-3] for line in lines]
    # split each line into a key and a value
    lines = [split(line, "=") for line in lines]
    # remove leading and trailing whitespace from each key and value
    lines = [[strip(s) for s in line] for line in lines]
    # convert the lines into a Dict
    header = Dict(lines)
    return header
end

function has_end(chunk::Vector{UInt8})
    header = String(chunk)
    if findfirst("END", header) !== nothing
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

    println("has_end = ", has_end)

    # split each line into a key and a value
    lines = [split(line, "=") for line in lines]

    # remove leading and trailing whitespace from each key and value
    lines = [[strip(s) for s in line] for line in lines]

    # remove empty (1-element) lines
    lines = filter(line -> length(line) > 1, lines)

    # convert the lines into a Dict
    header = Dict(lines)
    return header
end

counter = 0


# skip the first HDU
@time begin
    global counter

    while !has_end(sxs[counter*2880+1:(counter+1)*2880])
        counter += 1
    end
end
println("counter = ", counter)

#@time process_header(chunk)