using FITSIO

sxs = homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
f = FITS(sxs)

for hdu in f
    println(typeof(hdu))
end

@time x = read(f[2], "X")
@time y = read(f[2], "Y")
@time energy = read(f[2], "UPI")

nevents = length(x)
println("nevents = ", nevents)

# right now the high-level FITSIO does not support 'X' columns