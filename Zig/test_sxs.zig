const print = @import("std").debug.print;
const std = @import("std");
const Allocator = std.mem.Allocator;

const FITS_CHUNK_LENGTH = 2880;
const FITS_LINE_LENGTH = 80;

const XEvents = struct {
    NAXIS1: i32,
    NAXIS2: i32,
    TFIELDS: i32,
    ix: i32,
    iy: i32,
    iupi: i32,
    columns: []i32,
};

// create a read_sxs_events function that takes a filename and returns a tuple with x,y,energy arrays
//fn read_sxs_events(filename: []const u8) (x: []f32, y: []f32, energy: []f32) {
//   const std = @import("std");
//  const io = std.io;
// const mem = std.mem;
// const os = std.os;
// const path = std.path;
// const strconv = std.strconv;
// const testing = std.testing;

//var file = try io.readFile(filename);
//defer file.deinit();

//var parser = try strconv.utf8.parseFile(file);
//defer parser.deinit();

//    var x: []f32 = undefined;
//   var y: []f32 = undefined;
//  var energy: []f32 = undefined;

//    while (parser.next()) |line| {
//       var line = line;
//      if (line.len == 0) {
//         continue;
//    }
//   if (line[0] == '#') {
//      continue;
// }
// var x_str = try line.split(" ")[0];
// var y_str = try line.split(" ")[1];
// var energy_str = try line.split(" ")[2];

//var x_f32 = try strconv.parseFloat(f32, x_str);
//var y_f32 = try strconv.parseFloat(f32, y_str);
//var energy_f32 = try strconv.parseFloat(f32, energy_str);

//if (x == undefined) {
//   x = try mem.slice(f32, parser.allocator, 0, 1);
//} else {
//   x = try mem.slice(f32, parser.allocator, x, x.len + 1);
// }
//if (y == undefined) {
//   y = try mem.slice(f32, parser.allocator, 0, 1);
//} else {
//   y = try mem.slice(f32, parser.allocator, y, y.len + 1);
// }
//if (energy == undefined) {
//   energy = try mem.slice(f32, parser.allocator, 0, 1);
//} else {
//   energy = try mem.slice(f32, parser.allocator, energy, energy.len + 1);
//}

//x[x.len - 1] = x_f32;
//y[y.len - 1] = y_f32;
//energy[energy.len - 1] = energy_f32;
//}

//return (x, y, energy);
//}

fn hdr_get_int_value(line: []const u8) !i32 {
    const str = std.mem.trim(u8, line[10..FITS_LINE_LENGTH], " \r\n\t");
    return try std.fmt.parseInt(i32, str, 10);
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
            events.NAXIS1 = try hdr_get_int_value(line);
        }

        // get the "NAXIS2" keyword
        if (std.mem.eql(u8, line[0..10], "NAXIS2  = ")) {
            events.NAXIS2 = try hdr_get_int_value(line);
        }

        // get the "TFIELDS" keyword
        if (std.mem.eql(u8, line[0..10], "TFIELDS = ")) {
            events.TFIELDS = try hdr_get_int_value(line);

            // allocate the columns array
            if (events.TFIELDS > 0) {
                events.columns = try allocator.alloc(i32, @intCast(usize, events.TFIELDS));
            }
        }
    }

    //print("|{s}|\n", .{line[10..FITS_LINE_LENGTH]});

    return false;
}

fn read_sxs_events(filename: []const u8, allocator: Allocator) !i32 {

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

    // sxs_offset now points to the start of the data

    // print the first 5 characters in sxs data part
    print("{s}\n", .{sxs[sxs_offset .. sxs_offset + 5]});

    return 0;
}

pub fn main() !void {
    const event_filename = "../../../NAO/JAXA/ah100040060sxs_p0px1010_cl.evt";
    print("event_filename = {s}\n", .{event_filename});

    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();

    const allocator = arena.allocator();

    const start = std.time.nanoTimestamp();
    const num_events = try read_sxs_events(event_filename, allocator);
    var duration: f64 = @intToFloat(f64, std.time.nanoTimestamp() - start);
    duration /= 1_000_000;

    std.debug.print("num_events = {d}, zig elapsed time: {d:.6} ms\n", .{ num_events, duration });
}
