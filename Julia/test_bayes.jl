include("FORTRAN.jl")

struct FastBayesHistogram
    edges::Ptr{Float32}
    centers::Ptr{Float32}
    widths::Ptr{Float32}
    heights::Ptr{Float32}
    n::Cint
end

FastBayesHistogram(hist::Ptr{FastBayesHistogram}) = unsafe_load(hist)

# type(c_ptr) function fast_bayesian_binning(energy, n, resolution) bind(c)
function FastBayesianBinning(x::Vector{Float32}, n::Integer, resolution::Integer=512)
    return ccall(fast_bayesian_binning_fptr, Ptr{FastBayesHistogram},
        (Ref{Float32}, Ref{Clonglong}, Ref{Cint}),
        x, Int64(n), Int32(resolution))
end

# subroutine delete_blocks(ptr) bind(C)
#    type(c_ptr), value :: ptr
function DeleteBlocks(ptr::Ptr{FastBayesHistogram})
    return ccall(delete_blocks_fptr, Nothing,
        (Ref{FastBayesHistogram},),
        ptr)
end

const XRISM_RESOLVE_Pi2evFactor = 0.5f0

# using a local debug version of BayesHistogram.jl
include("BayesHistogram.jl")

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
@time bl = BayesHistogram.bayesian_blocks(energy, resolution=512)
println("centers = ", bl.centers)
println("widths = ", bl.widths)
println("heights = ", bl.heights)

# export the energy to a text file
writedlm("energy.txt", energy)

@time blocks = FastBayesianBinning(energy, length(energy), Int32(512))
println("Fortran blocks = ", blocks)

hist = FastBayesHistogram(blocks)
println("Fortran histogram n = ", hist.n)

if hist.n > 0
    println("Fortran histogram edges = ", unsafe_wrap(Array, hist.edges, hist.n + 1))
    println("Fortran histogram centers = ", unsafe_wrap(Array, hist.centers, hist.n))
    println("Fortran histogram widths = ", unsafe_wrap(Array, hist.widths, hist.n))
    println("Fortran histogram heights = ", unsafe_wrap(Array, hist.heights, hist.n))
end

# delete the blocks
DeleteBlocks(blocks)
println("Fortran blocks deleted")
