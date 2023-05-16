using CFITSIO

sxs = homedir() * "/NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"
f = fits_open_file(sxs)

num = fits_get_num_hdus(f)
println("Number of HDUs in the file: ", num)

for i = 1:num
    hdu_type = fits_movabs_hdu(f, i)
    println(i, ") hdu_type = ", hdu_type)
end

# move to the first table
fits_movabs_hdu(f, 2)

# read the number of events
nevents = parse(Int32, fits_read_keyword(f, "NAXIS2")[1])
println("nevents = ", nevents)

# prepare data arrays
x = zeros(Int32, nevents)
y = zeros(Int32, nevents)
energy = zeros(Float32, nevents)

@time fits_read_col(f, 40, 1, 1, x)
@time fits_read_col(f, 41, 1, 1, y)
@time fits_read_col(f, 42, 1, 1, energy)

fits_close_file(f)