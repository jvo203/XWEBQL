const print = @import("std").debug.print;
const std = @import("std");
const Allocator = std.mem.Allocator;

const FITS_CHUNK_LENGTH = 2880;
const FITS_LINE_LENGTH = 80;

const XEvents = struct {
    NAXIS1: usize,
    NAXIS2: usize,
    TFIELDS: usize,
    ix: i32,
    iy: i32,
    iupi: i32,
    columns: []i32,
};

fn hdr_get_int_value(line: []const u8) !i32 {
    const str = std.mem.trim(u8, line[10..FITS_LINE_LENGTH], " \r\n\t");
    return try std.fmt.parseInt(i32, str, 10);
}

fn hdr_get_string_value(line: []const u8) ?[]const u8 {
    const str = line[10..FITS_LINE_LENGTH];

    // find the enclosing '' in str
    const pos1 = std.mem.indexOf(u8, str, "'");

    if (pos1) |p1| {
        const pos2 = std.mem.lastIndexOf(u8, str, "'");

        if (pos2) |p2| {
            return std.mem.trim(u8, str[p1 + 1 .. p2], " \r\n\t");
        } else {
            return null;
        }
    } else {
        return null;
    }
}

fn get_column_size(columnType: []const u8) i32 {
    const last = columnType[columnType.len - 1];
    const num = std.fmt.parseInt(i32, columnType[0 .. columnType.len - 1], 10) catch 0;

    // logical (Boolean)
    if (last == 'L') {
        return @max(1, num);
    } else
    // bit array (rounded to the nearest byte)
    if (last == 'X') {
        return @max(1, @divFloor(num + 7, 8));
    } else
    // Unsigned byte
    if (last == 'B') {
        return @max(1, num);
    } else
    // 16-bit integer
    if (last == 'I') {
        return 2 * @max(1, num);
    } else
    // 32-bit integer
    if (last == 'J') {
        return 4 * @max(1, num);
    } else
    // 64-bit integer
    if (last == 'K') {
        return 8 * @max(1, num);
    } else
    // character
    if (last == 'A') {
        return @max(1, num);
    } else
    // single-precision float (32-bit)
    if (last == 'E') {
        return 4 * @max(1, num);
    } else
    // double-precision float (64-bit)
    if (last == 'D') {
        return 8 * @max(1, num);
    } else
    // single-precision complex
    if (last == 'C') {
        return 8 * @max(1, num);
    } else
    // double-precision complex
    if (last == 'M') {
        return 16 * @max(1, num);
    } else return 0;
}

fn has_table_extension(header: []const u8) bool {
    return std.mem.eql(u8, header[0..20], "XTENSION= 'BINTABLE'");
}

fn scan_table_header(header: []const u8, events: *XEvents, allocator: Allocator) !bool {

    // process the header one line at a time
    var i: usize = 0;

    while (i < header.len) {
        const line = header[i .. i + FITS_LINE_LENGTH];
        i += FITS_LINE_LENGTH;

        // detect the "END" keyword
        if (std.mem.eql(u8, line[0..10], "END       ")) {
            return true;
        }

        // get the "NAXIS1" keyword
        if (std.mem.eql(u8, line[0..10], "NAXIS1  = ")) {
            events.NAXIS1 = @intCast(usize, try hdr_get_int_value(line));
        }

        // get the "NAXIS2" keyword
        if (std.mem.eql(u8, line[0..10], "NAXIS2  = ")) {
            events.NAXIS2 = @intCast(usize, try hdr_get_int_value(line));
        }

        // get the "TFIELDS" keyword
        if (std.mem.eql(u8, line[0..10], "TFIELDS = ")) {
            events.TFIELDS = @intCast(usize, try hdr_get_int_value(line));

            // allocate the columns array
            if (events.TFIELDS > 0) {
                events.columns = try allocator.alloc(i32, events.TFIELDS);
            }
        }

        // detect the TTYPEXX lines
        if (std.mem.eql(u8, line[0..5], "TTYPE")) {
            // find the first " " in line
            const pos = std.mem.indexOf(u8, line, " ");

            if (pos) |j| {
                const str = line[5..j];
                const index = try std.fmt.parseInt(i32, str, 10);
                const value = hdr_get_string_value(line);

                if (value) |column| {
                    // test column for "X", "Y" and "UPI"
                    if (std.mem.eql(u8, column, "X")) {
                        events.ix = index;
                    } else if (std.mem.eql(u8, column, "Y")) {
                        events.iy = index;
                    } else if (std.mem.eql(u8, column, "UPI")) {
                        events.iupi = index;
                    }
                }
            }
        }

        // detect the TFORMXX lines
        if (std.mem.eql(u8, line[0..5], "TFORM")) {
            // find the first " " in line
            const pos = std.mem.indexOf(u8, line, " ");

            if (pos) |j| {
                const str = line[5..j];
                const index = try std.fmt.parseInt(i32, str, 10);

                const value = hdr_get_string_value(line);
                if (value) |columnType| {
                    // get the type size
                    const size = get_column_size(columnType);
                    events.columns[@intCast(usize, index - 1)] = size;
                }
            }
        }
    }

    //print("|{s}|\n", .{line[10..FITS_LINE_LENGTH]});

    return false;
}

