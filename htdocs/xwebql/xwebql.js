function get_js_version() {
    return "JS2023-06-23.0";
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

function getUint64(dataview, byteOffset, littleEndian) {
    // 64ビット数を2つの32ビット (4バイト) の部分に分割する
    const left = dataview.getUint32(byteOffset, littleEndian);
    const right = dataview.getUint32(byteOffset + 4, littleEndian);

    // 2つの32ビットの値を結合する
    const combined = littleEndian ? left + 2 ** 32 * right : 2 ** 32 * left + right;

    if (!Number.isSafeInteger(combined))
        console.warn(combined, 'exceeds MAX_SAFE_INTEGER. Precision may be lost');

    return combined;
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

function setup_window_timeout() {
    window.clearTimeout(idleWindow); // cancel any previous timeouts

    let timeout = 60 * 60 * 1000; // 1h
    idleWindow = window.setTimeout(show_timeout, timeout);
};

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

function show_unsupported_media_type() {
    try {
        $('#welcomeScreen').modal('hide');
    }
    catch (e) { };

    var div = d3.select("body")
        .append("div")
        .attr("class", "container timeout");

    div.append("h1")
        .style("margin-top", "25%")
        .style("color", "red")
        .attr("align", "center")
        .text("UNSUPPORTED MEDIA TYPE");

    div.append("h2")
        .attr("align", "center")
        //.style("color", "red")
        .text("XWEBQL ONLY SUPPORTS X-RAY EVENTS DATA");

    close_websocket_connection();
}

function show_not_found() {
    try {
        $('#welcomeScreen').modal('hide');
    }
    catch (e) { };

    var div = d3.select("body")
        .append("div")
        .attr("class", "container timeout");

    div.append("h1")
        .style("margin-top", "27.5%")
        .style("color", "red")
        .attr("align", "center")
        .text("DATA NOT FOUND ON THE REMOTE SITE");

    div.append("h2")
        .attr("align", "center")
        //.style("color", "red")
        .text("THE X-RAY EVENTS FILE CANNOT BE FOUND");

    close_websocket_connection();
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

function hide_navigation_bar() {
    try {
        document.getElementById('menu').style.display = "none";
        d3.select("#menu_activation_area").attr("opacity", 0.1);//was 0.7
    } catch (e) { }
}

function display_hourglass() {
    var c = document.getElementById('HTMLCanvas');
    var width = c.width;
    var height = c.height;

    //hourglass
    /*var img_width = 200 ;
    var img_height = 200 ;*/

    //squares
    var img_width = 128;
    var img_height = 128;

    d3.select('#FrontSVG').append("svg:image")
        .attr("id", "hourglass")
        .attr("x", (width - img_width) / 2)
        .attr("y", (height - img_height) / 2)
        //.attr("xlink:href", ROOT_PATH + "loading.gif")
        .attr("xlink:href", "https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/loading.gif")
        .attr("width", img_width)
        .attr("height", img_height)
        .attr("opacity", 1.0);
}

function hide_hourglass() {
    try {
        d3.selectAll('#hourglass').remove();
    }
    catch (e) { };
}

function donotshow() {
    var checkbox = document.getElementById('donotshowcheckbox');

    localStorage_write_boolean("welcome_x_alpha", !checkbox.checked);
};

function show_timeout() {
    try {
        $('#welcomeScreen').modal('hide');
    }
    catch (e) { };

    var div = d3.select("body")
        .append("div")
        .attr("class", "container timeout");

    div.append("h1")
        .style("margin-top", "20%")
        .attr("align", "center")
        .text("60 min. inactivity time-out");

    div.append("h2")
        .attr("align", "center")
        .text("PLEASE RELOAD THE PAGE");

    close_websocket_connection();
}

function show_welcome() {
    var div = d3.select("body")
        .append("div")
        .attr("class", "container")
        .append("div")
        .attr("id", "welcomeScreen")
        .attr("class", "modal modal-center")
        .attr("role", "dialog")
        .append("div")
        .attr("class", "modal-dialog modal-dialog-centered");

    var contentDiv = div.append("div")
        .attr("class", "modal-content");

    var headerDiv = contentDiv.append("div")
        .attr("class", "modal-header");

    headerDiv.append("button")
        .attr("type", "button")
        .attr("data-dismiss", "modal")
        .attr("id", "welcomeclose")
        .attr("class", "close")
        .style("color", "red")
        .text("×");

    headerDiv.append("h2")
        .attr("align", "center")
        .html('WELCOME TO XWEBQL');

    var bodyDiv = contentDiv.append("div")
        .attr("id", "modal-body")
        .attr("class", "modal-body");

    bodyDiv.append("h3")
        .text("FEATURES");

    var ul = bodyDiv.append("ul")
        .attr("class", "list-group");

    sv = htmlData.getAttribute('data-server-version');

    if (sv.charAt(0) == 'F') {
        ul.append("li")
            .attr("class", "list-group-item list-group-item-success")
            .html("<h4>FORTRAN (computing) &amp; C (networking)</h4>");
    };

    if (sv.charAt(0) == 'J') {
        ul.append("li")
            .attr("class", "list-group-item list-group-item-success")
            .html("<h4>Server powered by Julia</h4>");
    };

    /*ul.append("li")
        .attr("class", "list-group-item list-group-item-success")
        .html('<h4>HDR image rendering with WebGL</h4>');*/

    /*ul.append("li")
      .attr("class", "list-group-item list-group-item-success")
      .html('<h4>32-bit floating-point High Dynamic Range images compressed with <a href="https://en.wikipedia.org/wiki/OpenEXR"><em>OpenEXR</em></a></h4>');*/

    if (!isLocal) {
        ul.append("li")
            .attr("class", "list-group-item list-group-item-success")
            .html('<h4>source code: <a href="https://github.com/jvo203/XWEBQL"><em>https://github.com/jvo203/XWEBQL</em></a></h4>');
    }

    bodyDiv.append("h3")
        .text("Browser recommendation");

    let textColour = 'yellow';

    if (theme == 'bright')
        textColour = 'red';

    if (!wasm_supported) {
        bodyDiv.append("p")
            .html('A modern browser with <a href="https://en.wikipedia.org/wiki/WebAssembly" style="color:' + textColour + '"><b>WebAssembly (Wasm)</b></a> support is required.');
    }

    bodyDiv.append("p")
        .html('For optimum experience we recommend  <a href="https://www.apple.com/safari/" style="color:' + textColour + '"><b>Apple Safari</b></a> or <a href="https://www.google.com/chrome/index.html" style="color:' + textColour + '"><b>Google Chrome</b></a>.');

    var footer = contentDiv.append("div")
        .attr("class", "modal-footer d-flex justify-content-around");

    var href = "mailto:help_desk@jvo.nao.ac.jp?subject=" + htmlData.getAttribute('data-server-string') + " bug report [" + htmlData.getAttribute('data-server-version') + "/" + get_js_version() + "]";

    footer.append("p")
        .attr("align", "left")
        .html('<label style="cursor: pointer"><input type="checkbox" value="" class="control-label" style="cursor: pointer" id="donotshowcheckbox" onchange="javascript:donotshow();">&nbsp;do not show this dialogue again</label>' + '&nbsp;&nbsp;&nbsp;<a style="color:red" href="' + href + '">page loading problems? </a>' + '<button type="submit" class="btn btn-danger btn-default pull-right" data-dismiss="modal"><span class="fas fa-times"></span> Close</button>');

    $('#welcomeScreen').modal('show');
}

function show_heartbeat() {
    var svg = d3.select("#BackSVG");
    var svgWidth = parseFloat(svg.attr("width"));
    var svgHeight = parseFloat(svg.attr("height"));
    var offset = 2.0 * emFontSize;

    //show ping
    var group = svg.append("g")
        .attr("id", "pingGroup");

    group.append("text")
        .attr("id", "heartbeat")
        .attr('class', 'fas')
        .attr("x", emFontSize / 4)
        //.attr("y", offset)//"0.75em")
        .attr("y", (svgHeight - 0.67 * offset))
        .attr("font-family", "Helvetica")//Helvetica
        //.attr("font-size", "0.75em")
        .attr("font-size", "1.5em")
        .attr("text-anchor", "start")
        .attr("fill", "grey")
        .attr("stroke", "none")
        .attr("opacity", 0.0)
        .text("");

    let fillColour = 'yellow';

    if (theme == 'bright')
        fillColour = 'black';

    let bottomY = svgHeight - offset / 4;

    group.append("text")
        .attr("id", "latency")
        .attr("x", (0 * emFontSize / 4 + 0 * 1.75 * emFontSize))
        //.attr("y", offset)//"0.85em")
        .attr("y", bottomY)
        .attr("font-family", "Inconsolata")
        //.attr("font-weight", "bold")
        .attr("font-size", "0.75em")//0.75 Helvetica
        .attr("text-anchor", "start")
        .attr("fill", fillColour)
        .attr("stroke", "none")
        .attr("opacity", 0.75)
        .text("");
}

function poll_heartbeat() {
    var xmlhttp = new XMLHttpRequest();
    var url = 'heartbeat/' + performance.now();

    xmlhttp.onreadystatechange = function () {
        var RRT = 0;

        if (xmlhttp.readyState == 4 && xmlhttp.status == 404) { };

        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var data = xmlhttp.response;

            try {
                var previous_t = parseFloat(data);
                ping_latency = (performance.now() - previous_t);

                if (ping_latency > 0) {
                    if (realtime_spectrum) {
                        fps = 1000 / ping_latency;
                        fps = Math.min(30, fps);
                        fps = Math.max(10, fps);
                    }
                    else
                        fps = 30;

                    fpsInterval = 1000 / fps;
                }
            }
            catch (e) { };

            d3.select("#heartbeat")
                .attr("fill", "grey")
                .attr("opacity", 1.0)
                //.text('\ue143');// an empty heart
                //.text('\ue005');// a full heart
                .text('\uf004');// heart
            //.text('📡');
            //.text('📶');

            setTimeout(function () {
                d3.select("#heartbeat")
                    .attr("fill", "grey")
                    .attr("opacity", 1.0)
                    //.text('\ue144');// link
                    //.text('\uf004');// handshake
                    //.text('\uf00c');// check
                    .text('\uf21e');// heartbeat
                //.text('📶');

                setTimeout(function () {
                    d3.select("#heartbeat")
                        .attr("opacity", 0.0);

                    setTimeout(poll_heartbeat, 1000 + RRT);
                }, 500);
            }, 500);
        };

        if (xmlhttp.readyState == 4 && xmlhttp.status == 0) {
            // display an error
            d3.select("#heartbeat")
                .attr("fill", "red")
                .attr("opacity", 1.0)
                .html("&#x274c;");// Cross Mark

            setTimeout(poll_heartbeat, 10000 + RRT);
        }
    }

    xmlhttp.open("POST", url, true);
    xmlhttp.responseType = 'text';
    xmlhttp.timeout = 0;
    xmlhttp.send();
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

        d3.select("#mainDiv").append("svg")
            .attr("id", "BackgroundSVG")
            .attr("width", width)
            .attr("height", height)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 52');

        d3.select("#mainDiv").append("canvas")
            .attr("id", "ZOOMCanvas")
            .attr("width", width)
            .attr("height", height)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 53');

        d3.select("#mainDiv").append("canvas")
            .attr("id", "ViewportCanvas")
            .attr("width", width)
            .attr("height", height)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 54');


        d3.select("#mainDiv").append("svg")
            .attr("id", "BackSVG")
            .attr("width", width)
            .attr("height", height)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 55; cursor: default; mix-blend-mode: none');//difference or lighten or screen or overlay

        //spectrum
        var blend = '';

        if (theme == 'bright')
            blend = 'mix-blend-mode: difference; ';

        d3.select("#mainDiv").append("canvas")
            .attr("id", "SpectrumCanvas")
            .attr("width", width)
            .attr("height", height)
            .attr('style', blend + 'position: fixed; left: 10px; top: 10px; z-index: 56');// mix-blend-mode: difference;

        d3.select("#mainDiv").append("svg")
            .attr("id", "FrontSVG")
            .attr("width", width)
            .attr("height", height)
            .on("mouseenter", hide_navigation_bar)
            .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 57; cursor: default');

        // JVO logo
        /*d3.select("#BackSVG").append("svg:image")
            .attr("id", "jvoLogo")
            .attr("x", (width - 1 - 199))
            .attr("y", (height - 1 - 109))
            .attr("xlink:href", "https://jvo.nao.ac.jp/images/JVO_logo_199x109.png")
            .attr("width", 199)
            .attr("height", 109)
            .attr("opacity", 0.5);*/

        // JAXA logo
        d3.select("#BackSVG").append("svg:image")
            .attr("id", "jvoLogo")
            .attr("x", (width - 1 - 265))
            .attr("y", (height - 1 - 162))
            .attr("xlink:href", "https://www.jaxa.jp/images/logo.gif")
            .attr("width", 265)
            .attr("height", 162)
            .attr("opacity", 0.5);

        await res3d; display_menu();

        if (welcome)
            show_welcome();

        display_hourglass();
        show_heartbeat();
        poll_heartbeat();

        dataset_timeout = -1;
        fetch_image_spectrum(datasetId, true, false);

    };

    firstTime = false;
}

async function fetch_image_spectrum(_datasetId, fetch_data, add_timestamp) {
    var rect = document.getElementById('mainDiv').getBoundingClientRect();
    var width = rect.width - 20;
    var height = rect.height - 20;

    var xmlhttp = new XMLHttpRequest();

    var url = 'image_spectrum?datasetId=' + encodeURIComponent(_datasetId) + '&width=' + width + '&height=' + height + '&quality=' + image_quality;

    if (fetch_data)
        url += '&fetch_data=true';

    url += '&' + encodeURIComponent(get_js_version());

    if (add_timestamp)
        url += '&timestamp=' + Date.now();

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 404) {
            if (dataset_timeout != -1) {
                window.clearTimeout(dataset_timeout);
                dataset_timeout = -1;
            }

            hide_hourglass();
            show_not_found();
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 415) {
            if (dataset_timeout != -1) {
                window.clearTimeout(dataset_timeout);
                dataset_timeout = -1;
            }

            hide_hourglass();
            show_unsupported_media_type();
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 500) {
            if (dataset_timeout != -1) {
                window.clearTimeout(dataset_timeout);
                dataset_timeout = -1;
            }

            hide_hourglass();
            //show_critical_error();
            show_not_found();
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 500) {
            if (dataset_timeout != -1) {
                window.clearTimeout(dataset_timeout);
                dataset_timeout = -1;
            }

            console.log("Connection error:", xmlhttp.status, ", re - fetching image after 1 second.");
            setTimeout(function () {
                fetch_image_spectrum(_datasetId, fetch_data, true);
            }, 1000);
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 202) {
            if (dataset_timeout != -1) {
                window.clearTimeout(dataset_timeout);
                dataset_timeout = -1;
            }

            console.log("Server not ready, long-polling image again after 500ms.");
            setTimeout(function () {
                fetch_image_spectrum(_datasetId, fetch_data, false);
            }, 500);
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 204) {
            console.log("Server not ready / No Content, long-polling image again after 500ms.");
            setTimeout(function () {
                fetch_image_spectrum(_datasetId, fetch_data, false);
            }, 500);

            if (dataset_timeout == -1) {
                dataset_timeout = setTimeout(function () {
                    hide_hourglass();
                    show_not_found();
                }, 10000);
            }
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            if (dataset_timeout != -1) {
                window.clearTimeout(dataset_timeout);
                dataset_timeout = -1;
            }

            setup_window_timeout();

            // wait for WebAssembly to get compiled
            Module.ready
                .then(_ => {
                    var received_msg = xmlhttp.response;

                    if (received_msg.byteLength == 0) {
                        hide_hourglass();
                        show_not_found();
                        return;
                    }

                    if (received_msg instanceof ArrayBuffer) {
                        var fitsHeader;

                        var dv = new DataView(received_msg);
                        console.log("FITSImage dataview byte length: ", dv.byteLength);

                        var offset = 0;
                        var str_length = dv.getUint32(offset, endianness);
                        offset += 4;

                        let flux = new Uint8Array(received_msg, offset, str_length);
                        flux = (new TextDecoder("utf-8").decode(flux)).trim();
                        offset += str_length;

                        console.log("flux: ", flux);

                        let min_count = getUint64(dv, offset, endianness);
                        offset += 8;

                        let max_count = getUint64(dv, offset, endianness);
                        offset += 8;

                        console.log("min_count: ", min_count, "max_count: ", max_count);

                        let img_width = dv.getUint32(offset, endianness);
                        offset += 4;

                        let img_height = dv.getUint32(offset, endianness);
                        offset += 4;

                        console.log('img_width:', img_width, 'img_height:', img_height);

                        let pixels_length = dv.getUint32(offset, endianness);
                        offset += 4;

                        console.log('pixels length:', pixels_length);

                        let frame_pixels = new Uint8Array(received_msg, offset, pixels_length);
                        offset += pixels_length;

                        let mask_length = dv.getUint32(offset, endianness);
                        offset += 4;

                        console.log('mask length:', mask_length);

                        let frame_mask = new Uint8Array(received_msg, offset, mask_length);
                        offset += mask_length;

                        var has_json = true;

                        try {
                            var json_len = dv.getUint32(offset, endianness);
                            offset += 4;

                            var buffer_len = dv.getUint32(offset, endianness);
                            offset += 4;

                            var json = new Uint8Array(received_msg, offset, buffer_len);
                            offset += buffer_len;
                            console.log("X-ray json length:", json_len);
                        } catch (_) {
                            has_json = false;
                        }

                        var has_header = true;

                        try {
                            var header_len = dv.getUint32(offset, endianness);
                            offset += 4;

                            var buffer_len = dv.getUint32(offset, endianness);
                            offset += 4;

                            var header = new Uint8Array(received_msg, offset, buffer_len);
                            offset += buffer_len;
                            console.log("FITS header length:", header_len);
                        } catch (_) {
                            has_header = false;
                        }

                        var has_spectrum = true;

                        try {
                            var spectrum_len = dv.getUint32(offset, endianness);
                            offset += 4;

                            var buffer_len = dv.getUint32(offset, endianness);
                            offset += 4;

                            var buffer = new Uint8Array(received_msg, offset, buffer_len);
                            offset += buffer_len;
                            console.log("X-ray spectrum length:", spectrum_len);

                            // ZFP decoder part                            
                            let start = performance.now();
                            var res = Module.decompressZFPspectrum(spectrum_len, buffer);
                            var spectrum = Module.HEAPF32.slice(res[0] / 4, res[0] / 4 + res[1]);
                            let elapsed = Math.round(performance.now() - start);

                            console.log("spectrum size: ", spectrum.length, "elapsed: ", elapsed, "[ms]");
                            console.log("spectrum: ", spectrum);
                        } catch (_) {
                            has_spectrum = false;
                        }

                        if (has_header) {
                            // decompress the FITS data etc.
                            var LZ4 = require('lz4');

                            var uncompressed = new Uint8Array(header_len);
                            uncompressedSize = LZ4.decodeBlock(header, uncompressed);
                            uncompressed = uncompressed.slice(0, uncompressedSize);

                            try {
                                fitsHeader = new TextDecoder().decode(uncompressed);
                            }
                            catch (err) {
                                fitsHeader = '';
                                for (var i = 0; i < uncompressed.length; i++)
                                    fitsHeader += String.fromCharCode(uncompressed[i]);
                            };

                            console.log(fitsHeader);
                        }

                        if (has_json) {
                            // decompress the FITS data etc.
                            var LZ4 = require('lz4');

                            var uncompressed = new Uint8Array(json_len);
                            uncompressedSize = LZ4.decodeBlock(json, uncompressed);
                            uncompressed = uncompressed.slice(0, uncompressedSize);

                            try {
                                fitsData = new TextDecoder().decode(uncompressed);
                            }
                            catch (err) {
                                fitsData = '';
                                for (var i = 0; i < uncompressed.length; i++)
                                    fitsData += String.fromCharCode(uncompressed[i]);
                            };

                            //console.log(fitsData);
                            fitsData = JSON.parse(fitsData);

                            // replace the dummy FITS header
                            if (has_header) {
                                fitsData.HEADER = fitsHeader;
                            } else {
                                fitsData.HEADER = 'N/A';
                            };

                            // replace the dummy spectrum
                            if (has_spectrum) {
                                fitsData.spectrum = spectrum;
                            }

                            console.log(fitsData);

                            if (!isLocal) {
                                let filesize = fitsData.filesize;
                                let strFileSize = numeral(filesize).format('0.0b');
                                d3.select("#FITS").html("full download (" + strFileSize + ")");
                            }

                            {
                                frame_reference_unit();

                                //rescale CRVAL3 and CDELT3
                                fitsData.CRVAL3 *= frame_multiplier;
                                fitsData.CDELT3 *= frame_multiplier;
                            }

                            display_dataset_info();

                            if (va_count == 1 || composite_view) {
                                try {
                                    if (index == va_count) {
                                        display_scale_info();
                                    }
                                }
                                catch (err) {
                                };
                            };

                            display_preferences(index);

                            display_FITS_header(index);

                            if (!composite_view)
                                add_line_label(index);

                            frame_start = 0;
                            frame_end = fitsData.depth - 1;

                            if (fitsData.depth > 1) {
                                //insert a spectrum object to the spectrumContainer at <index-1>
                                mean_spectrumContainer[index - 1] = fitsData.mean_spectrum;
                                integrated_spectrumContainer[index - 1] = fitsData.integrated_spectrum;

                                spectrum_count++;

                                if (va_count == 1) {
                                    setup_axes();

                                    if (intensity_mode == "mean")
                                        plot_spectrum([fitsData.mean_spectrum]);

                                    if (intensity_mode == "integrated")
                                        plot_spectrum([fitsData.integrated_spectrum]);

                                    if (molecules.length > 0)
                                        display_molecules();
                                }
                                else {
                                    if (spectrum_count == va_count) {
                                        //console.log("mean spectrumContainer:", mean_spectrumContainer);
                                        //console.log("integrated spectrumContainer:", integrated_spectrumContainer);

                                        //display an RGB legend in place of REF FRQ			
                                        display_composite_legend();

                                        // TO-DO
                                        /*if (composite_view)
                                            display_rgb_legend();*/

                                        setup_axes();

                                        if (intensity_mode == "mean")
                                            plot_spectrum(mean_spectrumContainer);

                                        if (intensity_mode == "integrated")
                                            plot_spectrum(integrated_spectrumContainer);

                                        if (molecules.length > 0)
                                            display_molecules();
                                    }
                                }
                            }
                        }

                    }

                })
                .catch(e => console.error(e));
        }
    }

    xmlhttp.open("GET", url, true);//or "POST" to disable caching
    xmlhttp.responseType = 'arraybuffer';
    xmlhttp.timeout = 0;
    xmlhttp.send();
}

