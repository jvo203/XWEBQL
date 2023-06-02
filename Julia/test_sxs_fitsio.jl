using FITSIO
using FHist
using Plots

function truncate_spectrum(spectrum::Vector{Int64})
    # find the first non-zero bin from the end
    i = length(spectrum)
    while i > 0 && spectrum[i] == 0
        i -= 1
    end

    return spectrum[1:i]
end

function get_spectrum(data::Vector{Float32}, E_min::Float32, E_max::Float32, ΔE_min::Float32, dx::Int32)
    local new_spectrum, max_energy, ΔE::Float32

    #ΔE = max(ΔE_min, (E_max - E_min) / dx)
    ΔE = (E_max - E_min) / dx
    println("ΔE = ", ΔE)

    max_energy = E_max

    while ΔE >= ΔE_min
        # prepare the histogram
        h1 = Hist1D(data, E_min:ΔE:max_energy, overflow=false)
        spectrum = bincounts(h1)
        new_spectrum = truncate_spectrum(spectrum)
        new_length = length(new_spectrum)

        if new_length == length(spectrum)
            break
        end

        # get the upper energy limit based on the new spectrum
        max_energy = E_min + ΔE * new_length
        println("max_energy = ", max_energy)

        #ΔE = max(ΔE_min, (max_energy - E_min) / dx)
        ΔE = (max_energy - E_min) / dx
        println("ΔE = ", ΔE)

        h1 = Hist1D(data, E_min:ΔE:max_energy, overflow=false)
        spectrum = bincounts(h1)
    end

    return (new_spectrum, max_energy)
end

sxs = "file://" * homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
println(sxs)
f = FITS(sxs)

for hdu in f
    println(typeof(hdu))
end

@time begin
    x = read(f[2], "X")
    y = read(f[2], "Y")
    energy = read(f[2], "UPI")
end

nevents = length(x)
println("nevents = ", nevents)

# right now the high-level FITSIO does not support 'X' columns

# prepare the pixels, mask and histogram
width = 2430
height = 2430

pixel_counts = zeros(Int32, width, height)

ΔE = Float32(500.0) # eV
E_min = Float32(0.0) # eV
E_max = Float32(1000.0) * 2^10 # eV

@time h1 = Hist1D(energy, E_min:ΔE:E_max, overflow=false)
spectrum = bincounts(h1)
#println(spectrum)

@time (spectrum, E_max) = get_spectrum(energy, E_min, E_max, Float32(10.0), Int32(1024))

println("E_max = ", E_max)

@time h2 = Hist2D((x, y), (minimum(x)-0.5:1:maximum(x)+0.5, minimum(y)-0.5:1:maximum(y)+0.5))
#@time h2 = Hist2D((x, y), (0.5:1:width+0.5, 0.5:1:height+0.5))
pixels = bincounts(h2)

println("size(pixels) = ", size(pixels))

plot(log.(spectrum))
#heatmap(log.(pixels))