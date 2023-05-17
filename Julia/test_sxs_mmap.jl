using Mmap

filename = homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
io = open(filename, "r+")
sxs = Mmap.mmap(io, Vector{UInt8})

println(typeof(sxs))
println(length(sxs))

# convert Vector{UInt8} to String
println(String(sxs[1:2880]))