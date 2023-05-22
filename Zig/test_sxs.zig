const print = @import("std").debug.print;
const std = @import("std");

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

fn read_sxs_events(filename: []const u8) i32 {
    print("reading {s}\n", .{filename});
    return 0;
}

pub fn main() void {
    const event_filename = "../../../NAO/JAXA/ah100040060sxs_p0px1010_cl.evt";
    print("event_filename = {s}\n", .{event_filename});

    const start = std.time.nanoTimestamp();

    _ = read_sxs_events(event_filename);

    var duration: f64 = @intToFloat(f64, std.time.nanoTimestamp() - start);
    duration /= 1_000_000;

    std.debug.print("Zig elapsed time: {d:.6} ms\n", .{duration});
}