function frame_reference_unit() {
    if (fitsData.CUNIT3.toLowerCase() === "eV".toLowerCase()) {
        frame_multiplier = 1;
        return;
    }

    if (fitsData.CUNIT3.toLowerCase() === "keV".toLowerCase()) {
        frame_multiplier = 1e3;
        return;
    }

    if (fitsData.CUNIT3.toLowerCase() === "MeV".toLowerCase()) {
        frame_multiplier = 1e6;
        return;
    }

    if (fitsData.CUNIT3.toLowerCase() === "GeV".toLowerCase()) {
        frame_multiplier = 1e9;
        return;
    }

    if (fitsData.CUNIT3.toLowerCase() === "TeV".toLowerCase()) {
        frame_multiplier = 1e12;
        return;
    }
}

function show_fits_header() {
    $("#fitsHeader").modal("show");

    var modal = document.getElementById('fitsHeader');
    var span = document.getElementById('fitsHeaderClose');

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        $("#fitsHeader").modal("hide");
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            $("#fitsHeader").modal("hide");
        }
    }
}

function show_help() {
    $("#help").modal("show");

    var modal = document.getElementById('help');
    var span = document.getElementById('helpclose');

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        $("#help").modal("hide");
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            $("#help").modal("hide");
        }
    }
}

