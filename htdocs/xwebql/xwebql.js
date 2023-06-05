function get_js_version() {
    return "JS2023-06-05.0";
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
}

function get_worker_script() {
    return `self.addEventListener('message', function (e) {        
        importScripts('https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/marchingsquares-isobands.min.js');        
        importScripts('https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/marchingsquares-isocontours.min.js');        
        var band = MarchingSquaresJS.isoBands(e.data.data, e.data.lowerBand, e.data.upperBand - e.data.lowerBand);
        self.postMessage(band);
        self.close();
    }, false);`
}

const wasm_supported = (() => {
    try {
        console.log("checking for WebAssembly support");
        if (typeof WebAssembly === "object"
            && typeof WebAssembly.instantiate === "function") {
            const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
            if (module instanceof WebAssembly.Module)
                return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
        }
    } catch (e) {
    }
    return false;
})();

console.log(wasm_supported ? "WebAssembly is supported" : "WebAssembly is not supported");

String.prototype.insert_at = function (index, string) {
    return this.substr(0, index) + string + this.substr(index);
}

Array.prototype.rotate = function (n) {
    return this.slice(n, this.length).concat(this.slice(0, n));
}

function clamp(value, min, max) {
    return Math.min(Math.max(min, value), max)
}

function round(value, precision, mode) {
    //  discuss at: http://locutus.io/php/round/
    // original by: Philip Peterson
    //  revised by: Onno Marsman (https://twitter.com/onnomarsman)
    //  revised by: T.Wild
    //  revised by: Rafał Kukawski (http://blog.kukawski.pl)
    //    input by: Greenseed
    //    input by: meo
    //    input by: William
    //    input by: Josep Sanz (http://www.ws3.es/)
    // bugfixed by: Brett Zamir (http://brett-zamir.me)
    //      note 1: Great work. Ideas for improvement:
    //      note 1: - code more compliant with developer guidelines
    //      note 1: - for implementing PHP constant arguments look at
    //      note 1: the pathinfo() function, it offers the greatest
    //      note 1: flexibility & compatibility possible
    //   example 1: round(1241757, -3)
    //   returns 1: 1242000
    //   example 2: round(3.6)
    //   returns 2: 4
    //   example 3: round(2.835, 2)
    //   returns 3: 2.84
    //   example 4: round(1.1749999999999, 2)
    //   returns 4: 1.17
    //   example 5: round(58551.799999999996, 2)
    //   returns 5: 58551.8

    var m, f, isHalf, sgn // helper variables
    // making sure precision is integer
    precision |= 0
    m = Math.pow(10, precision)
    value *= m
    // sign of the number
    sgn = (value > 0) | -(value < 0)
    isHalf = value % 1 === 0.5 * sgn
    f = Math.floor(value)

    if (isHalf) {
        switch (mode) {
            case 'PHP_ROUND_HALF_DOWN':
                // rounds .5 toward zero
                value = f + (sgn < 0)
                break
            case 'PHP_ROUND_HALF_EVEN':
                // rouds .5 towards the next even integer
                value = f + (f % 2 * sgn)
                break
            case 'PHP_ROUND_HALF_ODD':
                // rounds .5 towards the next odd integer
                value = f + !(f % 2)
                break
            default:
                // rounds .5 away from zero
                value = f + (sgn > 0)
        }
    }

    return (isHalf ? value : Math.round(value)) / m
}

// https://stackoverflow.com/questions/3407012/rounding-up-to-the-nearest-multiple-of-a-number
// works for positive numbers only
function roundUp(numToRound, multiple) {
    if (multiple == 0) {
        return numToRound;
    }

    let remainder = numToRound % multiple;

    if (remainder == 0) {
        return numToRound;
    }

    return numToRound + multiple - remainder;
}

