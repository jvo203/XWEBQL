const print = @import("std").debug.print;
const std = @import("std");

pub fn main() void {
    const event_filename = "../../../NAO/JAXA/ah100040060sxs_p0px1010_cl.evt";
    print("event_filename = {s}\n", .{event_filename});

    const start = std.time.nanoTimestamp();

    var duration: f64 = @intToFloat(f64, std.time.nanoTimestamp() - start);
    duration /= 1_000_000;

    std.debug.print("Zig elapsed time: {d:.6} ms\n", .{duration});
}