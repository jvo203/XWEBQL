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

# real(kind=c_float) function fast_bayesian_histogram(energy, n) bind(c)
function FastBayesianHistogram(x::Vector{Float32}, n::Int64)
    return @ccall forlib.fast_bayesian_histogram(x::Ref{Float32}, n::Ref{Clonglong})::Float32
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

@time println("Julia:", sum(energy))
@time println("Fortran:", FastBayesianHistogram(energy, length(energy)))