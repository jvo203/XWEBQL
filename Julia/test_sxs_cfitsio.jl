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

@time begin
    # prepare data arrays
    x = Vector{Int32}(undef, nevents)
    y = Vector{Int32}(undef, nevents)
    energy = Vector{Float32}(undef, nevents)

    fits_read_col(f, 40, 1, 1, x)
    fits_read_col(f, 41, 1, 1, y)
    fits_read_col(f, 42, 1, 1, energy)
end

fits_close_file(f)