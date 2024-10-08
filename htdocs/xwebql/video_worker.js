// #define IS_NAL_UNIT_START(buffer_ptr) (!buffer_ptr[0] && !buffer_ptr[1] && !buffer_ptr[2] && (buffer_ptr[3] == 1))
function is_nal_unit_start(buffer_ptr) {
    return (!buffer_ptr[0] && !buffer_ptr[1] && !buffer_ptr[2] && (buffer_ptr[3] == 1));
}

// #define IS_NAL_UNIT_START1(buffer_ptr) (!buffer_ptr[0] && !buffer_ptr[1] && (buffer_ptr[2] == 1))
function is_nal_unit_start1(buffer_ptr) {
    return (!buffer_ptr[0] && !buffer_ptr[1] && (buffer_ptr[2] == 1));
}

// #define GET_H265_NAL_UNIT_TYPE(buffer_ptr) ((buffer_ptr[0] & 0x7E) >> 1)
function get_h265_nal_unit_type(byte) {
    return ((byte & 0x7E) >> 1);
}

function demux(buffer) {
    let result = [];
    //let view = new DataView(buffer);
    let view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 0;

    let next_offset = 100;
    while (offset < buffer.byteLength) {
        while (next_offset < buffer.byteLength) {
            if (next_offset > (buffer.byteLength - 4) || view.getUint32(next_offset, false) == 0x1) {
                break;
            }
            next_offset++;
        }
        result.push(buffer.slice(offset, next_offset));
        //console.log(`Offset: ${offset}`);
        offset = next_offset;
        next_offset = offset + 4;
    }
    return result;//.slice(0, 100);        
}

console.log('WebCodecs API Video Worker initiated');

var timestamp = 0; // [microseconds]
var first = true;
var frame_buffer = [];

self.addEventListener('message', function (e) {
    try {
        let data = e.data;
        console.log('WebCodecs API Video Worker message received:', data);

        if (data.type == "init_video") {
            timestamp = 0;
            first = true;
            this.ctx = data.canvas.getContext('2d');

            const config = {
                codec: "hev1.1.60.L153.B0.0.0.0.0.0",
                //codec: "hvc1.1.6.L120.00",
                codedWidth: data.width,
                codedHeight: data.height,
                optimizeForLatency: true,
            };

            VideoDecoder.isConfigSupported(config).then((supported) => {
                if (supported) {
                    console.log("WebCodecs::HEVC is supported");

                    const init = {
                        output: (frame) => {
                            console.log("WebCodecs::HEVC output video frame: ", frame);
                            this.ctx.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
                            self.postMessage({ type: "frame", timestamp: frame.timestamp });
                            frame.close();
                        },
                        error: (e) => {
                            console.log(e.message);
                        },
                    };

                    const decoder = new VideoDecoder(init);
                    decoder.configure(config);
                    this.decoder = decoder;

                    console.log("WebCodecs::HEVC decoder created:", this.decoder);
                } else {
                    console.log("WebCodecs::HEVC is not supported");
                }
            }).catch((e) => {
                console.log(e.message);
            });

            return;
        }

        if (data.type == "end_video") {
            try {
                this.decoder.close();
                console.log("WebCodecs::HEVC decoder closed");
            } catch (e) {
                console.log("WebCodecs::HEVC decoder close error:", e);
            }

            return;
        }

        if (data.type == "video") {
            let nal_start = 0;

            if (is_nal_unit_start1(data.frame))
                nal_start = 3;
            else if (is_nal_unit_start(data.frame))
                nal_start = 4;

            let nal_type = get_h265_nal_unit_type(data.frame[nal_start]);
            console.log("HEVC NAL unit type:", nal_type);

            const type = (nal_type == 19 || nal_type == 20) ? "key" : "delta";

            if (first) {
                // append the frame to the frame buffer
                frame_buffer.push(data.frame);

                if (type == "key") {
                    first = false;
                    console.log("WebCodecs::HEVC first keyframe received");

                    // merge entries from the frame_buffer into a single byte array
                    let frame_buffer_size = frame_buffer.reduce((acc, cur) => acc + cur.length, 0);
                    let merged_buffer = new Uint8Array(frame_buffer_size);
                    let offset = 0;
                    for (let i = 0; i < frame_buffer.length; i++) {
                        merged_buffer.set(frame_buffer[i], offset);
                        offset += frame_buffer[i].length;
                    }

                    // clear the frame buffer
                    frame_buffer = [];

                    const chunk = new EncodedVideoChunk({ data: merged_buffer, timestamp: timestamp, type: "key" }); // force keyframes
                    timestamp += 1;

                    this.decoder.decode(chunk);
                    console.log("WebCodecs::HEVC decoded video chunk:", chunk);
                }
            } else {
                const chunk = new EncodedVideoChunk({ data: data.frame, timestamp: timestamp, type: type }); // force keyframes
                timestamp += 1;

                this.decoder.decode(chunk);
                console.log("WebCodecs::HEVC decoded video chunk:", chunk);
            }
        }
    } catch (e) {
        console.log('WebCodecs API Video Worker', e);
    }
}, false);

