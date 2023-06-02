using FITSIO
using FHist
using Plots

sxs = "file://" * homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
println(sxs)
f = FITS(sxs)

for hdu in f
    println(typeof(hdu))
end

@time begin
    x = read(f[2], "X")
    y = read(f[2], "Y")
    energy = read(f[2], "UPI") / 1000.0
end

nevents = length(x)
println("nevents = ", nevents)

# right now the high-level FITSIO does not support 'X' columns

# prepare the pixels, mask and histogram
width = 2430
height = 2430

pixel_counts = zeros(Int32, width, height)

ΔE = 0.5 # keV
Emin = 0.0 # keV
Emax = 2^8 - 1.0 # keV

@time h1 = Hist1D(energy, Emin:ΔE:Emax, overflow=true)
spectrum = bincounts(h1)
println(spectrum)

#@time h2 = Hist2D((x, y), (minimum(x):1:maximum(x), minimum(y):1:maximum(y)))
@time h2 = Hist2D((x, y), (0:1:width, 0:1:height))
pixels = bincounts(h2)

println("size(pixels) = ", size(pixels))

plot(log.(spectrum))
#heatmap(log.(pixels))