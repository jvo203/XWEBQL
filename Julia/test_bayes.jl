# Set the library path
@static if Sys.isapple()
    forlib = "../fbh.dylib"
end

@static if Sys.islinux()
    forlib = "../fbh.so"
end

@static if Sys.iswindows()
    error("Unsupported OS: Windows")
end

# type(c_ptr) function fast_bayesian_binning(energy, n, resolution) bind(c)
function FastBayesianBinning(x::Vector{Float32}, n::Int64, resolution::Int32=Int32(512))
    return @ccall forlib.fast_bayesian_binning(x::Ref{Float32}, n::Ref{Clonglong}, resolution::Ref{Cint})::Ptr{Cvoid}
end

# subroutine delete_blocks(ptr) bind(C)
#    type(c_ptr), value :: ptr
function DeleteBlocks(ptr::Ptr{Cvoid})
    #return @ccall forlib.delete_blocks(ptr::Ptr{Cvoid})::Nothing
    return @ccall forlib.delete_blocks(ptr::Ref{Cvoid})::Nothing
end

const XRISM_RESOLVE_Pi2evFactor = 0.5f0

# using a local debug version of BayesHistogram.jl
include("BayesHistogram_debug.jl")

using .BayesHistogram
using DelimitedFiles
using FITSIO

Resolve = "file://" * homedir() * "/NAO/JAXA/XRISM/MAXI_J1744-294/xa901002010rsl_p0px5000_cl.evt.gz"
println(Resolve)
f = FITS(Resolve)

for hdu in f
    println(typeof(hdu))
end

# list column names in the second HDU
println(FITSIO.colnames(f[2]))
energy = Float32.(read(f[2], "PI")) .* XRISM_RESOLVE_Pi2evFactor

# delete the FITS file
close(f)
println("FITS file closed")

nevents = length(energy)
println("nevents = ", nevents)

# take the energy between 0.5 and 20 keV
energy = energy[(energy.>500.0).&(energy.<10000.0)]
nevents = length(energy)
println("nevents = ", nevents)

@time bl = BayesHistogram.bayesian_blocks(energy, resolution=512)
println("centers = ", bl.centers)
println("widths = ", bl.widths)
println("heights = ", bl.heights)

# export the energy to a text file
writedlm("energy.txt", energy)

@time blocks = FastBayesianBinning(energy, length(energy))
println("Fortran blocks = ", blocks)

# delete the blocks
DeleteBlocks(blocks)
println("Fortran blocks deleted")
