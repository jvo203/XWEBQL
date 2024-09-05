console.log('WebCodecs API Video Worker initiated');
self.addEventListener('message', function (e) {
    try {
        let data = e.data;
        console.log('WebCodecs API Video Worker message received:', data);

        if (data.type == "init_video") {
            const config = {
                codec: "hev1.1.60.L153.B0.0.0.0.0.0",
                codedWidth: data.width,
                codedHeight: data.height,
            };

            VideoDecoder.isConfigSupported(config).then((supported) => {
                if (supported) {
                    console.log("WebCodecs::HEVC is supported");

                    const init = {
                        output: (frame) => {
                            console.log("decoded video frame: ", frame);
                            //videoFrame.img = frame;
                            //videoFrame.img = new ImageData(frame, videoFrame.width, videoFrame.height);
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
            // make a current timestamp in microseconds
            const timestamp = performance.now() * 1000;
            const duration = 1000 / 30;

            // if the frame length is greater than 100 bytes then it is a key frame, else it is a delta frame
            const type = data.frame.byteLength > 100 ? "key" : "delta";

            const chunk = new EncodedVideoChunk({ data: data.frame, timestamp: timestamp, type: type, duration: duration });
            this.decoder.decode(chunk);
            console.log("WebCodecs::HEVC video chunk decoded:", chunk);
        }
    } catch (e) {
        console.log('WebCodecs API Video Worker', e);
    }

    //self.postMessage(band);
    //self.close();
}, false);

