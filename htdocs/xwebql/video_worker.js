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

                    var decoder = new VideoDecoder(init);
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
    } catch (e) {
        console.log('WebCodecs API Video Worker error:', e);
    }

    //self.postMessage(band);
    //self.close();
}, false);

