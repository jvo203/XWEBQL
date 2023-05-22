const std = @import("std");

pub fn main() void {
    std.debug.print("Testing Reading X-Ray SXS event files\n", .{});

    const start = std.time.nanoTimestamp();

    var duration: f64 = @intToFloat(f64, std.time.nanoTimestamp() - start);
    duration /= 1_000_000;

    std.debug.print("Zig elapsed time: {d:.6} ms\n", .{duration});
}