function getEndianness() {
    var a = new ArrayBuffer(4);
    var b = new Uint8Array(a);
    var c = new Uint32Array(a);
    b[0] = 0xa1;
    b[1] = 0xb2;
    b[2] = 0xc3;
    b[3] = 0xd4;
    if (c[0] === 0xd4c3b2a1) {
        return true;//BlobReader.ENDIANNESS.LITTLE_ENDIAN;
    }
    if (c[0] === 0xa1b2c3d4) {
        return false;//BlobReader.ENDIANNESS.BIG_ENDIAN;
    } else {
        throw new Error('Unrecognized endianness');
    }
}

function resizeMe() {
    clearTimeout(idleResize);

    idleResize = setTimeout(function () {
        location.reload(); // was reload(false)
    }, 250);
}

function beforePrint() {
    console.log('before printing...');

    window.onresize = null;
}

function afterPrint() {
    console.log('after printing...');

    window.onresize = resizeMe;
}

function localStorage_read_boolean(key, defVal) {
    if (localStorage.getItem(key) !== null) {
        var value = localStorage.getItem(key);

        if (value == "true")
            return true;

        if (value == "false")
            return false;
    }
    else
        return defVal;
}

function localStorage_read_number(key, defVal) {
    if (localStorage.getItem(key) === null)
        return defVal;
    else
        return parseFloat(localStorage.getItem(key));
}

function localStorage_read_string(key, defVal) {
    if (localStorage.getItem(key) === null)
        return defVal;
    else
        return localStorage.getItem(key);
}

function localStorage_write_boolean(key, value) {
    if (value)
        localStorage.setItem(key, "true");
    else
        localStorage.setItem(key, "false");
}


function close_websocket_connection() {
    if (XWS != null) {
        try {
            XWS.close();
        } catch (_) { };

        XWS = null;
    }

    // clear all timeouts (poll_progress in particular)
    var id = window.setTimeout(function () { }, 0);

    while (id--) {
        window.clearTimeout(id); // will do nothing if no timeout with id is present
    }
}

function test_webgl1() {
    try {
        var canvas = document.createElement('canvas');
        return !!window.WebGLRenderingContext && (
            canvas.getContext('webgl'));
    } catch (e) { return false; }
};

function test_webgl2() {
    try {
        var canvas = document.createElement('canvas');
        return !!window.WebGLRenderingContext && (
            canvas.getContext('webgl2'));
    } catch (e) { return false; }
};

function test_webgl_support() {
    try {
        var canvas = document.createElement('canvas');
        return !!window.WebGLRenderingContext && (
            canvas.getContext('webgl') || canvas.getContext('webgl2'));
    } catch (e) { return false; }
};

function enable_3d_view() {
    has_webgl = false;

    if (test_webgl_support()) {
        (function () {
            var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
            po.src = 'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/three.min.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
        })();

        (function () {
            var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
            po.src = 'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/Detector.min.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
        })();

        (function () {
            var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
            po.src = 'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/threex.keyboardstate.min.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
        })();

        (function () {
            var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
            po.src = 'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/threex.windowresize.min.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
        })();

        (function () {
            var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
            po.src = 'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/THREEx.FullScreen.min.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
        })();

        (function () {
            var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
            po.src = 'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/TrackballControls.min.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
        })();

        (function () {
            var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
            // po.src = 'surface.js' + '?' + encodeURIComponent(get_js_version());
            po.src = 'https://cdn.jsdelivr.net/gh/jvo203/FITSWEBQLSE/htdocs/fitswebql/surface.min.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
        })();

        has_webgl = true;
        console.log("WebGL supported.");
    }
    else
        console.log("WebGL not supported by your browser.");
}

async function open_3d_view() {
    // await sleep(5000);

    try {
        enable_3d_view();
    }
    catch (e) {
        has_webgl = false;
        console.log('WebGL disabled', e);
    }
}

