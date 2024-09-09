// WebAssembly
// Polyfill instantiateStreaming for browsers missing it
if (!WebAssembly.instantiateStreaming) {
    console.log('WebAssembly.instantiateStreaming polyfill initiated');
    WebAssembly.instantiateStreaming = async (resp, importObject) => {
        const source = await (await resp).arrayBuffer();
        return await WebAssembly.instantiate(source, importObject);
    };
}

// Create promise to handle Worker calls whilst
// module is still initialising
/*let wasmResolve;
let wasmReady = new Promise((resolve) => {
    wasmResolve = resolve;
})

WebAssembly.instantiateStreaming(fetch('hevc.wasm'), {})
    .then(instantiatedModule => {
        const wasmExports = instantiatedModule.instance.exports;

        // Resolve our exports for when the messages
        // to execute functions come through
        wasmResolve(wasmExports);

        console.log('WebAssembly HEVC module initiated');
    });*/


// async function to wait until Module.ready is defined
async function waitForModuleReady() {
    while (typeof Module === 'undefined' || typeof Module.ready === 'undefined') {
        console.log('waiting for Module.ready...');
        await sleep(100);
    }
}

importScripts('hevc.js');

waitForModuleReady().then(() => {
    console.log('WebAssembly HEVC module initiated');
}
);

// HEVC

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
    // (Byte >> 1) & 0x3f
    //return ((byte >> 1) & 0x3f);
}

console.log('WebCodecs API Video Worker initiated');

var timestamp = 0; // [microseconds]
var first = true;

self.addEventListener('message', function (e) {
    try {
        let data = e.data;
        console.log('WebCodecs API Video Worker message received:', data);

        if (data.type == "init_video") {
            timestamp = 0;
            first = true;
            this.ctx = data.canvas.getContext('2d');

            try {
                //init the HEVC decoder		
                Module.hevc_init_frame(1, data.width, data.height);
            } catch (e) {
                console.log(e);
            };

            const config = {
                /*codec: "hev1.1.60.L153.B0.0.0.0.0.0",*/
                codec: "hvc1.1.6.L120.00",
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
                Module.hevc_destroy_frame(1);
            } catch (e) {
                console.log(e);
            };

            try {
                this.decoder.close();
                console.log("WebCodecs::HEVC decoder closed");
            } catch (e) {
                console.log("WebCodecs::HEVC decoder close error:", e);
            }

            return;
        }

        if (data.type == "video") {
            /*let nal_start = 0;

            if (is_nal_unit_start1(data.frame))
                nal_start = 3;
            else if (is_nal_unit_start(data.frame))
                nal_start = 4;

            let nal_type = get_h265_nal_unit_type(data.frame[nal_start]);
            console.log("HEVC NAL unit type:", nal_type);

            const type = (nal_type == 19 || nal_type == 20) ? "key" : "delta";
            const chunk = new EncodedVideoChunk({ data: data.frame, timestamp: timestamp, type: type });
            timestamp += 1;

            if (first && type != "key") {
                console.log('WebCodecs::HEVC not a keyframe:', nal_type);
                return;
            }

            this.decoder.decode(chunk);
            first = false;
            console.log("WebCodecs::HEVC decoded video chunk:", chunk);*/

            // use the WASM HEVC decoder
            var res = Module.hevc_decode_frame(data.width, data.height, data.frame, 0, data.colourmap, data.fill, data.contours);
            var decoded = new Uint8ClampedArray(Module.HEAPU8.subarray(res[0], res[0] + res[1])); // it's OK to use .subarray() instead of .slice() as a copy is made in "new Uint8ClampedArray()"
            var img = new ImageData(decoded, data.width, data.height);
            this.ctx.putImageData(img, 0, 0);
            self.postMessage({ type: "frame", timestamp: timestamp });
            timestamp += 1;
        }
    } catch (e) {
        console.log('WebCodecs API Video Worker', e);
    }
}, false);