function display_menu() {
    var div = d3.select("body").append("div")
        .attr("id", "menu")
        .attr("class", "menu");
    //.on("mouseleave", hide_navigation_bar);

    var nav = div.append("nav").attr("class", "navbar navbar-inverse navbar-fixed-top fixed-top navbar-expand-sm navbar-dark");

    var main = nav.append("div")
        .attr("class", "container-fluid");

    var header = main.append("div")
        .attr("class", "navbar-header");

    header.append("a")
        .attr("href", "https://www.nao.ac.jp/")
        .append("img")
        .attr("class", "navbar-left")
        .attr("src", "https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/logo_naoj_nothing_s.png")
        .attr("alt", "NAOJ")
        .attr("max-height", "100%")
        .attr("height", 50);//2.5*emFontSize);//50

    var mainUL = main.append("ul")
        .attr("class", "nav navbar-nav");

    //FITS
    var fitsMenu = mainUL.append("li")
        .attr("class", "dropdown");

    fitsMenu.append("a")
        .attr("class", "dropdown-toggle")
        .attr("data-toggle", "dropdown")
        .style('cursor', 'pointer')
        .html('FITS <span class="fas fa-folder-open"></span> <span class="caret"></span>');

    var fitsDropdown = fitsMenu.append("ul")
        .attr("class", "dropdown-menu");

    fitsDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", show_fits_header)
        .html('display header');

    if (!isLocal && va_count == 1 && (window.location.search.indexOf('ALMA') > 0 || window.location.search.indexOf('ALMB') > 0)) {
        var url = "";

        if (datasetId.localeCompare("ALMA01000000") < 0)
            url = "http://jvo.nao.ac.jp/portal/alma/sv.do?action=download.fits&dataId=";
        else
            url = "http://jvo.nao.ac.jp/portal/alma/archive.do?action=download.fits&dataId=";

        fitsDropdown.append("li")
            .append("a")
            .attr("id", "FITS")
            .attr("href", url + datasetId + '_00_00_00')
            .html('full FITS download <span class="fas fa-save"></span>');
    }
    else {
        let filename = datasetId + ".fits";
        let _url = "get_fits?datasetId=" + encodeURIComponent(datasetId);
        _url += "&filename=" + encodeURIComponent(filename);

        fitsDropdown.append("li")
            .append("a")
            .attr("id", "FITS")
            .attr("href", _url)
            .attr("target", "_blank")
            .attr('download', '')
            .html('full FITS download <span class="fas fa-save"></span>');
    }

    //IMAGE
    var imageMenu = mainUL.append("li")
        .attr("class", "dropdown");

    imageMenu.append("a")
        .attr("class", "dropdown-toggle")
        .attr("data-toggle", "dropdown")
        .style('cursor', 'pointer')
        .html('Image <span class="caret"></span>');

    var imageDropdown = imageMenu.append("ul")
        .attr("id", "imageDropdown")
        .attr("class", "dropdown-menu");
    //.style("background-color", "rgba(0,0,0,0.4)");    

    //PREFERENCES
    var prefMenu = mainUL.append("li")
        .attr("class", "dropdown");

    prefMenu.append("a")
        .attr("class", "dropdown-toggle")
        .attr("data-toggle", "dropdown")
        .style('cursor', 'pointer')
        .html('Preferences <span class="caret"></span>');

    var prefDropdown = prefMenu.append("ul")
        .attr("id", "prefDropdown")
        .attr("class", "dropdown-menu");

    //VIEW
    var viewMenu = mainUL.append("li")
        .attr("class", "dropdown");

    viewMenu.append("a")
        .attr("class", "dropdown-toggle")
        .attr("data-toggle", "dropdown")
        .style('cursor', 'pointer')
        .html('View <span class="caret"></span>');

    var viewDropdown = viewMenu.append("ul")
        .attr("class", "dropdown-menu");

    if (has_webgl) {
        var htmlStr = '<i class="material-icons">3d_rotation</i> 3D surface';
        viewDropdown.append("li")
            .append("a")
            .style('cursor', 'pointer')
            .on("click", function () {
                init_surface();

            })
            .html(htmlStr);
    }
    else {
        viewDropdown.append("li")
            .append("a")
            .attr("disabled", "disabled")
            .style("font-style", "italic")
            .style('cursor', 'not-allowed')
            .html('<span class="fas fa-eye-slash"></span> WebGL not enabled, disabling 3D surface');
    }

    // contours
    htmlStr = displayContours ? '<span class="fas fa-check-square"></span> contour lines' : '<span class="far fa-square"></span> contour lines';
    viewDropdown.append("li")
        .append("a")
        .attr("id", "displayContours")
        .style('cursor', 'pointer')
        .on("click", function () {
            displayContours = !displayContours;
            var htmlStr = displayContours ? '<span class="fas fa-check-square"></span> contour lines' : '<span class="far fa-square"></span> contour lines';
            d3.select(this).html(htmlStr);
            //var elem = d3.selectAll("#contourPlot");

            if (displayContours) {
                d3.select('#contour_control_li').style("display", "block");
            }
            else {
                d3.select('#contour_control_li').style("display", "none");
            }

            if (displayContours) {
                document.getElementById("ContourSVG").style.display = "block";
                //elem.attr("opacity",1);

                //if(document.getElementById('contourPlot') == null)
                if (!has_contours)
                    update_contours();
            }
            else {
                document.getElementById("ContourSVG").style.display = "none";
                //elem.attr("opacity",0);
            }
        })
        .html(htmlStr);

    // gridlines
    htmlStr = displayGridlines ? '<span class="fas fa-check-square"></span> lon/lat grid lines' : '<span class="far fa-square"></span> lon/lat grid lines';
    viewDropdown.append("li")
        .append("a")
        .attr("id", "displayGridlines")
        .style('cursor', 'pointer')
        .on("click", function () {
            displayGridlines = !displayGridlines;
            localStorage_write_boolean("displayGridlines", displayGridlines);
            var htmlStr = displayGridlines ? '<span class="fas fa-check-square"></span> lon/lat grid lines' : '<span class="far fa-square"></span> lon/lat grid lines';
            d3.select(this).html(htmlStr);
            var elem = d3.select("#gridlines");
            if (displayGridlines)
                elem.attr("opacity", 1);
            else
                elem.attr("opacity", 0);
        })
        .html(htmlStr);

    htmlStr = displayLegend ? '<span class="fas fa-check-square"></span> image legend' : '<span class="far fa-square"></span> image legend';
    viewDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", function () {
            displayLegend = !displayLegend;
            localStorage_write_boolean("displayLegend", displayLegend);
            var htmlStr = displayLegend ? '<span class="fas fa-check-square"></span> image legend' : '<span class="far fa-square"></span> image legend';
            d3.select(this).html(htmlStr);

            if (va_count == 1) {
                var elem = d3.select("#legend");

                if (displayLegend)
                    elem.attr("opacity", 1);
                else
                    elem.attr("opacity", 0);
            }
            else {
                for (let index = 1; index <= va_count; index++) {
                    var elem = d3.select("#legend" + index);

                    if (displayLegend)
                        elem.attr("opacity", 1);
                    else
                        elem.attr("opacity", 0);
                }
            }
        })
        .html(htmlStr);

    htmlStr = displaySpectrum ? '<span class="fas fa-check-square"></span> spectrum' : '<span class="far fa-square"></span> spectrum';
    viewDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", function () {
            displaySpectrum = !displaySpectrum;
            localStorage_write_boolean("displaySpectrum", displaySpectrum);
            var htmlStr = displaySpectrum ? '<span class="fas fa-check-square"></span> spectrum' : '<span class="far fa-square"></span> spectrum';
            d3.select(this).html(htmlStr);
            var elem = document.getElementById("SpectrumCanvas");
            if (displaySpectrum) {
                elem.style.display = "block";
                d3.select("#yaxis").attr("opacity", 1);
                d3.select("#ylabel").attr("opacity", 1);
            }
            else {
                elem.style.display = "none";
                d3.select("#yaxis").attr("opacity", 0);
                d3.select("#ylabel").attr("opacity", 0);
            }
        })
        .html(htmlStr);

    //HELP
    var rightUL = main.append("ul")
        .attr("class", "nav navbar-nav navbar-right");

    var helpMenu = rightUL.append("li")
        .attr("class", "dropdown");

    helpMenu.append("a")
        .attr("class", "dropdown-toggle")
        .attr("data-toggle", "dropdown")
        .style('cursor', 'pointer')
        .html('<span class="fas fa-question-circle"></span> Help <span class="caret"></span>');

    var helpDropdown = helpMenu.append("ul")
        .attr("class", "dropdown-menu");

    helpDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", show_help)
        .html('<span class="fas fa-wrench"></span> user guide');

    helpDropdown.append("li")
        .append("a")
        .attr("href", "mailto:help_desk@jvo.nao.ac.jp?subject=" + htmlData.getAttribute('data-server-string') + " feedback [" + htmlData.getAttribute('data-server-version') + "/" + get_js_version() + "]")
        .html('<span class="fas fa-comment-dots"></span> send feedback');

    helpDropdown.append("li")
        .append("a")
        .style("color", "#336699")
        .html("[" + htmlData.getAttribute('data-server-version') + "/" + get_js_version() + "]");
}