function addStylesheetRules(rules) {
    var styleEl = document.createElement('style');

    // Append <style> element to <head>
    document.head.appendChild(styleEl);

    // Grab style element's sheet
    var styleSheet = styleEl.sheet;

    for (var i = 0; i < rules.length; i++) {
        var j = 1,
            rule = rules[i],
            selector = rule[0],
            propStr = '';
        // If the second argument of a rule is an array of arrays, correct our variables.
        if (Array.isArray(rule[1][0])) {
            rule = rule[1];
            j = 0;
        }

        for (var pl = rule.length; j < pl; j++) {
            var prop = rule[j];
            propStr += prop[0] + ': ' + prop[1] + (prop[2] ? ' !important' : '') + ';\n';
        }

        // Insert CSS Rule
        styleSheet.insertRule(selector + '{' + propStr + '}', styleSheet.cssRules.length);
    }
}

async function mainRenderer() {
    htmlData = document.getElementById('htmlData');

    webgl1 = test_webgl1();
    webgl2 = test_webgl2();

    if (webgl2) {
        // prefer WebGL2 over 1
        webgl1 = false;
        webgl2 = true;
    }

    var res3d = open_3d_view();

    //intercept print events
    if (window.matchMedia) {
        var mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(function (mql) {
            if (mql.matches) {
                beforePrint();
            } else {
                afterPrint();
            }
        });
    }

    window.onbeforeprint = beforePrint;
    window.onafterprint = afterPrint;
    //end-of-printing

    if (htmlData.getAttribute('data-root-path') != null)
        ROOT_PATH = htmlData.getAttribute('data-root-path').trim();
    console.log("ROOT_PATH=" + ROOT_PATH);

    isLocal = (htmlData.getAttribute('data-server-mode').indexOf("LOCAL") > -1) ? true : false;

    endianness = getEndianness();
    console.log('endianness: ', endianness);

    if (localStorage.getItem("ui_theme") === null) {
        theme = "dark";
        colourmap = "green";
        axisColour = "rgba(255,204,0,0.8)";


        localStorage.setItem("ui_theme", theme);
        localStorage.setItem("xcolourmap", colourmap);
    }
    else {
        theme = localStorage.getItem("ui_theme");

        if (theme == 'bright')
            axisColour = "#000000";
        else
            axisColour = "rgba(255,204,0,0.8)"; // axisColour
    }

    if (localStorage.getItem("zoom_shape") === null) {
        zoom_shape = "circle";
        localStorage.setItem("zoom_shape", zoom_shape);
    }
    else
        zoom_shape = localStorage.getItem("zoom_shape");

    if (localStorage.getItem("xcolourmap") === null) {
        if (theme == 'bright')
            colourmap = "haxby";
        else
            colourmap = "green";

        localStorage.setItem("xcolourmap", colourmap);
    }
    else
        colourmap = localStorage.getItem("xcolourmap");

    if (colourmap === null)
        colourmap = "green";

    if (localStorage.getItem("image_quality") === null) {
        image_quality = "medium";
        localStorage.setItem("image_quality", image_quality);
    }
    else
        image_quality = localStorage.getItem("image_quality");

    if (localStorage.getItem("video_fps_control") === null) {
        video_fps_control = "auto";
        localStorage.setItem("video_fps_control", video_fps_control);
    }
    else
        video_fps_control = localStorage.getItem("video_fps_control");

    if (firstTime) {
        console.log("theme:", theme);

        if (theme == 'bright') {
            d3.select("body")
                .style('background-color', 'white')
                .style('color', 'black');

            d3.select("html")
                .style('background-color', 'white')
                .style('color', 'black');
        } else {
            // dynamically add the dark theme rules
            addStylesheetRules([
                ['.modal-content',
                    ['background-color', 'rgb(0, 0, 0)'],
                    ['background-color', 'rgba(0, 0, 0, 0.5)']
                ],
                ['.list-group-item',
                    ['background-color', 'rgb(0, 0, 0)'],
                    ['background-color', 'rgba(0, 0, 0, 0.5)'],
                    ['color', 'inherit']
                ]
            ]);
        }

        fps = 30;//target fps; 60 is OK in Chrome but a bit laggish in Firefox
        fpsInterval = 1000 / fps;

        frame_multiplier = 1;
        imageData = null;
        initKalmanFilter = false;
        windowLeft = false;
        streaming = false;
        video_playback = false;
        video_offset = null;
        video_timeout = -1;
        idleMouse = -1;
        idleVideo = -1;
        moving = false;
        data_band_lo = 0;
        data_band_hi = 0;
        latency = 0;
        ping_latency = 0;
        computed = 0;

        //image
        recv_seq_id = 0;
        sent_seq_id = 0;
        last_seq_id = 0;

        //video
        if (video_fps_control == 'auto')
            vidFPS = 5;//10
        else
            vidFPS = parseInt(video_fps_control);

        vidInterval = 1000 / vidFPS;

        //track the bitrate with a Kalman Filter
        target_bitrate = 1000; // was 1000
        bitrate = target_bitrate;
        eta = 0.1;
        variance = 0.0;

        recv_vid_id = 0;
        sent_vid_id = 0;
        last_vid_id = 0;
        videoFrame = null;

        viewport_zoom_settings = null;
        invalidateViewport = false;
        viewport = {};
        zoom_dims = null;
        zoom_location = 'lower';
        zoom_scale = 25;
        xradec = null;

        tmp_data_min = 0;
        tmp_data_max = 0;

        user_data_min = null;
        user_data_max = null;

        x_mouse_start = 0;
        xdrag = false;
        session_x_start = 0;
        session_x_end = 0;
        session_frame_start = 0;
        session_frame_end = 0;
        frame_start = 0;
        frame_end = 0;

        mousedown = false;
        begin_x = 0;
        begin_y = 0;
        end_x = 0;
        end_y = 0;

        realtime_spectrum = localStorage_read_boolean("realtime_spectrum", true);
        realtime_video = localStorage_read_boolean("realtime_video", true);
        displayDownloadConfirmation = localStorage_read_boolean("displayDownloadConfirmation", true);
        welcome = localStorage_read_boolean("welcome_x_alpha", true);

        autoscale = true;
        displayScalingHelp = localStorage_read_boolean("displayScalingHelp", true);
        last_spectrum = null;

        displayContours = false;
        displayLegend = localStorage_read_boolean("displayLegend", true);
        displaySpectrum = localStorage_read_boolean("displaySpectrum", true);
        displayGridlines = localStorage_read_boolean("displayGridlines", false);

        has_contours = false;
        has_preferences = false;

        datasetId = htmlData.getAttribute('data-datasetId');//make it a global variable
        console.log("datasetId:", datasetId);

        d3.select("body").append("div")
            .attr("id", "mainDiv")
            .attr("class", "main");

        var rect = document.getElementById('mainDiv').getBoundingClientRect();
        var width = Math.round(rect.width);
        var height = Math.round(rect.height);
        document.getElementById('mainDiv').setAttribute("style", "width:" + width.toString() + "px");
        document.getElementById('mainDiv').setAttribute("style", "height:" + height.toString() + "px");

        //set the default font-size (1em)
        //emFontSize = Math.max(12, 0.011 * 0.5 * (rect.width + rect.height));
        emFontSize = Math.max(12, 0.011 * (0.2 * rect.width + 0.8 * rect.height));
        emStrokeWidth = Math.max(1, 0.1 * emFontSize);
        document.body.style.fontSize = emFontSize + "px";
        console.log("emFontSize : ", emFontSize.toFixed(2), "emStrokeWidth : ", emStrokeWidth.toFixed(2));

        var width = rect.width - 20;
        var height = rect.height - 20;

        d3.select("#mainDiv").append("canvas")
            .attr("id", "HTMLCanvas")
            .attr("width", width)
            .attr("height", height)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 0');

        d3.select("#mainDiv").append("canvas")
            .attr("id", "VideoCanvas")
            .attr("width", width)
            .attr("height", height)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 50');

        d3.select("#mainDiv").append("svg")
            .attr("id", "ContourSVG")
            .attr("width", width)
            .attr("height", height)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 51');
    };

    firstTime = false;
}