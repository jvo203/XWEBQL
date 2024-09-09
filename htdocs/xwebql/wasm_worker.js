importScripts('https://cdn.jsdelivr.net/gh/jvo203/XWEBQL/htdocs/xwebql/hevc.js');

self.addEventListener('message', function (e) {
    try {
        let data = e.data;
        console.log('WASM Video Worker message received:', data);
        if (data.type == "init_video") {
            this.ctx = data.canvas.getContext('2d');

            try {
                //init the HEVC decoder		
                Module.hevc_init_frame(1, data.width, data.height);
            } catch (e) {
                console.log(e);
            };

            return;
        }

        if (data.type == "end_video") {
            try {
                Module.hevc_destroy_frame(1);
            } catch (e) {
                console.log(e);
            };

            return;
        }

        if (data.type == "video") {
            var res = Module.hevc_decode_frame(data.width, data.height, data.frame, 0, data.colourmap, data.fill, data.contours);
            var decoded = new Uint8ClampedArray(Module.HEAPU8.subarray(res[0], res[0] + res[1])); // it's OK to use .subarray() instead of .slice() as a copy is made in "new Uint8ClampedArray()"
            var img = new ImageData(decoded, data.width, data.height);
            this.ctx.putImageData(img, 0, 0);
            self.postMessage({ type: "frame" });
        }
    } catch (e) {
        console.log('WASM Video Worker', e);
    }
}, false);
console.log('WASM Video Worker initiated');