function display_dataset_info() {
    var svg = d3.select("#FrontSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    xradec = new Array(null, null);

    /*console.log("RA:", fitsData.OBSRA, fitsData.CTYPE1, "DEC:", fitsData.OBSDEC, fitsData.CTYPE2);
  	
    if (fitsData.OBSRA != '' && fitsData.OBSDEC != '') {
      var ra = ParseRA('+' + fitsData.OBSRA.toString());
      var dec = ParseDec(fitsData.OBSDEC.toString());
      xradec = new Array((ra / 3600.0) / toDegrees, (dec / 3600.0) / toDegrees);
    }
    else
      xradec = new Array(null, null);*/

    if (fitsData.CTYPE1.indexOf("RA") > -1 || fitsData.CTYPE1.indexOf("GLON") > -1 || fitsData.CTYPE1.indexOf("ELON") > -1)
        xradec[0] = (fitsData.CRVAL1 + (fitsData.width / 2 - fitsData.CRPIX1) * fitsData.CDELT1) / toDegrees;

    if (fitsData.CTYPE2.indexOf("DEC") > -1 || fitsData.CTYPE2.indexOf("GLAT") > -1 || fitsData.CTYPE2.indexOf("ELAT") > -1)
        xradec[1] = (fitsData.CRVAL2 + (fitsData.height - fitsData.height / 2 - fitsData.CRPIX2) * fitsData.CDELT2) / toDegrees;

    try {
        d3.select("#information").remove();
    }
    catch (e) {
    }

    var group = svg.append("g")
        .attr("id", "information");

    var object = fitsData.OBJECT.replace(/_/g, " ").trim();

    group.append("text")
        .attr("x", width)
        .attr("y", 4.5 * emFontSize)//7*
        .attr("font-family", "Helvetica")//Arial
        .attr("font-weight", "normal")
        .attr("font-size", "2.5em")
        .attr("text-anchor", "end")
        .attr("stroke", "none")
        .text(object)
        .append("svg:title")
        .text("object name");

    let titleStr = object;

    if (titleStr != "") {
        document.title = titleStr;
    };

    var dateobs = fitsData.DATEOBS;

    if (dateobs == '')
        dateobs = '';//'DATEOBS N/A' ;
    else {
        var pos = dateobs.indexOf('.');

        if (pos >= 0)
            dateobs = dateobs.substr(0, pos);

        dateobs = dateobs.replace(/T/g, " ") + ' ' + fitsData.TIMESYS;
    }

    group.append("text")
        .attr("x", width)
        .attr("y", 6.5 * emFontSize)//6.5 6.0
        .attr("font-family", "Helvetica")
        .attr("font-size", "1.3em")//1.75
        .attr("text-anchor", "end")
        .attr("stroke", "none")
        .attr("opacity", 0.75)
        .text(dateobs)
        .append("svg:title")
        .text("observation date");

    let raText = 'RA N/A';

    if (fitsData.CTYPE1.indexOf("RA") > -1) {
        if (coordsFmt == 'DMS')
            raText = 'α: ' + RadiansPrintDMS(xradec[0]);
        else
            raText = 'α: ' + RadiansPrintHMS(xradec[0]);
    }

    if (fitsData.CTYPE1.indexOf("GLON") > -1)
        raText = 'l: ' + RadiansPrintDMS(xradec[0]);

    if (fitsData.CTYPE1.indexOf("ELON") > -1)
        raText = 'λ: ' + RadiansPrintDMS(xradec[0]);

    group.append("text")
        .attr("id", "ra")
        .attr("x", width)
        .attr("y", 8.5 * emFontSize)//8.5 7.5
        .attr("font-family", "Inconsolata")
        //.attr("font-style", "italic")
        .attr("font-size", "1.5em")
        .attr("text-anchor", "end")
        .attr("stroke", "none")
        .text(raText);
    /*.append("svg:title")
    .text(fitsData.CTYPE1.trim());*/

    let decText = 'DEC N/A';

    if (fitsData.CTYPE2.indexOf("DEC") > -1)
        decText = 'δ: ' + RadiansPrintDMS(xradec[1]);

    if (fitsData.CTYPE2.indexOf("GLAT") > -1)
        decText = 'b: ' + RadiansPrintDMS(xradec[1]);

    if (fitsData.CTYPE2.indexOf("ELAT") > -1)
        decText = 'β: ' + RadiansPrintDMS(xradec[1]);

    group.append("text")
        .attr("id", "dec")
        .attr("x", width)
        .attr("y", 10 * emFontSize)//10 8.75
        .attr("font-family", "Inconsolata")
        //.attr("font-style", "italic")
        .attr("font-size", "1.5em")
        .attr("text-anchor", "end")
        .attr("stroke", "none")
        .text(decText);
    /*.append("svg:title")
    .text(fitsData.CTYPE2.trim());*/

    group.append("text")
        .attr("id", "pixel")
        .attr("x", width)
        .attr("y", 11.5 * emFontSize)//11.5 10
        .attr("font-family", "Inconsolata")
        //.attr("font-style", "italic")
        .attr("font-size", "1.5em")
        .attr("text-anchor", "end")
        .attr("stroke", "none")
        .attr("opacity", 0.0)
        .text("")
        .append("svg:title")
        .text("pixel value (intensity)");

    var val1 = fitsData.CRVAL3 + fitsData.CDELT3 * (1 - fitsData.CRPIX3);
    var val2 = fitsData.CRVAL3 + fitsData.CDELT3 * (fitsData.depth - fitsData.CRPIX3);

    data_band_lo = Math.min(val1, val2);
    data_band_hi = Math.max(val1, val2);
    RESTFRQ = fitsData.RESTFRQ;

    //disable frequency display in multiple-view mode
    if (va_count > 1)
        RESTFRQ = 0;
    else {
        if (RESTFRQ > 0.0)
            has_frequency_info = true;
    }

    if (has_velocity_info && has_frequency_info) {
        var c = 299792.458;//speed of light [km/s]

        var v1 = fitsData.CRVAL3 + fitsData.CDELT3 * (1 - fitsData.CRPIX3);
        v1 /= 1000;//[km/s]

        var v2 = fitsData.CRVAL3 + fitsData.CDELT3 * (fitsData.depth - fitsData.CRPIX3);
        v2 /= 1000;//[km/s]

        var f1 = RESTFRQ * Math.sqrt((1 - v1 / c) / (1 + v1 / c));
        var f2 = RESTFRQ * Math.sqrt((1 - v2 / c) / (1 + v2 / c));

        data_band_lo = Math.min(f1, f2);
        data_band_hi = Math.max(f1, f2);

        //console.log("v1:", v1, "v2:", v2);
        //console.log("f1:", f1, "f2:", f2);
    }
    else if (has_frequency_info) {
        /*if(fitsData.CTYPE3 != "")
        {	    
          //an override due to ALMA data errors: use the no middle-point
          RESTFRQ = (val1+val2)/2 ;//expects [Hz]	
        }*/

        RESTFRQ = (RESTFRQ / 1.0e9).toPrecision(7) * 1.0e9;//slightly rounded, expected unit is [Hz]

        data_band_lo = Math.min(val1, val2);
        data_band_hi = Math.max(val1, val2);
    }

    //console.log("CTYPE3 = ", fitsData.CTYPE3, "has_freq:", has_frequency_info, "has_vel:", has_velocity_info);

    if (has_frequency_info > 0.0 && va_count == 1) {

        var bandStr = '';

        if (fitsData.depth > 1)
            bandStr = '<span style="float:left; font-weight:bold">REF FRQ</span><br><input type="number" id="frequencyInput" min="0" step="0.1" style="width: 6em; color: black; background-color: lightgray; font-size: 1.0em" value="' + (RESTFRQ / 1.0e9).toPrecision(7) + '"> GHz';
        else
            bandStr = '<span style="float:left; font-weight:bold">REF FRQ</span><br><input type="number" id="frequencyInput" min="0" step="0.1" style="width: 6em; color: black; background-color: lightgray; font-size: 1.0em" value="' + (RESTFRQ / 1.0e9).toPrecision(7) + '" disabled> GHz';

        group.append("g")
            .attr("id", "foreignBandG")
            .style("opacity", 0.25)
            .append("foreignObject")
            .attr("id", "foreignBand")
            .attr("x", (width - 20 * emFontSize))
            .attr("y", 12.5 * emFontSize)//12.5
            .attr("width", 20 * emFontSize)
            .attr("height", 7 * emFontSize)
            .on("mouseenter", function () {
                d3.select("#foreignBandG").style("opacity", 1.0);
            })
            .on("mouseleave", function () {
                d3.select("#foreignBandG").style("opacity", 0.25);
            })
            .append("xhtml:div")
            .attr("id", "bandDiv")
            .attr("class", "container-fluid input")
            .style("float", "right")
            .style("padding", "2.5%")
            .append("span")
            .attr("id", "band")
            .html(bandStr);

        var elem = document.getElementById('frequencyInput');
        elem.onblur = submit_corrections;
        elem.onmouseleave = submit_corrections;
        elem.onkeyup = function (e) {
            var event = e || window.event;
            var charCode = event.which || event.keyCode;

            if (charCode == '13') {
                //console.log('REF FRQ ENTER');
                // Enter pressed
                submit_corrections();
                return false;
            }
        }
    }

    if (fitsData.depth > 1 && (/*has_velocity_info ||*/ has_frequency_info)) {
        var velStr = '<span id="redshift" class="redshift" style="float:left; font-weight:bold">SRC&nbsp;</span><input type="radio" id="velV" name="velocity" value="v" style="vertical-align: middle; margin: 0px;" onclick="javascript:toggle_redshift_input_source(this);"> V&nbsp;<input type="radio" id="velZ" name="velocity" value="z" style="vertical-align: middle; margin: 0px;" onclick="javascript:toggle_redshift_input_source(this);"> z&nbsp;<br><span><input type="number" id="velocityInput" step="0.1" style="width: 4.5em; color: black; background-color: lightgray; font-size: 1.0em" value="' + USER_DELTAV + '"></span> <span id="unit">km/s</span><br>';

        if (has_frequency_info)
            velStr += '<label class="small" style="cursor: pointer; font-weight:bold"><input type="checkbox" value="" class="control-label" style="cursor: pointer" id="restcheckbox" onmouseenter="javascript:this.focus();" onchange="javascript:toggle_rest_frequency();">&nbsp;<I>F<SUB>REST</SUB></I></label>'

        var yoffset = 21 * emFontSize;

        if (composite_view)
            yoffset += 1 * emFontSize;

        group.append("g")
            .attr("id", "foreignVelG")
            .style("opacity", 0.25)
            .append("foreignObject")
            .attr("id", "foreignVel")
            .attr("x", (width - 20 * emFontSize))
            .attr("y", yoffset)//(17.5*emFontSize)//19
            .attr("width", 20 * emFontSize)
            .attr("height", 10.0 * emFontSize)
            .on("mouseenter", function () {
                d3.select("#foreignVelG").style("opacity", 1.0);
            })
            .on("mouseleave", function () {
                d3.select("#foreignVelG").style("opacity", 0.25);
            })
            .append("xhtml:div")
            .attr("id", "velDiv")
            .attr("class", "container-fluid input")
            .style("float", "right")
            .style("padding", "2.5%")
            .append("span")
            .attr("id", "vel")
            .html(velStr);

        if (has_frequency_info) {
            var checkbox = document.getElementById('restcheckbox');

            if (sessionStorage.getItem("rest") === null)
                checkbox.checked = false;
            else {
                var checked = sessionStorage.getItem("rest");

                if (checked == "true")
                    checkbox.checked = true;
                else
                    checkbox.checked = false;
            }
        }

        if (sessionStorage.getItem("redshift") === null)
            document.getElementById('velV').setAttribute("checked", "");
        else {
            var value = sessionStorage.getItem("redshift");

            if (value == "z") {
                document.getElementById('velZ').setAttribute("checked", "");
                document.getElementById('unit').style.opacity = "0.0";
            }
            else
                document.getElementById('velV').setAttribute("checked", "");
        }

        //add onblur
        var m = document.getElementById('velocityInput');
        m.onblur = submit_delta_v;
        m.onmouseleave = submit_delta_v;
        m.onkeyup = function (e) {
            var event = e || window.event;
            var charCode = event.which || event.keyCode;

            if (charCode == '13') {
                // Enter pressed
                submit_delta_v();
                return false;
            }
        }

    }

    //add video playback control
    if (fitsData.depth > 1) {
        var yoffset = 32 * emFontSize;

        if (composite_view)
            yoffset += 1 * emFontSize;

        var videoStr = '<span id="videoPlay" class="fas fa-play" style="display:inline-block; cursor: pointer"></span><span id="videoPause" class="fas fa-pause" style="display:none; cursor: pointer"></span>&nbsp; <span id="videoStop" class="fas fa-stop" style="cursor: pointer"></span>&nbsp; <span id="videoForward" class="fas fa-forward" style="cursor: pointer"></span>&nbsp; <span id="videoFastForward" class="fas fa-fast-forward" style="cursor: pointer"></span>';

        group.append("g")
            .attr("id", "videoControlG")
            .style("opacity", 0.25)
            .append("foreignObject")
            .attr("id", "videoControl")
            .attr("x", (width - 20 * emFontSize))
            .attr("y", yoffset)//(17.5*emFontSize)//19
            .attr("width", 20 * emFontSize)
            .attr("height", 5.0 * emFontSize)
            .on("mouseenter", function () {
                d3.select("#videoControlG").style("opacity", 1.0);

                //hide the molecular list (spectral lines) so that it does not obscure the controls!
                displayMolecules_bak = displayMolecules;
                displayMolecules = false;
                document.getElementById('molecularlist').style.display = "none";
            })
            .on("mouseleave", function () {
                d3.select("#videoControlG").style("opacity", 0.25);

                displayMolecules = displayMolecules_bak;

                video_playback = false;
                clearTimeout(video_timeout);
                video_timeout = -1;

                document.getElementById('videoPlay').style.display = "inline-block";
                document.getElementById('videoPause').style.display = "none";

                if (streaming)
                    x_axis_mouseleave();
            })
            .append("xhtml:div")
            .attr("id", "videoDiv")
            .attr("class", "container-fluid input")
            .style("float", "right")
            .style("padding", "2.5%")
            .append("span")
            .attr("id", "vel")
            .html(videoStr);

        document.getElementById('videoPlay').onclick = function () {
            video_playback = true;
            video_period = 10.0;

            if (video_offset == null)
                video_offset = [parseFloat(d3.select("#frequency").attr("x")), parseFloat(d3.select("#frequency").attr("y"))];

            document.getElementById('videoPlay').style.display = "none";
            document.getElementById('videoPause').style.display = "inline-block";

            if (!streaming)
                x_axis_mouseenter(video_offset);

            if (video_timeout < 0)
                replay_video();
        };

        document.getElementById('videoPause').onclick = function () {
            video_playback = false;
            clearTimeout(video_timeout);
            video_timeout = -1;

            document.getElementById('videoPlay').style.display = "inline-block";
            document.getElementById('videoPause').style.display = "none";
        };

        document.getElementById('videoStop').onclick = function () {
            video_playback = false;
            video_offset = null;
            clearTimeout(video_timeout);
            video_timeout = -1;

            document.getElementById('videoPlay').style.display = "inline-block";
            document.getElementById('videoPause').style.display = "none";

            if (streaming)
                x_axis_mouseleave();
        };

        document.getElementById('videoForward').onclick = function () {
            video_playback = true;
            video_period = 5.0;

            if (video_offset == null)
                video_offset = [parseFloat(d3.select("#frequency").attr("x")), parseFloat(d3.select("#frequency").attr("y"))];

            document.getElementById('videoPlay').style.display = "none";
            document.getElementById('videoPause').style.display = "inline-block";

            if (!streaming)
                x_axis_mouseenter(video_offset);

            if (video_timeout < 0)
                replay_video();
        };

        document.getElementById('videoFastForward').onclick = function () {
            video_playback = true;
            video_period = 2.5;

            if (video_offset == null)
                video_offset = [parseFloat(d3.select("#frequency").attr("x")), parseFloat(d3.select("#frequency").attr("y"))];

            document.getElementById('videoPlay').style.display = "none";
            document.getElementById('videoPause').style.display = "inline-block";

            if (!streaming)
                x_axis_mouseenter(video_offset);

            if (video_timeout < 0)
                replay_video();
        };
    }

    var range = get_axes_range(width, height);

    svg.append("text")
        .attr("x", emFontSize / 4 /*width / 2*/)
        //.attr("y", 0.67 * range.yMin)
        .attr("y", 0.70 * range.yMin)
        .attr("font-family", "Helvetica")
        .attr("font-weight", "normal")
        //.attr("font-style", "italic")
        .attr("font-size", 0.75 * range.yMin)
        //.attr("text-anchor", "middle")
        .attr("stroke", "none")
        .attr("opacity", 0.5)//0.25
        //.text("☰ SETTINGS");
        //.text("⚙");
        .text("☰");

    let strokeColour = 'white';

    if (theme == 'bright')
        strokeColour = 'black';

    //add a menu activation area
    svg.append("rect")
        .attr("id", "menu_activation_area")
        .attr("x", 0/*emStrokeWidth*/)
        .attr("y", emStrokeWidth - 1)
        //.attr("width", (width - 2 * emStrokeWidth))
        .attr("width", (width))
        .attr("height", (range.yMin - 2 * emStrokeWidth))
        .attr("fill", "transparent")
        .attr("opacity", 0.1)//was 0.7
        .attr("stroke", strokeColour)//strokeColour or "transparent"
        .style("stroke-dasharray", ("1, 5"))
        .on("mouseenter", function () {
            d3.select(this).attr("opacity", 0);
            document.getElementById('menu').style.display = "block";
        });
}