fn get_column_offset(columns: []i32, index: i32) usize {
    var offset: i32 = 0;
    var i: usize = 0;

    while (i < index) {
        offset += columns[@intCast(usize, i)];
        i += 1;
    }

    return @intCast(usize, offset);
}

fn read_sxs_events(filename: []const u8, allocator: Allocator) !XEvents {

    // open the file, get a file descriptor
    const fd = try std.os.open(filename, std.c.O.RDONLY, 0);
    defer std.os.close(fd);

    // get the file size via fstat
    const stats = try std.os.fstat(fd);

    // mmap the event file
    const sxs = try std.os.mmap(
        null,
        @intCast(usize, stats.size),
        std.os.PROT.READ,
        std.os.MAP.PRIVATE,
        fd,
        0,
    );

    // finally unmap the event file
    defer std.os.munmap(sxs);

    var sxs_offset: usize = 0;
    var has_table: bool = false;

    // first find the binary table extension
    while (sxs_offset < stats.size) {
        const header = sxs[sxs_offset .. sxs_offset + FITS_CHUNK_LENGTH];

        if (has_table_extension(header)) {
            has_table = true;
            break;
        }

        sxs_offset += FITS_CHUNK_LENGTH;
    }

    if (!has_table) {
        std.debug.print("critical error: no table extension found\n", .{});
        return error.Oops;
    }

    var events = XEvents{ .NAXIS1 = undefined, .NAXIS2 = undefined, .TFIELDS = undefined, .ix = undefined, .iy = undefined, .iupi = undefined, .columns = undefined };

    // scan the table header
    while (sxs_offset < stats.size) {
        const header = sxs[sxs_offset .. sxs_offset + FITS_CHUNK_LENGTH];
        sxs_offset += FITS_CHUNK_LENGTH;

        if (try scan_table_header(header, &events, allocator)) {
            break;
        }
    }

    // print the XEvents struct
    print("NAXIS1 = {d}\n", .{events.NAXIS1});
    print("NAXIS2 = {d}\n", .{events.NAXIS2});
    print("TFIELDS = {d}\n", .{events.TFIELDS});
    print("ix:{d}, iy:{d}, iupi:{d}\n", .{ events.ix, events.iy, events.iupi });

    // sum the events.columns array
    var bytes_per_row: i32 = 0;
    for (events.columns) |column| {
        bytes_per_row += column;
    }

    if (bytes_per_row != events.NAXIS1) {
        std.debug.print("critical error: bytes_per_row != NAXIS1\n", .{});
        return error.Oops;
    }

    const x_offset = get_column_offset(events.columns, events.ix - 1);
    const y_offset = get_column_offset(events.columns, events.iy - 1);
    const upi_offset = get_column_offset(events.columns, events.iupi - 1);

    print("x_offset = {d}, y_offset = {d}, upi_offset = {d}\n", .{ x_offset, y_offset, upi_offset });

    // allocate the arrays
    const x = try allocator.alloc(i16, events.NAXIS2);
    const y = try allocator.alloc(i16, events.NAXIS2);
    const upi = try allocator.alloc(f32, events.NAXIS2);

    // sxs_offset now points to the start of the binary data
    const data = sxs[sxs_offset .. sxs_offset + events.NAXIS2 * events.NAXIS1];

    var offset: usize = 0;
    var i: usize = 0;

    // go through all the rows
    while (i < events.NAXIS2) {
        const x_arr = data[offset + x_offset .. offset + x_offset + 2];
        const y_arr = data[offset + y_offset .. offset + y_offset + 2];
        const upi_arr = data[offset + upi_offset .. offset + upi_offset + 4];

        x[i] = std.mem.readIntSliceBig(i16, x_arr);
        y[i] = std.mem.readIntSliceBig(i16, y_arr);
        const upi_value = std.mem.readIntSliceBig(i32, upi_arr);
        upi[i] = @bitCast(f32, upi_value);

        i += 1;
        offset += events.NAXIS1;
    }

    return events;
}

pub fn main() !void {
    const event_filename = "../../../NAO/JAXA/ah100040060sxs_p0px1010_cl.evt";
    print("event_filename = {s}\n", .{event_filename});

    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();

    const allocator = arena.allocator();

    const start = std.time.nanoTimestamp();
    const events = try read_sxs_events(event_filename, allocator);
    var duration: f64 = @intToFloat(f64, std.time.nanoTimestamp() - start);
    duration /= 1_000_000;

    std.debug.print("Zig elapsed time: {d:.6} ms\n", .{duration});

    const num_events = events.NAXIS2;
    std.debug.print("num_events = {d}\n", .{num_events});
}
