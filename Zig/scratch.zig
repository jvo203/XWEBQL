var offset: usize = 0;
var i: usize = 0;

    // go through all the rows
    while (i < meta.NAXIS2) {
        x[i] = std.mem.readIntSliceBig(i16, data[offset + x_offset ..]);
        y[i] = std.mem.readIntSliceBig(i16, data[offset + y_offset ..]);
        upi[i] = @bitCast(f32, std.mem.readIntSliceBig(i32, data[offset + upi_offset ..]));

        i += 1;
        offset += meta.NAXIS1;
    }
