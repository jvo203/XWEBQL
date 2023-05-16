using FITSIO

sxs = homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
f = FITS(sxs)

for hdu in f
    println(typeof(hdu))
end

x_t = @async begin
	global x
	x = read(f[2], "X")
end

y_t = @async begin
	global y
	y = read(f[2], "Y")
end

e_t = @async begin
	global energy
	energy = read(f[2], "UPI")
end

@time wait.([x_t, y_t, e_t])

nevents = length(x)
println("nevents = ", nevents)

# right now the high-level FITSIO does not support 'X' columns
