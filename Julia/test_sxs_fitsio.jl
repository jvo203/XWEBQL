using FITSIO

sxs = homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
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
