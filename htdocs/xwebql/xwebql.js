function get_js_version() {
    return "JS2023-07-10.0";
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

d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        this.parentNode.appendChild(this);
    });
};

d3.selection.prototype.moveToBack = function () {
    return this.each(function () {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

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

function send_ping() {
    if (wsConn != null) {
        t = performance.now();
        wsConn.send('[heartbeat] ' + t);
    }
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

        fitsData = null;

        frame_multiplier = 1;
        imageData = null;
        initKalmanFilter = false;
        windowLeft = false;
        streaming = false;
        video_playback = false;
        video_offset = null;
        video_timeout = -1;
        line_pos = -1;
        idleMouse = -1;
        idleVideo = -1;
        moving = false;
        enedrag = false;
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
        lines = [];

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

        // displayIntensity = localStorage_read_number("displayIntensity", -1);
        displayIntensity = 0.5;
        displayLimit = localStorage_read_number("displayLimit", 500);

        coordsFmt = localStorage_read_string("coordsFmt", "HMS");//DMS or HMS
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
        displayLines = localStorage_read_boolean("displayLines", true);
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

        var width = Math.round(rect.width - 20);
        var height = Math.round(rect.height - 20);

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

        d3.select("body").append("div")
            .attr("id", "lineidentification")
            .attr("class", "molecularmodal");

        await res3d; display_menu();

        setup_help();

        setup_FITS_header_page();

        /*if (welcome)
            show_welcome();*/

        display_hourglass();
        show_heartbeat();
        poll_heartbeat();

        imageContainer = null;
        wsConn = null;

        dataset_timeout = -1;
        open_websocket_connection(datasetId);
        fetch_image_spectrum(datasetId, true, false);
        fetch_spectral_lines(datasetId, 0, 0);

    };

    firstTime = false;
}

async function fetch_spectral_lines(datasetId, ene_start, ene_end) {
    var xmlhttp = new XMLHttpRequest();

    //ene_start, ene_end [keV]
    var url = 'get_atomdb?datasetId=' + encodeURIComponent(datasetId) + '&ene_start=' + ene_start + '&ene_end=' + ene_end + '&' + encodeURIComponent(get_js_version());

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 404) {
            console.log("No spectral lines found.");
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 502) {
            console.log("Connection error, re-fetching spectral lines after 1 second.");
            setTimeout(function () {
                fetch_spectral_lines(datasetId, ene_start, ene_end);
            }, 1000);
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 202) {
            console.log("Server not ready, long-polling spectral lines again after 500 ms.");
            setTimeout(function () {
                fetch_spectral_lines(datasetId, ene_start, ene_end);
            }, 500);
        }

        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            lines = []; // a global variable

            try {
                var response = JSON.parse(xmlhttp.responseText);
                lines = response.lines;
            } catch (err) {
                var received_msg = xmlhttp.response;

                if (received_msg instanceof ArrayBuffer) {

                    try {
                        // bzip2 decoder 
                        var bytes = new Uint8Array(received_msg);
                        jsonData = bzip2.simple(bzip2.array(bytes));

                        var response = JSON.parse(jsonData);
                        lines = response.lines;
                    } catch (e) {
                        console.log(e);
                    };
                };
            };

            index_lines();
            console.log("#ATOMDB lines: ", lines.length);

            if (fitsData != null) {
                if (fitsData.depth > 1)
                    display_lines();
            }
        }
    }

    xmlhttp.open("GET", url, true);

    sv = htmlData.getAttribute('data-server-version');

    if (sv.charAt(0) == 'J') {
        xmlhttp.responseType = 'arraybuffer';
    }

    xmlhttp.timeout = 0;
    xmlhttp.send();
};

async function fetch_image_spectrum(_datasetId, fetch_data, add_timestamp) {
    var rect = document.getElementById('mainDiv').getBoundingClientRect();
    var width = Math.round(rect.width - 20);
    var height = Math.round(rect.height - 20);

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

                            try {
                                display_scale_info();
                            }
                            catch (err) {
                            };

                            display_preferences();

                            display_FITS_header();

                            frame_start = 0;
                            frame_end = fitsData.depth - 1;

                            if (fitsData.depth > 1) {
                                setup_axes();

                                plot_spectrum(fitsData.spectrum);

                                if (lines.length > 0)
                                    display_lines();
                            }
                        }

                        // image
                        {
                            //console.log("processing an HDR image");
                            let start = performance.now();

                            // decompressZFP returns std::vector<float>
                            // decompressZFPimage returns Float32Array but emscripten::typed_memory_view is buggy
                            var res = Module.decompressZFPimage(img_width, img_height, frame_pixels);
                            const pixels = Module.HEAPF32.slice(res[0] / 4, res[0] / 4 + res[1]);

                            var res = Module.decompressLZ4mask(img_width, img_height, frame_mask);
                            const alpha = Module.HEAPU8.slice(res[0], res[0] + res[1]);

                            let elapsed = Math.round(performance.now() - start);

                            console.log("image width: ", img_width, "height: ", img_height, "elapsed: ", elapsed, "[ms]");

                            process_hdr_image(img_width, img_height, pixels, alpha, min_count, max_count);

                            if (has_json) {
                                // display_histogram(index);

                                try {
                                    display_gridlines();
                                }
                                catch (err) {
                                    console.log("display_gridlines:", err);
                                }
                            }

                            try {
                                display_legend();
                            } catch (err) {
                                console.log("display_legend:", err);
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

    if (!isLocal && (window.location.search.indexOf('ALMA') > 0 || window.location.search.indexOf('ALMB') > 0)) {
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

            var elem = d3.select("#legend");

            if (displayLegend)
                elem.attr("opacity", 1);
            else
                elem.attr("opacity", 0);
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

    /*console.log("RA:", fitsData.RA_OBJ, fitsData.CTYPE1, "DEC:", fitsData.DEC_OBJ, fitsData.CTYPE2);
  	
    if (fitsData.RA_OBJ != '' && fitsData.DEC_OBJ != '') {
      var ra = ParseRA('+' + fitsData.RA_OBJ.toString());
      var dec = ParseDec(fitsData.DEC_OBJ.toString());
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
    console.log("[log] data_band_lo: " + data_band_lo + " data_band_hi: " + data_band_hi);

    // convert data_band_lo and data_band_hi from natural log scale to linear scale [keV]
    data_band_lo = Math.exp(data_band_lo) / 1000;
    data_band_hi = Math.exp(data_band_hi) / 1000;
    console.log("[linear] data_band_lo: " + data_band_lo + " data_band_hi: " + data_band_hi + " [keV]");

    //add video playback control
    if (fitsData.depth > 1) {
        var yoffset = 12.5 * emFontSize;

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

                //hide the line identification list so that it does not obscure the controls!
                displayLines_bak = displayLines;
                displayLines = false;
                document.getElementById('lineidentification').style.display = "none";
            })
            .on("mouseleave", function () {
                d3.select("#videoControlG").style("opacity", 0.25);

                displayLines = displayLines_bak;

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
                video_offset = [parseFloat(d3.select("#energy").attr("x")), parseFloat(d3.select("#energy").attr("y"))];

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
                video_offset = [parseFloat(d3.select("#energy").attr("x")), parseFloat(d3.select("#energy").attr("y"))];

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
                video_offset = [parseFloat(d3.select("#energy").attr("x")), parseFloat(d3.select("#energy").attr("y"))];

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

function get_axes_range(width, height) {
    var xMin = 0.025 * width;
    var xMax = width - xMin - 1;

    var yMin = 0.05 * height;
    var yMax = height - yMin - 1;

    var range = {
        xMin: Math.round(xMin),
        xMax: Math.round(xMax),
        yMin: Math.round(yMin),
        yMax: Math.round(yMax)
    };

    return range;
}

function display_scale_info() {
    // add the markers anyway (they are needed by the P-V diagram)
    var svg = d3.select("#BackgroundSVG");
    var width = parseFloat(svg.attr("width"));
    var defs = svg.append("defs");

    defs.append("marker")
        .attr("id", "head")
        .attr("orient", "auto")
        .attr("markerWidth", (emStrokeWidth))
        .attr("markerHeight", (0.5 * emFontSize))
        .attr("refX", 0)
        .attr("refY", (0.5 * emFontSize / 2))
        .append("path")
        .style("stroke-width", 1)
        .attr("d", "M0,0 V" + 0.5 * emFontSize);

    defs.append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 0.67 * emFontSize)
        .attr("markerHeight", 0.67 * emFontSize)
        .attr("orient", "auto")
        .append("path")
        .style("stroke-width", 1)
        .style("fill", "none")
        .attr("d", "M-5,-5 L5,0 L-5,5");

    if (fitsData.depth > 1)
        return;

    var elem = document.getElementById("image_rectangle");
    if (elem == null)
        return;

    var img_width = parseFloat(elem.getAttribute("width"));
    var img_height = parseFloat(elem.getAttribute("height"));
    var img_x = parseFloat(elem.getAttribute("x"));
    var img_y = parseFloat(elem.getAttribute("y"));

    var image = imageContainer;
    var image_bounding_dims = image.image_bounding_dims;
    var scale = image.height / image_bounding_dims.height;

    //scale
    var arcmins = 60;
    var gridScale = inverse_CD_matrix(arcmins, arcmins);

    for (let i = 0; i < gridScale.length; i++)
        if (isNaN(gridScale[i]))
            throw "NaN gridScale";

    if (Math.abs(gridScale[1]) * scale > 1) {
        //reduce the scale
        //console.log("Vertical height:", Math.abs(gridScale[1]) * scale);

        arcmins = 10;
        gridScale = inverse_CD_matrix(arcmins, arcmins);

        for (let i = 0; i < gridScale.length; i++)
            if (isNaN(gridScale[i]))
                throw "NaN gridScale";

        //console.log("Reduced vertical height:", Math.abs(gridScale[1]) * scale);
    }

    //vertical scale	
    var L = Math.abs(gridScale[1]) * scale * img_height;
    var X = 1 * emFontSize;
    if (composite_view)
        X += img_x + img_width;
    //var Y = L + img_y;//1.75 * emFontSize;
    var Y = img_y + img_height;

    var vert = svg.append("g")
        .attr("id", "verticalScale");

    vert.append("path")
        .attr("marker-end", "url(#head)")
        .attr("marker-start", "url(#head)")
        .style("stroke-width", (emStrokeWidth))
        .style("fill", "none")
        .attr("d", "M" + X + "," + Y + " L" + X + "," + (Y - L));

    vert.append("text")
        .attr("x", (X + emFontSize))
        .attr("y", (Y - L / 2 + emFontSize / 3))
        .attr("font-family", "Monospace")
        .attr("font-size", "1.0em")
        .attr("text-anchor", "middle")
        .attr("stroke", "none")
        .text(arcmins + "\"");

    //N-E compass
    var L = 3 * emFontSize;//*Math.sign(gridScale[0]) ;
    var X = 0.02 * width + L + 1.5 * emFontSize;
    var Y = Y - L / 2;
    if (composite_view)
        X += img_x + img_width;
    //var Y = 0.01*width + L + emFontSize;
    //var Y = L + img_y;//Math.max(Y - 1.5 * emFontSize, 0.01 * width + L + emFontSize);

    //rotation
    var compass = svg.append("g")
        .attr("id", "compass")
        .attr("transform", 'rotate(' + gridScale[2] * Math.sign(gridScale[0]) + ' ' + X + ' ' + Y + ')');

    var east = compass.append("g")
        .attr("id", "east");

    east.append("path")
        .attr("marker-end", "url(#arrow)")
        .style("stroke-width", (emStrokeWidth))
        .style("fill", "none")
        .attr("d", "M" + X + "," + Y + " L" + (X + L * Math.sign(gridScale[0])) + "," + Y);

    east.append("text")
        .attr("x", (X + L * Math.sign(gridScale[0]) + Math.sign(gridScale[0]) * emFontSize / 2))
        .attr("y", (Y + emFontSize / 2.5))
        .attr("font-family", "Monospace")
        .attr("font-size", "1.0em")
        .attr("text-anchor", "middle")
        .attr("stroke", "none")
        .text("E");

    var north = compass.append("g")
        .attr("id", "north");

    L *= Math.sign(gridScale[1]);

    north.append("path")
        .attr("marker-end", "url(#arrow)")
        .style("stroke-width", (emStrokeWidth))
        .style("fill", "none")
        .attr("d", "M" + X + "," + Y + " L" + X + "," + (Y - L));

    if (L > 0)
        north.append("text")
            .attr("x", (X))
            .attr("y", (Y - L - emFontSize / 4))
            .attr("font-family", "Monospace")
            .attr("font-size", "1.1em")
            .attr("text-anchor", "middle")
            .attr("stroke", "none")
            .text("N");
    else
        north.append("text")
            .attr("x", (X))
            .attr("y", (Y - L + emFontSize))
            .attr("font-family", "Monospace")
            .attr("font-size", "1.0em")
            .attr("text-anchor", "middle")
            .attr("stroke", "none")
            .text("N");
}

function display_preferences() {
    if (has_preferences)
        return;

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

    var range = get_axes_range(svgWidth, svgHeight);

    group.append("text")
        .attr("id", "fps")
        .attr("x", range.xMax - 0.25 * emFontSize)
        //.attr("y", offset)
        .attr("y", bottomY)
        .attr("font-family", "Inconsolata")
        //.attr("font-weight", "bold")
        .attr("font-size", "0.75em")//0.75 Helvetica
        .attr("text-anchor", "end")
        .attr("fill", fillColour)
        .attr("stroke", "none")
        .attr("opacity", 0.75)
        .text("");

    var prefDropdown = d3.select("#prefDropdown");

    var htmlStr = autoscale ? '<span class="fas fa-check-square"></span> autoscale y-axis' : '<span class="far fa-square"></span> autoscale y-axis';
    prefDropdown.append("li")
        .append("a")
        .attr("id", "autoscale")
        .style('cursor', 'pointer')
        .on("click", function () {
            autoscale = !autoscale;
            //localStorage_write_boolean("autoscale", autoscale) ;

            d3.select("#yaxis")
                .style("fill", "white")
                .style("stroke", "white")
                .transition()
                .duration(500)
                .style("fill", axisColour)
                .style("stroke", axisColour);

            if (!autoscale)
                set_autoscale_range(true);
            else
                enable_autoscale();
        })
        .html(htmlStr);

    var htmlStr = displayDownloadConfirmation ? '<span class="fas fa-check-square"></span> download confirmation' : '<span class="far fa-square"></span> download confirmation';
    prefDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", function () {
            displayDownloadConfirmation = !displayDownloadConfirmation;
            localStorage_write_boolean("displayDownloadConfirmation", displayDownloadConfirmation);
            var htmlStr = displayDownloadConfirmation ? '<span class="fas fa-check-square"></span> download confirmation' : '<span class="far fa-square"></span> download confirmation';
            d3.select(this).html(htmlStr);
        })
        .html(htmlStr);

    var htmlStr = displayScalingHelp ? '<span class="fas fa-check-square"></span> display pop-up help' : '<span class="far fa-square"></span> display pop-up help';
    prefDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", function () {
            displayScalingHelp = !displayScalingHelp;
            localStorage_write_boolean("displayScalingHelp", displayScalingHelp);
            var htmlStr = displayScalingHelp ? '<span class="fas fa-check-square"></span> display pop-up help' : '<span class="far fa-square"></span> display pop-up help';
            d3.select(this).html(htmlStr);
        })
        .html(htmlStr);

    var htmlStr = realtime_spectrum ? '<span class="fas fa-check-square"></span> realtime spectrum updates' : '<span class="far fa-square"></span> realtime spectrum updates';
    prefDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", function () {
            realtime_spectrum = !realtime_spectrum;
            localStorage_write_boolean("realtime_spectrum", realtime_spectrum);
            var htmlStr = realtime_spectrum ? '<span class="fas fa-check-square"></span> realtime spectrum updates' : '<span class="far fa-square"></span> realtime spectrum updates';
            d3.select(this).html(htmlStr);
        })
        .html(htmlStr);

    var htmlStr = realtime_video ? '<span class="fas fa-check-square"></span> realtime video updates' : '<span class="far fa-square"></span> realtime video updates';
    prefDropdown.append("li")
        .append("a")
        .style('cursor', 'pointer')
        .on("click", function () {
            realtime_video = !realtime_video;
            localStorage_write_boolean("realtime_video", realtime_video);
            var htmlStr = realtime_video ? '<span class="fas fa-check-square"></span> realtime video updates' : '<span class="far fa-square"></span> realtime video updates';
            d3.select(this).html(htmlStr);

            if (realtime_video) {
                d3.select('#video_fps_control_li').style("display", "block");
            }
            else {
                d3.select('#video_fps_control_li').style("display", "none");
            }
        })
        .html(htmlStr);

    //----------------------------------------
    var tmpA;

    tmpA = prefDropdown.append("li")
        .attr("id", "image_quality_li")
        //.style("background-color", "#FFF")
        .append("a")
        .style("class", "form-group")
        .attr("class", "form-horizontal");

    tmpA.append("label")
        .attr("for", "image_quality")
        .attr("class", "control-label")
        .html("image quality:&nbsp; ");

    tmpA.append("select")
        .attr("id", "image_quality")
        .attr("onchange", "javascript:change_image_quality();")
        .html("<option>high</option><option>medium</option><option>low</option>");

    document.getElementById('image_quality').value = image_quality;

    if (realtime_video) {
        d3.select('#video_fps_control_li').style("display", "block");
    }
    else {
        d3.select('#video_fps_control_li').style("display", "none");
    }

    //----------------------------------------	
    tmpA = prefDropdown.append("li")
        .attr("id", "video_fps_control_li")
        //.style("background-color", "#FFF")
        .append("a")
        .style("class", "form-group")
        .attr("class", "form-horizontal");

    tmpA.append("label")
        .attr("for", "video_fps_control")
        .attr("class", "control-label")
        .html("video fps control:&nbsp; ");

    tmpA.append("select")
        .attr("id", "video_fps_control")
        .attr("onchange", "javascript:change_video_fps_control();")
        .html("<option value='auto'>auto</option><option value='5'>5 fps</option><option value='10'>10 fps</option><option value='20'>20 fps</option><option value='30'>30 fps</option>");

    document.getElementById('video_fps_control').value = video_fps_control;

    if (realtime_video) {
        d3.select('#video_fps_control_li').style("display", "block");
    }
    else {
        d3.select('#video_fps_control_li').style("display", "none");
    }

    //ui_theme
    {
        tmpA = prefDropdown.append("li")
            //.style("background-color", "#FFF")	
            .append("a")
            .style("class", "form-group")
            .attr("class", "form-horizontal");

        tmpA.append("label")
            .attr("for", "ui_theme")
            .attr("class", "control-label")
            .html("ui theme:&nbsp; ");

        tmpA.append("select")
            //.attr("class", "form-control")	
            .attr("id", "ui_theme")
            .attr("onchange", "javascript:change_ui_theme();")
            .html("<option>dark</option><option>bright</option>");

        document.getElementById('ui_theme').value = theme;
    }

    //coords_fmt
    {
        tmpA = prefDropdown.append("li")
            //.style("background-color", "#FFF")	
            .append("a")
            .style("class", "form-group")
            .attr("class", "form-horizontal");

        tmpA.append("label")
            .attr("for", "coords_fmt")
            .attr("class", "control-label")
            .html("RA (<i>α</i>) display:&nbsp; ");

        tmpA.append("select")
            //.attr("class", "form-control")	
            .attr("id", "coords_fmt")
            .attr("onchange", "javascript:change_coords_fmt();")
            .html("<option>HMS</option><option>DMS</option>");

        document.getElementById('coords_fmt').value = coordsFmt;
    }

    tmpA = prefDropdown.append("li")
        .attr("id", "contour_control_li")
        //.style("background-color", "#FFF")
        .append("a")
        .style("class", "form-group")
        .attr("class", "form-horizontal");

    tmpA.append("label")
        .attr("for", "contour_lines")
        .attr("class", "control-label")
        .html("#contour levels:&nbsp; ");

    previous_contour_lines = 5;

    tmpA.append("input")
        //.attr("class", "form-control")	
        .attr("id", "contour_lines")
        .attr("type", "number")
        .style("width", "3em")
        .attr("min", 1)
        .attr("step", 1)
        .attr("value", previous_contour_lines);
    //.attr("onchange", "javascript:update_contours();");    

    var elem = document.getElementById('contour_lines');
    elem.onblur = validate_contour_lines;
    elem.onmouseleave = validate_contour_lines;
    elem.onkeyup = function (e) {
        var event = e || window.event;
        var charCode = event.which || event.keyCode;

        if (charCode == '13') {
            // Enter pressed
            validate_contour_lines();
            return false;
        }
    }

    if (displayContours) {
        d3.select('#contour_control_li').style("display", "block");
    }
    else {
        d3.select('#contour_control_li').style("display", "none");
    }

    //----------------------------------------
    if (fitsData.depth > 1) {
        tmpA = prefDropdown.append("li")
            //.style("background-color", "#FFF")
            .append("a")
            .style("class", "form-group")
            .attr("class", "form-horizontal");

        tmpA.append("label")
            .attr("for", "intensity_mode")
            .attr("class", "control-label")
            .html("intensity mode:&nbsp; ");

        tmpA.append("select")
            .attr("id", "intensity_mode")
            .attr("onchange", "javascript:change_intensity_mode();")
            .html("<option>mean</option><option>integrated</option>");

        document.getElementById('intensity_mode').value = intensity_mode;
    }

    tmpA = prefDropdown.append("li")
        //.style("background-color", "#FFF")	
        .append("a")
        .style("class", "form-group")
        .attr("class", "form-horizontal");

    tmpA.append("label")
        .attr("for", "zoom_shape")
        .attr("class", "control-label")
        .html("zoom shape:&nbsp; ");

    tmpA.append("select")
        //.attr("class", "form-control")	
        .attr("id", "zoom_shape")
        .attr("onchange", "javascript:change_zoom_shape();")
        .html("<option>circle</option><option>square</option>");

    document.getElementById('zoom_shape').value = zoom_shape;
    //----------------------------------------

    has_preferences = true;
}


function validate_contour_lines() {
    var value = document.getElementById('contour_lines').valueAsNumber;

    if (isNaN(value))
        document.getElementById('contour_lines').value = previous_contour_lines;

    if (value < 2)
        document.getElementById('contour_lines').value = 2;

    if (value > 10)
        document.getElementById('contour_lines').value = 10;

    value = document.getElementById('contour_lines').valueAsNumber;

    if (value != previous_contour_lines) {
        previous_contour_lines = value;
        update_contours();
    }
}

function setup_help() {
    var div = d3.select("body")
        .append("div")
        .attr("class", "container")
        .append("div")
        .attr("id", "help")
        .attr("class", "modal fade")
        .attr("role", "dialog")
        .append("div")
        .attr("class", "modal-dialog");

    var contentDiv = div.append("div")
        .attr("class", "modal-content");

    var headerDiv = contentDiv.append("div")
        .attr("class", "modal-header");

    headerDiv.append("span")
        .attr("id", "helpclose")
        .attr("class", "close")
        .style("color", "red")
        .text("×");

    headerDiv.append("h2")
        .text("XWEBQLSE HOW-TO");

    var bodyDiv = contentDiv.append("div")
        .attr("id", "modal-body")
        .attr("class", "modal-body");

    bodyDiv.append("h3")
        .text("3D View");

    bodyDiv.append("p")
        .html("An <span style=\"color:#a94442\">experimental</span> WebGL feature resulting in high memory consumption. After using it a few times a browser may run out of memory.");

    bodyDiv.append("p")
        .html("Reloading a page should fix the problem");

    /*bodyDiv.append("p")
    .html("To enable it check <i>Preferences</i>/<i>3D View (experimental)</i> and a \"3D View\" button should appear towards the bottom of the page") ;*/

    bodyDiv.append("p")
        .html("To view a 3D surface of the FITS cube image, click <i>3D surface</i> in the <i>View</i> menu");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .attr("id", "realtime_h3")
        .text("Realtime Spectrum Updates");

    bodyDiv.append("p")
        .html("<i>Preferences/realtime spectrum updates</i> works best over <i>low-latency</i> network connections");

    bodyDiv.append("p")
        .html("<i>Kalman Filter</i> is used to predict the mouse movement after taking into account a latency of a network connection to Japan");

    bodyDiv.append("p")
        .html("when disabled the spectrum refresh will be requested after a 250ms delay since the last movement of the mouse");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .attr("id", "h3")
        .text("Realtime FITS Cube Video Updates");

    bodyDiv.append("p")
        .html("<i>Preferences/realtime video updates</i> works best over <i>low-latency</i> network connections with available bandwidth <i>over 1 mbps</i>");

    bodyDiv.append("p")
        .html("when disabled the FITS cube video frame will be requested after a 250ms delay since the last movement of the mouse");

    bodyDiv.append("p")
        .html('<span class="fas fa-play"></span>&nbsp; replay period 10s');

    bodyDiv.append("p")
        .html('<span class="fas fa-forward"></span>&nbsp; replay period 5s');

    bodyDiv.append("p")
        .html('<span class="fas fa-fast-forward"></span>&nbsp; replay period 2.5s');

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Zoom In/Out of region");

    bodyDiv.append("p")
        .html("scroll mouse wheel up/down (<i>mouse</i>)");

    bodyDiv.append("p")
        .html("move two fingers up/down (<i>touchpad</i>)");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Copy RA/DEC");

    bodyDiv.append("p")
        .html("<b>Ctrl + C</b>");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Save region as FITS");

    bodyDiv.append("p")
        .html("<b>Ctrl + S</b> (<i>keyboard</i>)");

    bodyDiv.append("p")
        .html("drag over main image (<i>mouse</i>)");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Show Energy Information");

    bodyDiv.append("p")
        .html("<b>hover</b> a mouse over X-axis");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Skip to the Next Molecular Line");

    bodyDiv.append("p")
        .html("press <b>&larr;</b> or <b>&rarr;</b> whilst <b>hovering</b> over X-axis");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Jump to Splatalogue");

    bodyDiv.append("p")
        .html("press <b>Enter</b> whilst <b>hovering</b> over X-axis");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Select Energy Range");

    bodyDiv.append("p")
        .html("<b>drag</b> over X-axis");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Temporarily Fix Y-Axis Range");

    bodyDiv.append("p")
        .html("press <b>s</b> over main image");

    bodyDiv.append("h4")
        .text("adjust the fixed Y-Axis range");

    bodyDiv.append("p")
        .html("move mouse cursor over to the Y-Axis whilst holding the 「Shift」 key");

    bodyDiv.append("p")
        .html("drag the mouse over the Y-Axis to <i>shift</i> it <em>UP</em> and <em>DOWN</em>");

    bodyDiv.append("p")
        .html("use the mouse <i>scroll wheel</i> or a two-finger <i>touch gesture</i> to <i>re-scale</i> the Y-Axis range");

    var vid = bodyDiv.append("video")
        .attr("width", "100%")
        .attr("controls", "")
        .attr("preload", "metadata");

    vid.append("source")
        .attr("src", "https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/fixed_scale_y_axis.mp4");

    vid.append("p")
        .html("Your browser does not support the video tag.");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Hold current view region");

    bodyDiv.append("p")
        .html("keep pressing <b>↑Shift</b>");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("Print");

    bodyDiv.append("p")
        .html("in a browser <i>File/Print Preview</i>, adjust scale as needed (i.e. 25% or 50%)");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .text("browser support:");

    bodyDiv.append("p")
        .text("Chrome ◯, Firefox △, Safari ◯, MS Edge △, IE11 ×");

    var footer = contentDiv.append("div")
        .attr("class", "modal-footer");

    if (!isLocal) {
        footer.append("h3")
            .text("FITSWebQL Personal Edition:");

        let textColour = 'yellow';

        if (theme == 'bright')
            textColour = 'red';

        footer.append("p")
            .html("A local version is available on GitHub: ")
            .append("a")
            .style("color", textColour)
            .attr("href", "https://github.com/jvo203/fits_web_ql")
            .attr("target", "_blank")
            .style("target-new", "tab")
            .html("<b>fits_web_ql installation instructions</b>");
    }

    footer.append("h3")
        .text("CREDITS:");

    footer.append("p")
        .text("Site design Ⓒ Christopher A. Zapart @ NAOJ, 2015 - 2023. JavaScript RA/DEC conversion Ⓒ Robert Martin Ayers, 2009, 2011, 2014.");

    footer.append("h3")
        .text("VERSION:");

    footer.append("p")
        .text(htmlData.getAttribute('data-server-version') + "/" + get_js_version());
}

function setup_FITS_header_page() {
    var div = d3.select("body")
        .append("div")
        .attr("class", "container")
        .append("div")
        .attr("id", "fitsHeader")
        .attr("class", "modal fade")
        .attr("role", "dialog")
        .append("div")
        .attr("class", "modal-dialog");

    var contentDiv = div.append("div")
        .attr("class", "modal-content");

    var headerDiv = contentDiv.append("div")
        .attr("class", "modal-header");

    headerDiv.append("span")
        .attr("id", "fitsHeaderClose")
        .attr("class", "close")
        .style("color", "red")
        .text("×");

    var title = headerDiv.append("h3")
        .text("FITS HEADER");

    var bodyDiv = contentDiv.append("div")
        .attr("id", "modal-body")
        .attr("class", "modal-body");

    var p = bodyDiv.append("p")
        .attr("id", "headerText");

    var it = p.append("I")
        .text("FITS HEADER data not transmitted yet. Please try later.");
}

function display_FITS_header() {
    try {
        var fitsHeader = fitsData.HEADER;
        var headerText = document.getElementById('headerText');
        headerText.innerHTML = fitsHeader.trim();//.replace(/(.{80})/g, "$1<br/>");        
    }
    catch (e) {
        console.log(e);
    };
}

function get_spectrum_margin() {
    return 0.1;
}

function E2T(energy) {
    // Boltzmann constant
    const k = 8.6173303e-5; // eV/K

    return energy / k;
}

function setup_axes() {
    if (fitsData.depth <= 1)
        return;

    try {
        d3.select("#axes").remove();
        d3.select("#foreignCSV").remove();
    }
    catch (e) {
    }

    var svg = d3.select("#BackSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    svg = svg.append("g").attr("id", "axes");

    let spectrum = fitsData.spectrum;
    data_min = Math.max(d3.min(spectrum), 1); // omit zero counts
    data_max = d3.max(spectrum);

    var dmin = data_min;
    var dmax = data_max;

    if (dmin == dmax) {
        if (dmin == 0.0 && dmax == 0.0) {
            dmin = -1.0;
            dmax = 1.0;
        } else {
            if (dmin > 0.0) {
                dmin *= 0.99;
                dmax *= 1.01;
            };

            if (dmax < 0.0) {
                dmax *= 0.99;
                dmin *= 1.01;
            }
        }
    }

    var interval = dmax - dmin;
    var range = get_axes_range(width, height);

    var xR = d3.scaleLog()
        .range([range.xMin, range.xMax])
        .domain([data_band_lo, data_band_hi]);

    var xT = d3.scaleLog()
        .range([range.xMin, range.xMax])
        .domain([E2T(1000 * data_band_lo), E2T(1000 * data_band_hi)]); // keV to eV

    var yR = d3.scaleLog()
        .range([range.yMax, range.yMin])
        .domain([dmin, dmax + get_spectrum_margin() * interval]);

    var xAxis = d3.axisTop(xR)
        .tickSizeOuter([3])
        .ticks(7);

    var TAxis = d3.axisBottom(xT)
        .tickSizeOuter([3])
        .ticks(7);

    var yAxis = d3.axisRight(yR)
        .tickSizeOuter([3]);

    //x-axis label
    //var strXLabel = '<I>E<SUB>' + 'log' + '</SUB></I> [log eV]';
    var strXLabel = '<I>ENERGY [keV]';

    svg.append("foreignObject")
        .attr("x", (2 * range.xMin + 1.5 * emFontSize))
        .attr("y", (height - 3.5 * emFontSize))
        .attr("width", 20 * emFontSize)
        .attr("height", 2 * emFontSize)
        .append("xhtml:div")
        .attr("id", "energy_display")
        .style("display", "inline-block")
        .attr("class", "axis-label")
        .html(strXLabel);

    // Add the X Axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "xaxis")
        .style("fill", axisColour)
        .style("stroke", axisColour)
        //.style("stroke-width", emStrokeWidth)
        .attr("transform", "translate(0," + (height - 1) + ")")
        .call(xAxis);

    //y-axis label
    var yLabel = "EVENTS";

    var bunit = '';
    if (fitsData.BUNIT != '') {
        bunit = fitsData.BUNIT.trim();

        bunit = "[" + bunit + "]";
    }

    svg.append("text")
        .attr("id", "ylabel")
        .attr("x", (-height + 2 * range.xMin + 1.5 * emFontSize)/*-0.75*height*/)
        .attr("y", 1.25 * emFontSize + 0 * range.xMin)
        .attr("font-family", "Inconsolata")
        .attr("font-size", "1.25em")
        .attr("text-anchor", "start")
        .style("fill", "darkgray")
        //.style("opacity", 0.7)
        .attr("stroke", "none")
        .attr("transform", "rotate(-90)")
        .text(yLabel + " " + bunit);

    // Add the T Axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "taxis")
        .style("fill", axisColour)
        .style("stroke", axisColour)
        //.style("stroke-width", emStrokeWidth)        
        .call(TAxis);

    var strTLabel = "<I>TEMPERATURE</I> [K]";
    var ypos = 2.0 * emFontSize;

    //z-axis label
    svg.append("foreignObject")
        .attr("x", (2 * range.xMin + 1.5 * emFontSize))
        //.attr("y", (0.02*height+1.5*emFontSize))
        .attr("y", ypos)
        .attr("width", 20 * emFontSize)
        .attr("height", 2 * emFontSize)
        .append("xhtml:div")
        .attr("id", "temperature_display")
        .style("display", "inline-block")
        .attr("class", "axis-label")
        .html(strTLabel);

    // Add the Y Axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "yaxis")
        .style("fill", axisColour)
        .style("stroke", axisColour)
        //.style("stroke-width", emStrokeWidth)
        .attr("transform", "translate(" + (0.75 * range.xMin - 1) + ",0)")
        .call(yAxis);

    {
        svg.append("line")
            .attr("id", "ene_bar")
            .attr("x1", range.xMin)
            .attr("y1", 0)
            .attr("x2", range.xMin)
            .attr("y2", height - 1)
            .style("stroke", "white")
            //.style("stroke-dasharray", ("5, 5, 1, 5"))
            .style("stroke-width", 2 * emStrokeWidth)
            .attr("opacity", 0.0);
    }

    //add the x-axis energy range selection shadow rectangle
    svg.append("rect")
        .attr("id", "fregion")
        .attr("x", range.xMin)
        .attr("y", 0)
        .attr("width", (range.xMax - range.xMin))
        .attr("height", height - 1)
        .attr("fill", "gray")//"gray"
        .style("stroke-dasharray", ("1, 5, 1, 1"))
        .style("mix-blend-mode", "difference")
        .attr("opacity", 0.0)
        .moveToBack();

    try {
        d3.select("#axes_selection").remove();
    }
    catch (e) {
    }

    var svg = d3.select("#FrontSVG");

    var group = svg.append("g").attr("id", "axes_selection");

    var patternScale = Math.ceil(((range.xMax - range.xMin) / 200 / 4));

    var patternPath = 'M' + (-1 * patternScale) + ',' + (1 * patternScale) + ' l' + (2 * patternScale) + ',' + (-2 * patternScale) + ' M0,' + (4 * patternScale) + ' l' + (4 * patternScale) + ',' + (-4 * patternScale) + ' M' + (3 * patternScale) + ',' + (5 * patternScale) + ' l' + (2 * patternScale) + ',' + (-2 * patternScale);

    svg.append("pattern")
        .attr("id", "diagonalHatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", patternScale * 4)
        .attr("height", patternScale * 4)
        .append("path")
        //.attr("d", "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2")
        .attr("d", patternPath)
        .style("stroke", "gray")
        .style("stroke-width", 1);

    group.append("rect")
        .attr("id", "energy")
        .attr("x", range.xMin)
        .attr("y", range.yMax + 1)
        .attr("width", (range.xMax - range.xMin))
        .attr("height", (height - 1 - range.yMax - 1))
        .attr("fill", "url(#diagonalHatch)")
        //.attr("stroke", "white")
        //.style("stroke-dasharray", ("1, 5"))
        .attr("opacity", 0.0)
        .style('cursor', 'pointer')
        .on("mouseleave", (event) => {
            x_axis_mouseleave();
        })
        .on("mouseenter", (event) => {
            var offset = d3.pointer(event);
            x_axis_mouseenter(offset);

        })
        .on("mousemove", (event) => {
            var offset = d3.pointer(event);

            if (offset[0] >= 0) {
                x_axis_mousemove(offset);
            };
        });
    /*.call(d3.drag()
        .on("start", dragstart)
        .on("drag", dragmove)
        .on("end", dragend));*/

    //shift/zoom Y-Axis
    group = svg.append("g").attr("id", "y_axis_stretching");

    prev_scale = 1.0;

    group.append("rect")
        .attr("id", "scaling")
        .attr("x", 0)
        .attr("y", range.yMin)
        .attr("width", 2 * 0.75 * range.xMin)
        .attr("height", (range.yMax - range.yMin))
        .attr("fill", "url(#diagonalHatch)")
        .attr("opacity", 0.0)
        .call(d3.drag().on("drag", shifted))
        .call(d3.zoom().scaleExtent([0.1, 10]).on("zoom", scaled))
        .on("mouseleave", function (event) {
            d3.select(this)
                .style('cursor', '')
                .attr("opacity", 0.0);

            /*d3.select("#yaxis")
            .style("fill", axisColour)
            .style("stroke", axisColour);*/
        })
        .on("mouseenter", function (event) {
            if (autoscale)
                return;

            if (windowLeft)
                return;

            hide_navigation_bar();

            d3.select(this)
                .style('cursor', 'ns-resize')
                .attr("opacity", 0.5);

            let fillColour = 'white';

            if (theme == 'bright')
                fillColour = 'black';

            d3.select("#yaxis")
                .style("fill", fillColour)
                .style("stroke", fillColour);
        });
}

function shifted(event) {
    if (autoscale)
        return;

    if (last_spectrum == null)
        return;

    console.log("y-axis shift:", event.dy);

    var height = parseFloat(d3.select("#scaling").attr("height"));
    var interval = user_data_max - user_data_min;
    var shift = event.dy * interval / height;

    user_data_max += shift;
    user_data_min += shift;

    plot_spectrum(last_spectrum);
    replot_y_axis();
}

function scaled(event) {
    if (autoscale)
        return;

    if (last_spectrum == null)
        return;

    console.log("y-axis scale:", event.transform.k, "previous:", prev_scale);

    var factor = event.transform.k;

    if (event.transform.k > prev_scale)
        factor = 1.2;

    if (event.transform.k < prev_scale)
        factor = 0.8;

    prev_scale = event.transform.k;

    /*var interval = factor * (tmp_data_max - tmp_data_min) ;
    var middle = (tmp_data_max + tmp_data_min) / 2 ;*/

    var interval = factor * (user_data_max - user_data_min);
    var middle = (user_data_max + user_data_min) / 2;

    user_data_max = middle + interval / 2;
    user_data_min = middle - interval / 2;

    console.log("AFTER:", user_data_min, user_data_max);

    plot_spectrum(last_spectrum);
    replot_y_axis();
}

function plot_spectrum(spectrum) {
    if (mousedown)
        return;

    if (fitsData.depth <= 1) {
        return;
    }

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

    var canvas = document.getElementById("SpectrumCanvas");
    var ctx = canvas.getContext('2d');

    var width = canvas.width;
    var height = canvas.height;

    tmp_data_min = Math.max(d3.min(spectrum), 1);  // omit zero counts
    tmp_data_max = d3.max(spectrum);

    if (autoscale) {
        dmin = tmp_data_min;
        dmax = tmp_data_max;
    }
    else {
        if ((user_data_min != null) && (user_data_max != null)) {
            dmin = user_data_min;
            dmax = user_data_max;
        }
        else {
            dmin = data_min;
            dmax = data_max;
        }
    };

    if (windowLeft) {
        dmin = data_min;
        dmax = data_max;
    }

    if (dmin == dmax) {
        if (dmin == 0.0 && dmax == 0.0) {
            dmin = -1.0;
            dmax = 1.0;
        } else {
            if (dmin > 0.0) {
                dmin *= 0.99;
                dmax *= 1.01;
            };

            if (dmax < 0.0) {
                dmax *= 0.99;
                dmin *= 1.01;
            }
        }
    }

    var range = get_axes_range(width, height);

    var dx = range.xMax - range.xMin;
    var dy = range.yMax - range.yMin;

    var interval = dmax - dmin;
    dmax += get_spectrum_margin() * interval;

    // take the natural logarithm
    dmin = Math.log(dmin);
    dmax = Math.log(dmax);

    ctx.clearRect(0, 0, width, height);

    let data = largestTriangleThreeBuckets(spectrum, dx / 2);

    var incrx = dx / (data.length - 1);
    var offset = range.xMin;

    //get display direction
    var reverse = get_spectrum_direction(fitsData);

    var y = 0;

    if (reverse)
        y = (Math.log(data[data.length - 1]) - dmin) / (dmax - dmin) * dy;
    else
        y = (Math.log(data[0]) - dmin) / (dmax - dmin) * dy;

    var previousState = isFinite(y);
    var currentState = isFinite(y);
    var previousY = y;

    ctx.save();
    ctx.beginPath();

    ctx.shadowColor = getShadowStyle();
    ctx.shadowBlur = 5;//20
    //ctx.shadowOffsetX = 10; 
    //ctx.shadowOffsetY = 10;

    var style = getStrokeStyle();
    ctx.strokeStyle = style;

    ctx.lineWidth = 1;// 0
    ctx.strokeWidth = emStrokeWidth;

    ctx.moveTo(offset, range.yMax - y);
    offset += incrx;

    for (var x = 1 | 0; x < data.length; x = (x + 1) | 0) {
        if (reverse)
            y = (Math.log(data[data.length - 1 - x]) - dmin) / (dmax - dmin) * dy;
        else
            y = (Math.log(data[x]) - dmin) / (dmax - dmin) * dy;

        currentState = isFinite(y);

        /*if (previousState != currentState) {
            previousState = currentState;
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.moveTo(offset, range.yMax - previousY);
        }*/

        // test y for Infinity
        if (isFinite(y)) {
            //ctx.setLineDash([]);
            //ctx.strokeStyle = style;
            ctx.lineTo(offset, range.yMax - y);
        }
        else {
            //ctx.moveTo(offset, range.yMax + 1);
            //ctx.setLineDash([10, 10]);
            //ctx.strokeStyle = "red";
            ctx.lineTo(offset, range.yMax + 10);
        }

        offset += incrx;
        previousY = y;
    };

    ctx.stroke();
    ctx.closePath();
    ctx.restore();

    //plot a zero line    
    ctx.save();
    ctx.beginPath();

    ctx.shadowColor = getShadowStyle();
    ctx.shadowBlur = 20;
    //ctx.shadowOffsetX = 10; 
    //ctx.shadowOffsetY = 10;
    //ctx.strokeStyle = getStrokeStyle();
    ctx.strokeStyle = "rgba(255,0,0,0.25)";

    //ctx.setLineDash([5, 3]);
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 1;
    ctx.strokeWidth = emStrokeWidth;

    y = (0 - dmin) / (dmax - dmin) * dy;
    ctx.moveTo(range.xMin, range.yMax - y + emStrokeWidth / 2); // "- y" or "+ 1"
    ctx.lineTo(range.xMax, range.yMax - y + emStrokeWidth / 2); // "- y" or "+ 1"

    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

function replot_y_axis() {
    if (!displaySpectrum)
        return;

    var svg = d3.select("#BackSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    var dmin = 0.0;
    var dmax = 0.0;

    if (autoscale) {
        dmin = tmp_data_min;
        dmax = tmp_data_max;
    }
    else {
        if ((user_data_min != null) && (user_data_max != null)) {
            dmin = user_data_min;
            dmax = user_data_max;
        }
        else {
            dmin = data_min;
            dmax = data_max;
        }
    };

    if (windowLeft) {
        dmin = data_min;
        dmax = data_max;
    }

    if (dmin == dmax) {
        if (dmin == 0.0 && dmax == 0.0) {
            dmin = -1.0;
            dmax = 1.0;
        } else {
            if (dmin > 0.0) {
                dmin *= 0.99;
                dmax *= 1.01;
            };

            if (dmax < 0.0) {
                dmax *= 0.99;
                dmin *= 1.01;
            }
        }
    }

    var interval = dmax - dmin;
    var range = get_axes_range(width, height);

    var yR = d3.scaleLog()
        .range([range.yMax, range.yMin])
        .domain([dmin, dmax + get_spectrum_margin() * interval]);

    var yAxis = d3.axisRight(yR)
        .tickSizeOuter([3]);

    d3.select("#yaxis").remove();
    svg = d3.select("#axes");

    // Add the Y Axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "yaxis")
        .style("fill", axisColour)
        .style("stroke", axisColour)
        //.style("stroke-width", emStrokeWidth)
        .attr("transform", "translate(" + (0.75 * range.xMin - 1) + ",0)")
        .call(yAxis);

    //y-axis label
    var yLabel = "EVENTS";

    var bunit = '';
    if (fitsData.BUNIT != '') {
        bunit = fitsData.BUNIT.trim();

        bunit = "[" + bunit + "]";
    }

    d3.select("#ylabel").text(yLabel + " " + bunit);
}

function largestTriangleThreeBuckets(data, threshold) {

    var floor = Math.floor,
        abs = Math.abs;

    var dataLength = data.length;
    if (threshold >= dataLength || threshold === 0) {
        return data; // Nothing to do
    }

    //console.log("applying 'largestTriangleThreeBuckets'");

    var sampled = [],
        sampledIndex = 0;

    // Bucket size. Leave room for start and end data points
    var every = (dataLength - 2) / (threshold - 2);

    var a = 0,  // Initially a is the first point in the triangle
        maxAreaPoint,
        maxArea,
        area,
        nextA;

    sampled[sampledIndex++] = data[a]; // Always add the first point

    for (var i = 0; i < threshold - 2; i++) {

        // Calculate point average for next bucket (containing c)
        var avgX = 0,
            avgY = 0,
            avgRangeStart = floor((i + 1) * every) + 1,
            avgRangeEnd = floor((i + 2) * every) + 1;
        avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

        var avgRangeLength = avgRangeEnd - avgRangeStart;

        for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
            avgX += avgRangeStart;//data[ avgRangeStart ][ xAccessor ] * 1; // * 1 enforces Number (value may be Date)
            avgY += data[avgRangeStart];
        }
        avgX /= avgRangeLength;
        avgY /= avgRangeLength;

        // Get the range for this bucket
        var rangeOffs = floor((i + 0) * every) + 1,
            rangeTo = floor((i + 1) * every) + 1;

        // Point a
        var pointAX = a,//data[ a ][ xAccessor ] * 1, // enforce Number (value may be Date)
            pointAY = data[a];

        maxArea = area = -1;

        for (; rangeOffs < rangeTo; rangeOffs++) {
            // Calculate triangle area over three buckets
            area = abs((pointAX - avgX) * (data[rangeOffs] - pointAY) -
                (pointAX - rangeOffs) * (avgY - pointAY)
            ) * 0.5;
            if (area > maxArea) {
                maxArea = area;
                maxAreaPoint = data[rangeOffs];
                nextA = rangeOffs; // Next a is this b
            }
        }

        sampled[sampledIndex++] = maxAreaPoint; // Pick this point from the bucket
        a = nextA; // This a is the next a (chosen b)
    }

    sampled[sampledIndex++] = data[dataLength - 1]; // Always add last

    return sampled;
}

function get_spectrum_direction(fitsData) {
    var reverse = false;

    //ALMAWebQLv2 behaviour
    if (fitsData.CDELT3 > 0.0)
        reverse = false;
    else
        reverse = true;

    return reverse;
}

function getShadowStyle() {
    if (theme == 'bright')
        return "black";// purple
    else
        //return "yellow";//was red
        return "rgba(255,204,0,1.0)"; // Amber        
}

function getStrokeStyle() {
    var style = "rgba(0,0,0,1.0)";

    //style = "rgba(255,204,0,0.9)" ;//yellowish ALMAWebQL v2
    style = "rgba(255,255,255,1.0)";//white
    //style = "rgba(153, 102, 153, 0.9)" ;//violet

    if (theme == 'bright') {
        //style = "rgba(0,0,0,1.0)";//black
        style = "rgba(127,127,127,1.0)";// grey

        if (colourmap == "greyscale")
            style = "rgba(255,204,0,1.0)";//yellowish ALMAWebQL v2	    
    }


    if (theme == 'dark') {
        if (colourmap == "green")
            //style = "rgba(255,127,80,0.9)";//orange
            //style = "rgba(238,130,238,0.9)" ;
            //style = "rgba(204,204,204,0.9)";//grey
            style = "rgba(255,204,0,1.0)";//yellowish ALMAWebQL v2	    
        //style = "rgba(204,204,204,1.0)";//grey		

        if (colourmap == "red")
            style = "rgba(0,191,255,1.0)";//deepskyblue

        if (colourmap == "blue")
            style = "rgba(255,215,0,1.0)";//gold

        if (colourmap == "hot")
            style = "rgba(0,191,255,1.0)";//deepskyblue

        //if(document.getElementById('colourmap').value == "rainbow")// || document.getElementById('colourmap').value == "parula" || document.getElementById('colourmap').value == "viridis")
        //	style = "rgba(204,204,204,0.9)" ;
    }

    return style;
}

function true_image_dimensions(alpha, width, height) {
    var width = width | 0;
    var height = height | 0;
    var linesize = width | 0;
    var length = (width * height) | 0;

    var x, y, offset;
    var found_data;

    var y1 = 0 | 0;
    var y2 = 0 | 0;
    var x1 = 0 | 0;
    var x2 = 0 | 0;

    //find y1
    for (var i = 0 | 0; i < length; i = (i + 1) | 0) {
        if (alpha[i] > 0) {
            y1 = (i / linesize) | 0;
            break;
        }
    }

    //find y2
    for (var i = length - 1; i >= 0; i = (i - 1) | 0) {
        if (alpha[i] > 0) {
            y2 = (i / linesize) | 0;
            break;
        }
    }

    //find x1
    found_data = false;
    for (var x = 0 | 0; x < width; x = (x + 1) | 0) {
        for (var y = y1; y <= y2; y = (y + 1) | 0) {
            if (alpha[y * linesize + x] > 0) {
                x1 = x | 0;
                found_data = true;
                break;
            }
        }

        if (found_data)
            break;
    }

    //find x2
    found_data = false;
    for (var x = (width - 1) | 0; x >= 0; x = (x - 1) | 0) {
        for (var y = y1; y <= y2; y = (y + 1) | 0) {
            if (alpha[y * linesize + x] > 0) {
                x2 = x | 0;
                found_data = true;
                break;
            }
        }

        if (found_data)
            break;
    }

    //console.log("image bounding box: y1 =", y1, "y2 =", y2, "x1 =", x1, "x2 =", x2);

    return {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: ((height - 1) - y2), // was 'y1', with WebGL swap y1 with y2 due to a vertical mirror flip
        width: Math.abs(x2 - x1) + 1,
        height: Math.abs(y2 - y1) + 1
    }
}

function process_hdr_image(img_width, img_height, pixels, alpha, min_count, max_count) {
    console.log("process_hdr_image: ", img_width, img_height, min_count, max_count);
    var image_bounding_dims = true_image_dimensions(alpha, img_width, img_height);
    var pixel_range = { min_pixel: min_count, max_pixel: max_count }
    console.log(image_bounding_dims, pixel_range);

    // combine pixels with a mask
    let len = pixels.length | 0;
    var texture = new Float32Array(2 * len);
    let offset = 0 | 0;

    for (let i = 0 | 0; i < len; i = (i + 1) | 0) {
        texture[offset] = pixels[i];
        offset = (offset + 1) | 0;

        texture[offset] = (alpha[i] > 0) ? 1.0 : 0.0;
        offset = (offset + 1) | 0;
    }

    if (imageContainer != null) {
        clear_webgl_image_buffers();
    }

    imageContainer = { width: img_width, height: img_height, pixels: pixels, alpha: alpha, texture: texture, image_bounding_dims: image_bounding_dims, pixel_range: pixel_range };

    //next display the image    
    init_webgl_image_buffers();

    try {
        setup_image_selection();
    }
    catch (err) {
        console.log("setup_image_selection: ", err);
    };

    try {
        display_scale_info();
    }
    catch (err) {
        console.log("display_scale_info: ", err);
    };

    has_image = true;

    try {
        setup_viewports();
    }
    catch (err) {
        console.log("setup_viewports: ", err);
    };

    hide_hourglass();
}

function init_webgl_image_buffers() {
    //place the image onto the main canvas
    var canvas = document.getElementById('HTMLCanvas');
    canvas.style.display = "block";// a hack needed by Apple Safari
    var width = canvas.width;
    var height = canvas.height;

    if (webgl1 || webgl2) {
        canvas.addEventListener("webglcontextlost", function (event) {
            event.preventDefault();

            var image = imageContainer;
            cancelAnimationFrame(image.loopId);
            console.error("HTMLCanvas: webglcontextlost");
        }, false);

        canvas.addEventListener(
            "webglcontextrestored", function () {
                console.log("HTMLCanvas: webglcontextrestored");
                init_webgl_image_buffers();
            }, false);
    }

    if (webgl2) {
        var ctx = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
        imageContainer.gl = ctx;
        // console.log("init_webgl is using the WebGL2 context.");

        // enable floating-point textures filtering			
        ctx.getExtension('OES_texture_float_linear');

        // needed by gl.checkFramebufferStatus
        ctx.getExtension('EXT_color_buffer_float');

        // call the common WebGL renderer
        webgl_image_renderer(ctx, width, height);
    } else if (webgl1) {
        var ctx = canvas.getContext("webgl", { preserveDrawingBuffer: true });
        imageContainer.gl = ctx;
        // console.log("init_webgl is using the WebGL1 context.");

        // enable floating-point textures
        ctx.getExtension('OES_texture_float');
        ctx.getExtension('OES_texture_float_linear');

        // call the common WebGL renderer
        webgl_image_renderer(ctx, width, height);
    } else {
        console.log("WebGL not supported by your browser, falling back onto HTML 2D Canvas (not implemented yet).");
        return;
    }
}

function clear_webgl_image_buffers() {
    clear_webgl_internal_buffers(imageContainer);
}

function clear_webgl_internal_buffers(image) {
    if (image.first)
        return;

    // cancel the animation loop
    cancelAnimationFrame(image.loopId);

    var gl = image.gl;

    if (gl === undefined || gl == null)
        return;

    // position buffer
    gl.deleteBuffer(image.positionBuffer);

    // texture
    gl.deleteTexture(image.tex);

    // program
    gl.deleteShader(image.program.vShader);
    gl.deleteShader(image.program.fShader);
    gl.deleteProgram(image.program);

    image.gl = null;
}

function get_screen_scale(x) {
    //return Math.floor(0.925*x) ;
    return Math.floor(0.9 * x);
}

function get_image_scale_square(width, height, img_width, img_height) {
    var screen_dimension = get_screen_scale(Math.min(width, height));
    var image_dimension = Math.max(img_width, img_height);

    return screen_dimension / image_dimension;
}

function get_image_scale(width, height, img_width, img_height) {
    if (img_width == img_height)
        return get_image_scale_square(width, height, img_width, img_height);

    if (img_height < img_width) {
        var screen_dimension = 0.9 * height;
        var image_dimension = img_height;

        var scale = screen_dimension / image_dimension;

        var new_image_width = scale * img_width;

        if (new_image_width > 0.8 * width) {
            screen_dimension = 0.8 * width;
            image_dimension = img_width;
            scale = screen_dimension / image_dimension;
        }

        return scale;
    }

    if (img_width < img_height) {
        var screen_dimension = 0.8 * width;
        var image_dimension = img_width;

        var scale = screen_dimension / image_dimension;

        var new_image_height = scale * img_height;

        if (new_image_height > 0.9 * height) {
            screen_dimension = 0.9 * height;
            image_dimension = img_height;
            scale = screen_dimension / image_dimension;
        }

        return scale;
    }
}

/** ---------------------------------------------------------------------
 * Create and compile an individual shader.
 * @param gl WebGLRenderingContext The WebGL context.
 * @param type Number The type of shader, either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param source String The code/text of the shader
 * @returns WebGLShader A WebGL shader program object.
 */
function createAndCompileShader(gl, type, source) {
    var typeName;
    switch (type) {
        case gl.VERTEX_SHADER:
            typeName = "Vertex Shader";
            break;
        case gl.FRAGMENT_SHADER:
            typeName = "Fragment Shader";
            break;
        default:
            console.error("Invalid type of shader in createAndCompileShader()");
            return null;
    }

    // Create shader object
    var shader = gl.createShader(type);
    if (!shader) {
        console.error("Fatal error: gl could not create a shader object.");
        return null;
    }

    // Put the source code into the gl shader object
    gl.shaderSource(shader, source);

    // Compile the shader code
    gl.compileShader(shader);

    // Check for any compiler errors
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled && !gl.isContextLost()) {
        // There are errors, so display them
        var errors = gl.getShaderInfoLog(shader);
        console.error('Failed to compile ' + typeName + ' with these errors:' + errors);

        gl.deleteShader(shader);
        return null;
    }

    return shader;
};

/** ---------------------------------------------------------------------
 * Given two shader programs, create a complete rendering program.
 * @param gl WebGLRenderingContext The WebGL context.
 * @param vertexShaderCode String Code for a vertex shader.
 * @param fragmentShaderCode String Code for a fragment shader.
 * @returns WebGLProgram A WebGL shader program object.
 */
//
function createProgram(gl, vertexShaderCode, fragmentShaderCode) {
    // Create the 2 required shaders
    var vertexShader = createAndCompileShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
    var fragmentShader = createAndCompileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);
    if (!vertexShader || !fragmentShader) {
        return null;
    }

    // Create a WebGLProgram object
    var program = gl.createProgram();
    if (!program) {
        console.error('Fatal error: Failed to create a program object');
        return null;
    }

    // Attach the shader objects
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // Link the WebGLProgram object
    gl.linkProgram(program);

    // Check for success
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
        // There were errors, so get the errors and display them.
        var error = gl.getProgramInfoLog(program);
        console.error('Fatal error: Failed to link program: ' + error);
        gl.deleteProgram(program);
        gl.deleteShader(fragmentShader);
        gl.deleteShader(vertexShader);
        return null;
    }

    // Remember the shaders. This allows for them to be cleanly deleted.
    program.vShader = vertexShader;
    program.fShader = fragmentShader;

    return program;
};

function webgl_image_renderer(gl, width, height) {
    var image = imageContainer;

    var scale = get_image_scale(width, height, image.image_bounding_dims.width, image.image_bounding_dims.height);
    var img_width = scale * image.image_bounding_dims.width;
    var img_height = scale * image.image_bounding_dims.height;
    console.log("scaling by", scale, "new width:", img_width, "new height:", img_height, "orig. width:", image.image_bounding_dims.width, "orig. height:", image.image_bounding_dims.height);

    // setup GLSL program
    var vertexShaderCode = document.getElementById("vertex-shader").text;
    try {
        var fragmentShaderCode = document.getElementById("common-shader").text + document.getElementById(image.tone_mapping.flux + "-shader").text;
    } catch (_) {
        // this will be triggered only for datasets where the tone mapping has not been set (i.e. the mask is null etc...)
        var fragmentShaderCode = document.getElementById("common-shader").text + document.getElementById("log-shader").text;
    }

    if (webgl2)
        fragmentShaderCode = fragmentShaderCode + "\ncolour.a = colour.g;\n";

    fragmentShaderCode += document.getElementById(colourmap + "-shader").text;

    // WebGL2 accepts WebGL1 shaders so there is no need to update the code	
    if (webgl2) {
        var prefix = "#version 300 es\n";
        vertexShaderCode = prefix + vertexShaderCode;
        fragmentShaderCode = prefix + fragmentShaderCode;

        // attribute -> in
        vertexShaderCode = vertexShaderCode.replace(/attribute/g, "in");
        fragmentShaderCode = fragmentShaderCode.replace(/attribute/g, "in");

        // varying -> out
        vertexShaderCode = vertexShaderCode.replace(/varying/g, "out");

        // varying -> in
        fragmentShaderCode = fragmentShaderCode.replace(/varying/g, "in");

        // texture2D -> texture
        fragmentShaderCode = fragmentShaderCode.replace(/texture2D/g, "texture");

        // replace gl_FragColor with a custom variable, i.e. texColour
        fragmentShaderCode = fragmentShaderCode.replace(/gl_FragColor/g, "texColour");

        // add the definition of texColour
        var pos = fragmentShaderCode.indexOf("void main()");
        fragmentShaderCode = fragmentShaderCode.insert_at(pos, "out vec4 texColour;\n\n");
    }

    var program = createProgram(gl, vertexShaderCode, fragmentShaderCode);
    image.program = program;

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");

    // Create a position buffer
    var positionBuffer = gl.createBuffer();
    image.positionBuffer = positionBuffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Put a unit quad in the buffer
    var positions = [
        -1, -1,
        -1, 1,
        1, -1,
        1, -1,
        -1, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // load a texture
    var tex = gl.createTexture();
    image.tex = tex;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    /*gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);*/
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    if (webgl2)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, image.width, image.height, 0, gl.RG, gl.FLOAT, image.texture);
    else
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, image.width, image.height, 0, gl.LUMINANCE_ALPHA, gl.FLOAT, image.texture);

    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
        console.error(status);
    }

    image.refresh = true;
    image.first = true;

    // shoud be done in an animation loop
    function image_rendering_loop() {
        // set a flag
        image.first = false;

        if (image.gl === undefined || image.gl == null) {
            return;
        }

        if (!image.refresh) {
            image.loopId = requestAnimationFrame(image_rendering_loop);
            return;
        } else
            image.refresh = false;

        //WebGL how to convert from clip space to pixels	
        gl.viewport((width - img_width) / 2, (height - img_height) / 2, img_width, img_height);
        // console.log("gl.viewport:", (width - img_width) / 2, (height - img_height) / 2, img_width, img_height);
        // console.log("gl.viewport:", gl.getParameter(gl.VIEWPORT));
        // set the global variable
        image_gl_viewport = gl.getParameter(gl.VIEWPORT);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // the image bounding box
        var locationOfBox = gl.getUniformLocation(program, "box");

        // image tone mapping
        var locationOfParams = gl.getUniformLocation(program, "params");

        // drawRegion (execute the GLSL program)
        // Tell WebGL to use our shader program pair
        gl.useProgram(program);

        let xmin = image.image_bounding_dims.x1 / (image.width - 0);// was - 1
        let ymin = image.image_bounding_dims.y1 / (image.height - 0);// was - 1
        let _width = image.image_bounding_dims.width / image.width;
        let _height = image.image_bounding_dims.height / image.height;

        // console.log("xmin:", xmin, "ymin:", ymin, "_width:", _width, "_height:", _height);
        gl.uniform4fv(locationOfBox, [xmin, ymin, _width, _height]);

        // logarithmic tone mapping        
        var params = [Math.log(image.pixel_range.min_pixel), Math.log(image.pixel_range.max_pixel), 0, 0];
        gl.uniform4fv(locationOfParams, params);

        // Setup the attributes to pull data from our buffers
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // execute the GLSL program
        // draw the quad (2 triangles, 6 vertices)
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // image.loopId = requestAnimationFrame(image_rendering_loop); // there is no need for the animation loop as parameters do not change
    };

    image.loopId = requestAnimationFrame(image_rendering_loop);
}

function x2hms(x) {
    if (fitsData.CDELT1 != null)
        return RadiansPrintHMS((fitsData.CRVAL1 + (x - fitsData.CRPIX1) * fitsData.CDELT1) / toDegrees);
    else
        throw "CDELT1 is not available";
};

function x2dms(x) {
    if (fitsData.CDELT1 != null)
        return RadiansPrintDMS((fitsData.CRVAL1 + (x - fitsData.CRPIX1) * fitsData.CDELT1) / toDegrees);
    else
        throw "CDELT1 is not available";
};

function y2dms(y) {
    if (fitsData.CDELT2 != null)
        return RadiansPrintDMS((fitsData.CRVAL2 + (fitsData.height - y - fitsData.CRPIX2) * fitsData.CDELT2) / toDegrees);
    else
        throw "CDELT2 is not available";
};

function display_gridlines() {
    if (fitsData == null)
        return;

    if (fitsData.CTYPE1.indexOf("RA") < 0 && fitsData.CTYPE1.indexOf("GLON") < 0 && fitsData.CTYPE1.indexOf("ELON") < 0) {
        d3.select("#displayGridlines")
            .style("font-style", "italic")
            .style('cursor', 'not-allowed')
            .style("display", "none")
            .attr("disabled", "disabled");
        return;
    }

    if (fitsData.CTYPE2.indexOf("DEC") < 0 && fitsData.CTYPE2.indexOf("GLAT") < 0 && fitsData.CTYPE2.indexOf("ELAT") < 0) {
        d3.select("#displayGridlines")
            .style("font-style", "italic")
            .style('cursor', 'not-allowed')
            .style("display", "none")
            .attr("disabled", "disabled");
        return;
    }

    if (!has_image)
        return;

    try {
        d3.select("#gridlines").remove();
    }
    catch (e) {
    }

    var elem = d3.select("#image_rectangle");
    var width = parseFloat(elem.attr("width"));
    var height = parseFloat(elem.attr("height"));

    var x_offset = parseFloat(elem.attr("x"));
    var y_offset = parseFloat(elem.attr("y"));

    var x = d3.scaleLinear()
        .range([x_offset, x_offset + width - 1])
        .domain([0, 1]);

    var y = d3.scaleLinear()
        .range([y_offset + height - 1, y_offset])
        .domain([1, 0]);

    var svg = d3.select("#BackgroundSVG");

    svg = svg.append("g")
        .attr("id", "gridlines")
        .attr("opacity", 1.0);

    let fillColour = 'white';
    let strokeColour = 'white';

    if (theme == 'bright') {
        fillColour = 'gray';
        strokeColour = 'gray';
    }

    if (colourmap == "greyscale" || colourmap == "negative") {
        fillColour = "#C4A000";
        strokeColour = fillColour;
    }

    // Add the X Axis
    if (fitsData.depth > 1) {
        var xAxis = d3.axisBottom(x)
            .tickSize(height)
            .tickFormat(function (d) {
                if (d == 0.0 || d == 1.0)
                    return "";

                var image = imageContainer;
                var image_bounding_dims = image.image_bounding_dims;

                var tmp = image_bounding_dims.x1 + d * (image_bounding_dims.width - 1);
                var orig_x = tmp * fitsData.width / image.width;

                try {
                    if (fitsData.CTYPE1.indexOf("RA") > -1) {
                        if (coordsFmt == 'DMS')
                            return x2dms(orig_x);
                        else
                            return x2hms(orig_x);
                    }

                    if (fitsData.CTYPE1.indexOf("GLON") > -1 || fitsData.CTYPE1.indexOf("ELON") > -1)
                        return x2dms(orig_x);
                }
                catch (err) {
                    console.log(err);
                }

                return "";
            });

        svg.append("g")
            .attr("class", "gridlines")
            .attr("id", "ra_axis")
            .style("fill", fillColour)
            .style("stroke", strokeColour)
            .style("stroke-width", 1.0)
            .attr("opacity", 1.0)
            .attr("transform", "translate(0," + (y_offset) + ")")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 0)
            .style("fill", fillColour)
            .attr("dx", "-1.0em")
            .attr("dy", "1.0em")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "middle");
    }
    else {
        var xAxis = d3.axisTop(x)
            .tickSize(height)
            .tickFormat(function (d) {
                if (d == 0.0 || d == 1.0)
                    return "";

                var image = imageContainer;
                var image_bounding_dims = image.image_bounding_dims;

                var tmp = image_bounding_dims.x1 + d * (image_bounding_dims.width - 1);
                var orig_x = tmp * fitsData.width / image.width;

                try {
                    if (fitsData.CTYPE1.indexOf("RA") > -1) {
                        if (coordsFmt == 'DMS')
                            return x2dms(orig_x);
                        else
                            return x2hms(orig_x);
                    }

                    if (fitsData.CTYPE1.indexOf("GLON") > -1 || fitsData.CTYPE1.indexOf("ELON") > -1)
                        return x2dms(orig_x);
                }
                catch (err) {
                    console.log(err);
                }

                return "";
            });

        svg.append("g")
            .attr("class", "gridlines")
            .attr("id", "ra_axis")
            .style("fill", fillColour)
            .style("stroke", strokeColour)
            .style("stroke-width", 1.0)
            .attr("opacity", 1.0)
            .attr("transform", "translate(0," + (height + y_offset) + ")")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 0)
            .style("fill", fillColour)
            //.attr("dx", ".35em")
            .attr("dy", ".35em")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "middle");
    }

    // Add the Y Axis
    {
        var yAxis = d3.axisLeft(y)
            .tickSize(width)
            .tickFormat(function (d) {
                if (d == 0.0 || d == 1.0)
                    return "";

                var image = imageContainer;
                var image_bounding_dims = image.image_bounding_dims;

                var tmp = image_bounding_dims.y1 + d * (image_bounding_dims.height - 1);
                var orig_y = tmp * fitsData.height / image.height;

                try {
                    return y2dms(orig_y);
                }
                catch (err) {
                    console.log(err);
                }

                return "";
            });

        svg.append("g")
            .attr("class", "gridlines")
            .attr("id", "dec_axis")
            .style("fill", fillColour)
            .style("stroke", strokeColour)
            .style("stroke-width", 1.0)
            .attr("opacity", 1.0)
            .attr("transform", "translate(" + (width + x_offset) + ",0)")
            .call(yAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 0)
            .style("fill", fillColour)
            .attr("dx", ".35em")
            //.attr("dy", "-0.35em")
            //.attr("transform", "rotate(-45)")
            .style("text-anchor", "start");//was end, dx -.35, dy 0
    }

    var htmlStr = displayGridlines ? '<span class="fas fa-check-square"></span> lon/lat grid lines' : '<span class="far fa-square"></span> lon/lat grid lines';
    d3.select("#displayGridlines").html(htmlStr);

    var elem = d3.select("#gridlines");
    if (displayGridlines)
        elem.attr("opacity", 1);
    else
        elem.attr("opacity", 0);
}

function display_legend() {
    var rect = d3.select("#image_rectangle");

    var img_width;

    try {
        img_width = parseFloat(rect.attr("width"));
    }
    catch (e) {
        console.log('image_rectangle not available yet');
        return;
    }

    try {
        clear_webgl_legend_buffers();
    }
    catch (e) {
    }

    try {
        d3.select("#legend").remove();
    }
    catch (e) {
    }

    var svg = d3.select("#BackgroundSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    var legendHeight = 0.8 * height;
    var rectWidth = 5 * legendHeight / 64;
    var x = Math.max(0.05 * width, (width - img_width) / 2 - 1.5 * rectWidth);

    var group = svg.append("g")
        .attr("id", "legend")
        .attr("opacity", 1.0);

    // append a WebGL legend div
    group.append("foreignObject")
        .attr("id", "legendObject")
        .attr("x", x)
        .attr("y", 0.1 * height)
        .attr("width", rectWidth)
        .attr("height", legendHeight)
        .append("xhtml:div")
        .attr("id", "legendDiv")
        .append("canvas")
        .attr("id", "legendCanvas")
        .attr("width", rectWidth)
        .attr("height", legendHeight);

    init_webgl_legend_buffers();
    clear_webgl_legend_buffers();

    let min_count = imageContainer.pixel_range.min_pixel;
    let max_count = imageContainer.pixel_range.max_pixel;

    var colourScale = d3.scaleLog()
        .range([0.8 * height, 0])
        .domain([min_count, max_count]);

    var colourAxis = d3.axisRight(colourScale)
        .tickSizeOuter([0])
        .tickSizeInner([0])
        .tickFormat(function (d) {
            var prefix = "";

            /*if (d == 0)
                prefix = "≤";

            if (d == 1)
                prefix = "≥";*/

            var pixelVal = d;

            /*var number;

            if (Math.abs(pixelVal) <= 0.001 || Math.abs(pixelVal) >= 1000)
                number = pixelVal.toExponential(3);
            else
                number = pixelVal.toPrecision(3);*/

            return prefix + pixelVal;
        });

    group.append("g")
        .attr("class", "colouraxis")
        .attr("id", "legendaxis")
        .style("stroke-width", emStrokeWidth / 2)
        .attr("transform", "translate(" + ((width - img_width) / 2 - 2.0 * rectWidth) + "," + 0.1 * height + ")")
        .call(colourAxis);

    var bunit = '';
    if (fitsData.BUNIT != '') {
        bunit = fitsData.BUNIT.trim();
        bunit = "[" + bunit + "]";
    }

    group.append("text")
        .attr("id", "colourlabel")
        .attr("x", ((width - img_width) / 2 - 1.0 * rectWidth))
        .attr("y", 0.9 * height + 1.5 * emFontSize)
        .attr("font-family", "Inconsolata")
        .attr("font-size", 1.25 * emFontSize)
        .attr("text-anchor", "middle")
        .attr("stroke", "none")
        .attr("opacity", 0.8)
        .text(bunit);

    var elem = d3.select("#legend");

    if (displayLegend)
        elem.attr("opacity", 1);
    else
        elem.attr("opacity", 0);
}

function zoomed(event) {
    console.log("scale: " + event.transform.k);
    zoom_scale = event.transform.k;

    console.log("windowLeft:", windowLeft);

    if (!windowLeft) {
        var evt = new MouseEvent("mousemove");
        d3.select('#image_rectangle').node().dispatchEvent(evt);

        viewport.refresh = true;
    }
}

function setup_image_selection() {
    //delete previous instances
    try {
        d3.select("#region").remove();
        d3.select("#zoom").remove();
        d3.select("#zoomCross").remove();
        d3.select("#image_rectangle").remove();
    }
    catch (e) { };

    var svg = d3.select("#FrontSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    var image_bounding_dims = imageContainer.image_bounding_dims;
    var scale = get_image_scale(width, height, image_bounding_dims.width, image_bounding_dims.height);
    var img_width = scale * image_bounding_dims.width;
    var img_height = scale * image_bounding_dims.height;

    let fillColour = 'white';

    if (theme == 'bright')
        fillColour = 'black';

    //sub-region selection rectangle
    svg.append("rect")
        .attr("id", "region")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 0)
        .attr("height", 0)
        .attr("fill", "none")
        .style("stroke", fillColour)
        .style("stroke-dasharray", ("1, 5, 1"))
        .style("stroke-width", emStrokeWidth)
        .attr("opacity", 0.0);

    if (colourmap == "greyscale" || colourmap == "negative")
        fillColour = "#C4A000";

    if (zoom_shape == "square") {
        //zoom selection rectangle
        svg.append("rect")
            .attr("id", "zoom")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 0)
            .attr("height", 0)
            .attr("fill", "none")
            .attr("pointer-events", "none")
            .style("stroke", fillColour)
            //.style("stroke-dasharray", ("1, 5, 1"))
            .style("stroke-width", 3 * emStrokeWidth)
            .attr("opacity", 0.0);
    };

    if (zoom_shape == "circle") {
        //zoom selection circle
        svg.append("circle")
            .attr("id", "zoom")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 0)
            .attr("fill", "none")
            .attr("pointer-events", "none")
            .style("stroke", fillColour)
            //.style("stroke-dasharray", ("1, 5, 1"))
            .style("stroke-width", 3 * emStrokeWidth)
            .attr("opacity", 0.0);
    };

    var crossSize = 1.0 * emFontSize;

    //zoom cross-hair
    svg.append("svg:image")
        .attr("id", "zoomCross")
        .attr("x", 0)
        .attr("y", 0)
        //.attr("xlink:href", ROOT_PATH + "plainicon.com-crosshair_white.svg")
        .attr("xlink:href", "https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/plainicon.com-crosshair_white.svg")
        .attr("width", crossSize)
        .attr("height", crossSize)
        .attr("opacity", 0.0);

    var zoom_element = d3.select("#zoom");
    var zoom_cross = d3.select("#zoomCross");

    var zoom = d3.zoom()
        .scaleExtent([10, 200])//was 200
        .on("zoom", zoomed);

    now = performance.now();
    then = now;

    spec_now = performance.now();
    spec_then = spec_now;

    //set up the spectrum rendering loop
    function update_spectrum() {
        spec_now = performance.now();
        spec_elapsed = spec_now - spec_then;

        //if (spec_elapsed > fpsInterval)
        {
            spec_then = spec_now - (spec_elapsed % fpsInterval);
            //console.log("spectrum interval: " + spec_elapsed.toFixed(3) + " [ms]", "fps = ", Math.round(1000 / spec_elapsed)) ;

            //spectrum
            try {
                let go_ahead = true;
                let new_seq_id = 0;

                let len = spectrum_stack.length;

                if (len > 0) {
                    let id = spectrum_stack[len - 1].id;

                    if (id <= last_seq_id)
                        go_ahead = false;
                    else
                        new_seq_id = Math.max(new_seq_id, id);
                }
                else
                    go_ahead = false;

                if (go_ahead) {
                    last_seq_id = new_seq_id;
                    //console.log("last_seq_id:", last_seq_id);

                    //pop the spectrum from the stack
                    var spectrum = spectrum_stack.pop().spectrum;
                    spectrum_stack = [];

                    plot_spectrum(spectrum);
                    replot_y_axis();

                    last_spectrum = spectrum;
                }

            }
            catch (e) {
                console.log(e);
            }

        }

        if (!windowLeft)
            requestAnimationFrame(update_spectrum);
    }

    // a fix for Safari
    d3.select(document.body)
        .on('wheel.body', e => { });

    //svg image rectangle for zooming-in
    var rect = svg.append("rect")
        .attr("id", "image_rectangle")
        /*.attr("x", Math.floor((width - img_width) / 2))
        .attr("y", Math.floor((height - img_height) / 2))
        .attr("width", Math.floor(img_width))
        .attr("height", Math.floor(img_height))*/
        .attr("x", (width - img_width) / 2)
        .attr("y", (height - img_height) / 2)
        .attr("width", img_width)
        .attr("height", img_height)
        .style('cursor', 'none')//'crosshair')//'none' to mask Chrome latency
        /*.style('cursor', 'crosshair')//'crosshair')*/
        /*.style("fill", "transparent")
          .style("stroke", "yellow")
          .style("stroke-width", emStrokeWidth)
          .style("stroke-dasharray", ("1, 5, 1"))*/
        .attr("opacity", 0.0)
        /*.call(d3.drag()
            .on("start", fits_subregion_start)
            .on("drag", fits_subregion_drag)
            .on("end", fits_subregion_end)
        )*/
        .call(zoom)
        .on("mouseenter", (event) => {
            hide_navigation_bar();

            // cancel the image animation loop            
            clear_webgl_image_buffers();

            zoom_element.attr("opacity", 1.0);
            zoom_cross.attr("opacity", 0.75);

            d3.select("#pixel").text("").attr("opacity", 0.0);

            document.addEventListener('copy', copy_coordinates);
            shortcut.add("s", function () {
                set_autoscale_range(false);
            });
            shortcut.add("Meta+C", copy_coordinates);

            windowLeft = false;

            spectrum_stack = [];
            image_stack = [];
            viewport_zoom_settings = null;
            prev_mouse_position = { x: -1, y: -1 };

            requestAnimationFrame(update_spectrum);

            var offset;

            try {
                offset = d3.pointer(event);
            }
            catch (e) {
                console.log(e);
                return;
            }

            mouse_position = { x: offset[0], y: offset[1] };

            if (!initKalmanFilter)
                initKalman();

            resetKalman();

            init_webgl_zoom_buffers();

            // send a "Kalman Filter reset" WebSocket message in order to reset the server-side Kalman Filter
            var msg = {
                type: "kalman_reset",
                seq_id: ++sent_seq_id
            };

            if (wsConn != null && wsConn.readyState == 1)
                wsConn.send(JSON.stringify(msg));

            setup_window_timeout();
        })
        .on("mouseleave", (event) => {
            clearTimeout(idleMouse);

            // send a "Kalman Filter reset" WebSocket message in order to reset the server-side Kalman Filter
            var msg = {
                type: "kalman_reset",
                seq_id: ++sent_seq_id
            };

            if (wsConn != null && wsConn.readyState == 1)
                wsConn.send(JSON.stringify(msg));

            setup_window_timeout();

            // clear the ViewportCanvas in WebGL
            if (viewport != null) {
                // Clear the Viewport Canvas
                //console.log("clearing the Viewport Canvas");
                var gl = viewport.gl;

                if (gl !== undefined && gl != null) {
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                };

                clear_webgl_zoom_buffers();
            }

            // Clear the ZOOMCanvas
            clear_webgl_viewport();

            if (!event.shiftKey)
                windowLeft = true;

            spectrum_stack = [];
            image_stack = [];

            if (!event.shiftKey) {
                viewport_zoom_settings = null;
                zoom_element.attr("opacity", 0.0);
                zoom_cross.attr("opacity", 0.0);
            };

            d3.select("#" + zoom_location).style("stroke", "transparent");
            d3.select("#" + zoom_location + "Cross").attr("opacity", 0.0);
            d3.select("#" + zoom_location + "Beam").attr("opacity", 0.0);

            d3.select("#pixel").text("").attr("opacity", 0.0);

            document.removeEventListener('copy', copy_coordinates);
            shortcut.remove("Meta+C");
            shortcut.remove("s");

            if (event.shiftKey)
                return;

            if (xradec != null) {
                let raText = 'RA N/A';
                let decText = 'DEC N/A';

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

                if (fitsData.CTYPE2.indexOf("DEC") > -1)
                    decText = 'δ: ' + RadiansPrintDMS(xradec[1]);

                if (fitsData.CTYPE2.indexOf("GLAT") > -1)
                    decText = 'b: ' + RadiansPrintDMS(xradec[1]);

                if (fitsData.CTYPE2.indexOf("ELAT") > -1)
                    decText = 'β: ' + RadiansPrintDMS(xradec[1]);

                d3.select("#ra").text(raText);
                d3.select("#dec").text(decText);
            }

            if (mousedown)
                return;

            if (fitsData != null) {
                if (fitsData.depth > 1) {
                    plot_spectrum(fitsData.spectrum);
                    replot_y_axis();
                }
            }

            clear_webgl_image_buffers();
            init_webgl_image_buffers();
        })
        .on("mousemove", (event) => {
            // cancel the image animation loop            
            clear_webgl_image_buffers();

            if (!autoscale && event.shiftKey) {
                d3.select("#scaling")
                    .style('cursor', 'ns-resize')
                    .attr("opacity", 0.5);

                let fillColour = 'white';

                if (theme == 'bright')
                    fillColour = 'black';

                d3.select("#yaxis")
                    .style("fill", fillColour)
                    .style("stroke", fillColour);
            }
            else {
                d3.select("#scaling")
                    .style('cursor', '')
                    .attr("opacity", 0.0);

                d3.select("#yaxis")
                    .style("fill", axisColour)
                    .style("stroke", axisColour);
            }

            if (enedrag || event.shiftKey) {
                var node = event.currentTarget;
                node.style.cursor = 'pointer';
                return;
            }

            // commented out so that the caching 'wait' cursor remains visible
            //d3.select(this).style('cursor', 'none');			

            event.preventDefault = true;
            if (!has_image) return;

            if (fitsData == null)
                return;

            var elem = document.getElementById("SpectrumCanvas");
            elem.getContext('2d').globalAlpha = 1.0;
            var width = elem.width;
            var height = elem.height;

            moving = true;
            clearTimeout(idleMouse);
            windowLeft = false;

            d3.select("#" + zoom_location).style("stroke", "Gray");
            d3.select("#" + zoom_location + "Cross").attr("opacity", 0.75);
            d3.select("#" + zoom_location + "Beam").attr("opacity", 0.75);

            try {
                var offset = d3.pointer(event);

                // there seems to be a bug in d3.js !? offset coordinates go negative !?
                if ((offset[0] < 0) || (offset[1] < 0)) {
                    offset[0] = mouse_position.x;
                    offset[1] = mouse_position.y;
                }
            }
            catch (e) {
                // return if for example <mouse_position> is undefined
                // hide the beam (just in case it gets displayed)
                d3.select("#" + zoom_location + "Beam").attr("opacity", 0.0);
                return;
            }

            if (isNaN(offset[0]) || isNaN(offset[1]))
                return;

            if ((offset[0] >= 0) && (offset[1] >= 0)) {
                mouse_position = { x: offset[0], y: offset[1] };
            };

            //console.log("mouse position:", mouse_position);

            var image_bounding_dims = imageContainer.image_bounding_dims;
            var scale = get_image_scale(width, height, image_bounding_dims.width, image_bounding_dims.height);

            var clipSize = Math.min(image_bounding_dims.width, image_bounding_dims.height) / zoom_scale;
            var sel_width = clipSize * scale;
            var sel_height = clipSize * scale;

            if (!mousedown) {
                let mx = mouse_position.x;
                let my = mouse_position.y;

                if (zoom_shape == "square")
                    zoom_element.attr("x", mx - sel_width).attr("y", my - sel_height).attr("width", 2 * sel_width).attr("height", 2 * sel_height).attr("opacity", 1.0);

                if (zoom_shape == "circle")
                    zoom_element.attr("cx", mx).attr("cy", my).attr("r", Math.round(sel_width)).attr("opacity", 1.0);

                var crossSize = 1.0 * emFontSize;
                zoom_cross.attr("x", mx - crossSize / 2).attr("y", my - crossSize / 2).attr("width", crossSize).attr("height", crossSize).attr("opacity", 0.75);
            }

            let rect = event.currentTarget;

            var ax = (image_bounding_dims.width - 0) / (rect.getAttribute("width") - 0);
            var x = image_bounding_dims.x1 + ax * (mouse_position.x - rect.getAttribute("x"));

            var ay = (image_bounding_dims.height - 0) / (rect.getAttribute("height") - 0);
            var y = (image_bounding_dims.y1 + image_bounding_dims.height - 0) - ay * (mouse_position.y - rect.getAttribute("y"));

            var orig_x = x * (fitsData.width - 0) / (imageContainer.width - 0);
            var orig_y = y * (fitsData.height - 0) / (imageContainer.height - 0);

            try {
                let raText = 'RA N/A';
                let decText = 'DEC N/A';

                if (fitsData.CTYPE1.indexOf("RA") > -1) {
                    if (coordsFmt == 'DMS')
                        raText = 'α: ' + x2dms(orig_x);
                    else
                        raText = 'α: ' + x2hms(orig_x);
                }

                if (fitsData.CTYPE1.indexOf("GLON") > -1)
                    raText = 'l: ' + x2dms(orig_x);

                if (fitsData.CTYPE1.indexOf("ELON") > -1)
                    raText = 'λ: ' + x2dms(orig_x);

                if (fitsData.CTYPE2.indexOf("DEC") > -1)
                    decText = 'δ: ' + y2dms(orig_y);

                if (fitsData.CTYPE2.indexOf("GLAT") > -1)
                    decText = 'b: ' + y2dms(orig_y);

                if (fitsData.CTYPE2.indexOf("ELAT") > -1)
                    decText = 'β: ' + y2dms(orig_y);

                d3.select("#ra").text(raText);
                d3.select("#dec").text(decText);
            }
            catch (err) {
                //use the CD scale matrix
                let radec = CD_matrix(orig_x, fitsData.height - orig_y);

                let raText = 'RA N/A';
                let decText = 'DEC N/A';

                if (fitsData.CTYPE1.indexOf("RA") > -1) {
                    if (coordsFmt == 'DMS')
                        raText = 'α: ' + RadiansPrintDMS(radec[0]);
                    else
                        raText = 'α: ' + RadiansPrintHMS(radec[0]);
                }

                if (fitsData.CTYPE1.indexOf("GLON") > -1)
                    raText = 'l: ' + RadiansPrintDMS(radec[0]);

                if (fitsData.CTYPE1.indexOf("ELON") > -1)
                    raText = 'λ: ' + RadiansPrintDMS(radec[0]);

                if (fitsData.CTYPE2.indexOf("DEC") > -1)
                    decText = 'δ: ' + RadiansPrintDMS(radec[1]);

                if (fitsData.CTYPE2.indexOf("GLAT") > -1)
                    decText = 'b: ' + RadiansPrintDMS(radec[1]);

                if (fitsData.CTYPE2.indexOf("ELAT") > -1)
                    decText = 'β: ' + RadiansPrintDMS(radec[1]);

                d3.select("#ra").text(raText);
                d3.select("#dec").text(decText);
            }

            //for each image
            var pixelText = '';
            var displayPixel = true;
            {
                var imageFrame = imageContainer;

                var pixel_coord = Math.round(y) * imageFrame.width + Math.round(x);

                var pixel = imageFrame.pixels[pixel_coord];
                var alpha = imageFrame.alpha[pixel_coord];

                let bunit = fitsData.BUNIT.trim();

                // replace counts by count(s)
                if (bunit == 'counts')
                    bunit = 'count(s)';

                if (alpha > 0 && !isNaN(pixel)) {
                    //d3.select("#pixel").text(prefix + pixelVal.toPrecision(3) + " " + bunit).attr("opacity", 1.0) ;
                    pixelText += Math.round(Math.exp(pixel))/*.toPrecision(3)*/ + " ";
                    displayPixel = displayPixel && true;
                }
                else {
                    //d3.select("#pixel").text("").attr("opacity", 0.0) ;
                    displayPixel = displayPixel && false;
                }

                if (displayPixel) {
                    pixelText += bunit;
                    d3.select("#pixel").text(pixelText).attr("opacity", 1.0);
                }
                else
                    d3.select("#pixel").text("").attr("opacity", 0.0);
            }

            //viewport collision detection
            {
                var collision_detected = false;

                if (zoom_shape == "square") {
                    let w1 = parseFloat(zoom_element.attr("width"));
                    let h1 = parseFloat(zoom_element.attr("height"));

                    let tmp = d3.select("#" + zoom_location);
                    let x2 = parseFloat(tmp.attr("x"));
                    let y2 = parseFloat(tmp.attr("y"));
                    let w2 = parseFloat(tmp.attr("width"));
                    let h2 = parseFloat(tmp.attr("height"));

                    if (zoom_location == "upper")
                        if (((offset[0] - w1 / 2) < (x2 + w2)) && (offset[1] - h1 / 2) < (y2 + h2)) {
                            collision_detected = true;
                        }

                    if (zoom_location == "lower")
                        if (((offset[0] + w1 / 2) > x2) && (offset[1] + h1 / 2) > y2)
                            collision_detected = true;
                }

                if (zoom_shape == "circle") {
                    let r1 = parseFloat(zoom_element.attr("r"));

                    let tmp = d3.select("#" + zoom_location);

                    let _x = parseFloat(tmp.attr("cx"));
                    let _y = parseFloat(tmp.attr("cy"));
                    let r2 = parseFloat(tmp.attr("r"));

                    let dx = offset[0] - _x;
                    let dy = offset[1] - _y;
                    let rSq = dx * dx + dy * dy;

                    if (rSq < (r1 + r2) * (r1 + r2))
                        collision_detected = true;
                }

                if (collision_detected/* && zoom_scale > 10*/) {
                    //ctx.clearRect(0, 0, c.width, c.height);
                    swap_viewports();
                }
            }

            // update image updates      
            if (!mousedown) {
                var px, py;

                var zoomed_size = Math.round(get_zoomed_size(width, height, img_width, img_height));

                if (zoom_location == "upper") {
                    px = emStrokeWidth;
                    py = emStrokeWidth;
                }
                else {
                    px = width - 1 - emStrokeWidth - zoomed_size;
                    py = height - 1 - emStrokeWidth - zoomed_size;
                }

                zoomed_size = Math.round(zoomed_size);
                px = Math.round(px);
                py = Math.round(py);

                //image_stack.push({ x: x, y: y, clipSize: clipSize, px: px, py: py, zoomed_size: zoomed_size });
                viewport_zoom_settings = { x: x, y: y, clipSize: clipSize, px: px, py: py, zoomed_size: zoomed_size };

                if ((mouse_position.x != prev_mouse_position.x) || (mouse_position.y != prev_mouse_position.y)) {
                    prev_mouse_position = mouse_position;
                    viewport.refresh = true;
                }
            }

            now = performance.now();
            elapsed = performance.now() - then;

            // predict future mouse positions, send spectrum update requests
            if (elapsed > fpsInterval + computed && !mousedown)//+ latency, computed
            {
                then = now - (elapsed % fpsInterval);
                //XWS.send('[mouse] t=' + now + ' x=' + offset[0] + ' y=' + offset[1]);

                //console.log("refresh interval: " + elapsed.toFixed(3) + " [ms]", "fps = ", Math.round(1000 / elapsed));

                if (!initKalmanFilter)
                    initKalman();

                updateKalman();

                var pred_mouse_x = Math.round(mouse_position.x + last_x.elements[2] * latency);
                var pred_mouse_y = Math.round(mouse_position.y + last_x.elements[3] * latency);
                //var pred_mouse_x = Math.round(mouse_position.x + last_x.elements[0] * latency + 0.5 * last_x.elements[2] * latency * latency) ;
                //var pred_mouse_y = Math.round(mouse_position.y + last_x.elements[1] * latency + 0.5 * last_x.elements[3] * latency * latency) ;				

                //console.log("latency = ", latency.toFixed(1), "[ms]", "mx = ", mouse_position.x, "px = ", pred_mouse_x, "my = ", mouse_position.y, "py = ", pred_mouse_y);
                /*var pred_x = image_bounding_dims.x1 + (pred_mouse_x - d3.select(this).attr("x")) / (d3.select(this).attr("width") - 1) * (image_bounding_dims.width - 1);
                var pred_y = image_bounding_dims.y2 + (pred_mouse_y - d3.select(this).attr("y")) / (d3.select(this).attr("height") - 1) * (image_bounding_dims.height - 1);*/

                let rect = event.currentTarget;

                var ax = (image_bounding_dims.width - 0) / (rect.getAttribute("width") - 0);
                var pred_x = image_bounding_dims.x1 + ax * (pred_mouse_x - rect.getAttribute("x"));

                var ay = (image_bounding_dims.height - 0) / (rect.getAttribute("height") - 0);
                var pred_y = (image_bounding_dims.y1 + image_bounding_dims.height - 0) - ay * (pred_mouse_y - rect.getAttribute("y"));

                var fitsX = Math.round(pred_x * (fitsData.width - 0) / (imageContainer.width - 0));//x or pred_x
                var fitsY = Math.round(pred_y * (fitsData.height - 0) / (imageContainer.height - 0));//y or pred_y
                var fitsSize = clipSize * (fitsData.width - 0) / (imageContainer.width - 0);

                //console.log('active', 'x = ', x, 'y = ', y, 'clipSize = ', clipSize, 'fitsX = ', fitsX, 'fitsY = ', fitsY, 'fitsSize = ', fitsSize) ;
                //let strLog = 'active x = ' + x + ' y = '+ y + ' clipSize = ' + clipSize + ' fitsX = ' + fitsX + ' fitsY = ' + fitsY + ' fitsSize = ' + fitsSize + ' pred_x = ' + pred_x + ' pred_y = ' + pred_y + ' pred_mouse_x = ' + pred_mouse_x + ' pred_mouse_y = ' + pred_mouse_y ;

                //send a spectrum request to the server				
                var x1 = Math.round(fitsX - fitsSize);
                var y1 = Math.round(fitsY - fitsSize);
                var x2 = Math.round(fitsX + fitsSize);
                var y2 = Math.round(fitsY + fitsSize);

                if (realtime_spectrum && fitsData.depth > 1) {
                    sent_seq_id++;

                    // a real-time websocket request
                    var range = get_axes_range(width, height);
                    var dx = range.xMax - range.xMin;

                    if (viewport_zoom_settings != null) {
                        let _width = viewport_zoom_settings.zoomed_size;
                        let _height = viewport_zoom_settings.zoomed_size;

                        var request = {
                            type: "realtime_image_spectrum",
                            dx: dx,
                            image: false,
                            quality: image_quality,
                            x1: fitsData.OFFSETX + x1 + 1,
                            y1: fitsData.OFFSETY + y1 + 1,
                            x2: fitsData.OFFSETX + x2 + 1,
                            y2: fitsData.OFFSETY + y2 + 1,
                            width: _width,
                            height: _height,
                            beam: zoom_shape,
                            frame_start: Math.log(1000 * data_band_lo) - 0.5 * fitsData.CDELT3,
                            frame_end: Math.log(1000 * data_band_hi) + 0.5 * fitsData.CDELT3,
                            seq_id: sent_seq_id,
                            timestamp: performance.now()
                        };

                        if (wsConn != null && wsConn.readyState == 1)
                            wsConn.send(JSON.stringify(request));
                    }
                }

                setup_window_timeout();
            }

            idleMouse = setTimeout(imageTimeout, 250);//was 250ms + latency
        });

    zoom.scaleTo(rect, zoom_scale);
}

function init_webgl_legend_buffers() {
    //place the image onto the main canvas
    var canvas = document.getElementById('legendCanvas');
    canvas.style.display = "block";// a hack needed by Apple Safari
    var width = canvas.width;
    var height = canvas.height;

    if (webgl1 || webgl2) {
        canvas.addEventListener("webglcontextlost", function (event) {
            event.preventDefault();
            console.error("legendCanvas: webglcontextlost");
        }, false);

        canvas.addEventListener(
            "webglcontextrestored", function () {
                console.log("legendCanvas: webglcontextrestored");
                init_webgl_legend_buffers();
            }, false);
    }

    if (webgl2) {
        var ctx = canvas.getContext("webgl2");
        imageContainer.legend_gl = ctx;
        // console.log("init_webgl is using the WebGL2 context.");

        // enable floating-point textures filtering			
        ctx.getExtension('OES_texture_float_linear');

        // needed by gl.checkFramebufferStatus
        ctx.getExtension('EXT_color_buffer_float');

        // call the common WebGL renderer
        webgl_legend_renderer(ctx, width, height);
    } else if (webgl1) {
        var ctx = canvas.getContext("webgl");
        imageContainer.legend_gl = ctx;
        // console.log("init_webgl is using the WebGL1 context.");

        // enable floating-point textures
        ctx.getExtension('OES_texture_float');
        ctx.getExtension('OES_texture_float_linear');

        // call the common WebGL renderer
        webgl_legend_renderer(ctx, width, height);
    } else {
        console.log("WebGL not supported by your browser, falling back onto HTML 2D Canvas (not implemented yet).");
        return;
    }
}

function clear_webgl_legend_buffers() {
    var image = imageContainer;
    var gl = image.legend_gl;

    if (gl === undefined || gl == null)
        return;

    // position buffer	
    gl.deleteBuffer(image.legend_positionBuffer);

    // program
    gl.deleteShader(image.legend_program.vShader);
    gl.deleteShader(image.legend_program.fShader);
    gl.deleteProgram(image.legend_program);

    //image.legend_gl = null;
}

function webgl_legend_renderer(gl, width, height) {
    var image = imageContainer;

    // setup GLSL program
    var vertexShaderCode = document.getElementById("legend-vertex-shader").text;
    var fragmentShaderCode = document.getElementById("legend-common-shader").text;
    fragmentShaderCode += document.getElementById(colourmap + "-shader").text;

    // remove the alpha blending multiplier
    fragmentShaderCode = fragmentShaderCode.replace(/gl_FragColor.rgb *= gl_FragColor.a;/g, "");

    // WebGL2 accepts WebGL1 shaders so there is no need to update the code	
    if (webgl2) {
        var prefix = "#version 300 es\n";
        vertexShaderCode = prefix + vertexShaderCode;
        fragmentShaderCode = prefix + fragmentShaderCode;

        // attribute -> in
        vertexShaderCode = vertexShaderCode.replace(/attribute/g, "in");
        fragmentShaderCode = fragmentShaderCode.replace(/attribute/g, "in");

        // varying -> out
        vertexShaderCode = vertexShaderCode.replace(/varying/g, "out");

        // varying -> in
        fragmentShaderCode = fragmentShaderCode.replace(/varying/g, "in");

        // texture2D -> texture
        fragmentShaderCode = fragmentShaderCode.replace(/texture2D/g, "texture");

        // replace gl_FragColor with a custom variable, i.e. texColour
        fragmentShaderCode = fragmentShaderCode.replace(/gl_FragColor/g, "texColour");

        // add the definition of texColour
        var pos = fragmentShaderCode.indexOf("void main()");
        fragmentShaderCode = fragmentShaderCode.insert_at(pos, "out vec4 texColour;\n\n");
    }

    var program = createProgram(gl, vertexShaderCode, fragmentShaderCode);
    image.legend_program = program;

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");

    // Create a position buffer
    var positionBuffer = gl.createBuffer();
    image.legend_positionBuffer = positionBuffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Put a unit quad in the buffer
    var positions = [
        -1, -1,
        -1, 1,
        1, -1,
        1, -1,
        -1, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // no need for an animation loop, just handle the lost context
    //WebGL how to convert from clip space to pixels	
    gl.viewport(0, 0, width, height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // drawRegion (execute the GLSL program)
    // Tell WebGL to use our shader program pair
    gl.useProgram(program);

    // Setup the attributes to pull data from our buffers
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // execute the GLSL program
    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function get_zoomed_size(width, height, img_width, img_height) {
    var zoomed_size = Math.max(width / 2, height / 2) / golden_ratio;

    if (zoom_shape == "square")
        return Math.round(zoomed_size);

    if (zoom_shape == "circle")
        return Math.round(1.2 * zoomed_size);
}

function setup_viewports() {
    //delete previous instances
    try {
        d3.select("#upper").remove();
        d3.select("#lower").remove();
        d3.select("#upperCross").remove();
        d3.select("#lowerCross").remove();
    }
    catch (e) { };

    var svg = d3.select("#FrontSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    var elem = d3.select("#image_rectangle");
    var img_width = parseFloat(elem.attr("width"));
    var img_height = parseFloat(elem.attr("height"));
    var zoomed_size = get_zoomed_size(width, height, img_width, img_height);

    if (zoom_shape == "square") {
        //upper zoom
        svg.append("rect")
            .attr("id", "upper")
            .attr("x", (emStrokeWidth))
            .attr("y", (emStrokeWidth))
            .attr("width", zoomed_size)
            .attr("height", zoomed_size)
            .attr("fill", "transparent")
            .style("stroke", "transparent")
            //.style("stroke-dasharray", ("1, 5, 1"))
            .style("stroke-width", emStrokeWidth / 2)
            .attr("opacity", 1.0)
            .on("mouseover", function () { /*if(windowLeft) return; else swap_viewports();*/ zoom_location = "lower"; var elem = d3.select(this); elem.style("stroke", "transparent"); elem.moveToBack(); d3.select("#lower").moveToFront(); });

        //lower zoom
        svg.append("rect")
            .attr("id", "lower")
            .attr("x", (width - 1 - emStrokeWidth - zoomed_size))
            .attr("y", (height - 1 - emStrokeWidth - zoomed_size))
            .attr("width", zoomed_size)
            .attr("height", zoomed_size)
            .attr("fill", "transparent")
            .style("stroke", "transparent")
            //.style("stroke-dasharray", ("1, 5, 1"))
            .style("stroke-width", emStrokeWidth / 2)
            .attr("opacity", 1.0)
            .on("mouseover", function () { /*if(windowLeft) return; else swap_viewports();*/ zoom_location = "upper"; var elem = d3.select(this); elem.style("stroke", "transparent"); elem.moveToBack(); d3.select("#upper").moveToFront(); });
    };

    if (zoom_shape == "circle") {
        //upper zoom
        svg.append("circle")
            .attr("id", "upper")
            .attr("cx", (emStrokeWidth + zoomed_size / 2))
            .attr("cy", (emStrokeWidth + zoomed_size / 2))
            .attr("r", zoomed_size / 2)
            .attr("fill", "transparent")
            .style("stroke", "transparent")
            //.style("stroke-dasharray", ("1, 5, 1"))
            .style("stroke-width", emStrokeWidth / 2)
            .attr("opacity", 1.0)
            .on("mouseover", function () { /*if(windowLeft) return; else swap_viewports();*/ zoom_location = "lower"; var elem = d3.select(this); elem.style("stroke", "transparent"); elem.moveToBack(); d3.select("#lower").moveToFront(); });

        //lower zoom
        svg.append("circle")
            .attr("id", "lower")
            .attr("cx", (width - 1 - emStrokeWidth - zoomed_size / 2))
            .attr("cy", (height - 1 - emStrokeWidth - zoomed_size / 2))
            .attr("r", zoomed_size / 2)
            .attr("fill", "transparent")
            .style("stroke", "transparent")
            //.style("stroke-dasharray", ("1, 5, 1"))
            .style("stroke-width", emStrokeWidth / 2)
            .attr("opacity", 1.0)
            .on("mouseover", function () { /*if(windowLeft) return; else swap_viewports();*/ zoom_location = "upper"; var elem = d3.select(this); elem.style("stroke", "transparent"); elem.moveToBack(); d3.select("#upper").moveToFront(); });
    };

    var crossSize = 2.0 * emFontSize;

    //upper cross-hair
    svg.append("svg:image")
        .attr("id", "upperCross")
        .attr("x", (emStrokeWidth + (zoomed_size - crossSize) / 2))
        .attr("y", (emStrokeWidth + (zoomed_size - crossSize) / 2))
        //.attr("xlink:href", ROOT_PATH + "plainicon.com-crosshair_white.svg")
        .attr("xlink:href", "https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/plainicon.com-crosshair_white.svg")
        .attr("width", crossSize)
        .attr("height", crossSize)
        .attr("opacity", 0.0);

    //lower cross-hair
    svg.append("svg:image")
        .attr("id", "lowerCross")
        .attr("x", (width - 1 - emStrokeWidth - (zoomed_size + crossSize) / 2))
        .attr("y", (height - 1 - emStrokeWidth - (zoomed_size + crossSize) / 2))
        //.attr("xlink:href", ROOT_PATH + "plainicon.com-crosshair_white.svg")
        .attr("xlink:href", "https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/plainicon.com-crosshair_white.svg")
        .attr("width", crossSize)
        .attr("height", crossSize)
        .attr("opacity", 0.0);
}

function swap_viewports() {
    // swap the zoomed viewports
    if (viewport != null) {
        // Clear the ZOOM Canvas
        //console.log("clearing the ZOOM Canvas");
        var gl = viewport.gl;

        if (gl !== undefined && gl != null) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        viewport.refresh = true;
    }

    clear_webgl_viewport();

    d3.select("#" + zoom_location + "Cross").attr("opacity", 0.0);
    d3.select("#" + zoom_location + "Beam").attr("opacity", 0.0);

    var elem = d3.select('#' + zoom_location);
    elem.style("stroke", "transparent");
    elem.attr("pointer-events", "none");
    elem.moveToBack();

    if (zoom_location == "upper") {
        d3.select("#lower")
            .attr("pointer-events", "auto")
            .moveToFront();

        zoom_location = "lower";
        return;
    }

    if (zoom_location == "lower") {
        d3.select("#upper")
            .attr("pointer-events", "auto")
            .moveToFront();

        zoom_location = "upper";
        return;
    }
}

function copy_coordinates(e) {
    var textToPutOnClipboard = d3.select("#ra").text() + " " + d3.select("#dec").text();

    navigator.clipboard.writeText(textToPutOnClipboard).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });

    e.preventDefault();
}

function resetKalman() {
    last_x = $V([mouse_position.x, mouse_position.y, 0, 0]);
    //last_x = $V([0, 0, 0, 0]);
    last_velX = 0;
    last_velY = 0;
    last_xPos = mouse_position.x;
    last_yPos = mouse_position.y;
    last_t = performance.now();
}

function initKalman() {
    A = $M([
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ]);

    B = $M([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ]);

    H = $M([
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]);

    Q = $M([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0.1, 0],
        [0, 0, 0, 0.1]
    ]);

    R = $M([
        [100, 0, 0, 0],
        [0, 100, 0, 0],
        [0, 0, 1000, 0],
        [0, 0, 0, 1000]
    ]);

    resetKalman();

    last_P = $M([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]);

    initKalmanFilter = true;
}

function updateKalman() {
    cur_xPos = mouse_position.x;
    cur_yPos = mouse_position.y;

    var now = performance.now();
    var dt = now - last_t;

    if (dt == 0)
        return;

    last_t = now;

    //update A and H to take into account dt
    A.elements[0][2] = dt;
    A.elements[1][3] = dt;

    /*** KALMAN FILTER CODE ***/
    var velX = (cur_xPos - last_x.elements[0]) / dt;
    var velY = (cur_yPos - last_x.elements[1]) / dt;

    /*var velX = (cur_xPos - last_xPos)/dt;
    var velY = (cur_yPos - last_yPos)/dt;
    var accX = (velX - last_velX)/dt;
    var accY = (velY - last_velY)/dt;
  	
    last_xPos = cur_xPos ;
    last_yPos = cur_yPos ;
    last_velX = velX ;
    last_velY = velY ;*/

    var measurement = $V([cur_xPos, cur_yPos, velX, velY]);
    //var measurement = $V([velX, velY, accX, accY]);
    var control = $V([0, 0, 0, 0]); // TODO - adjust

    // prediction
    var x = (A.multiply(last_x)).add(B.multiply(control));
    var P = ((A.multiply(last_P)).multiply(A.transpose())).add(Q);

    // correction
    var S = ((H.multiply(P)).multiply(H.transpose())).add(R);
    var K = (P.multiply(H.transpose())).multiply(S.inverse());
    var y = measurement.subtract(H.multiply(x));

    var cur_x = x.add(K.multiply(y));
    var cur_P = ((Matrix.I(4)).subtract(K.multiply(H))).multiply(P);

    last_x = cur_x;
    last_P = cur_P;
    /**************************/

    //return ;

    //console.log("mouse_position: x=", mouse_position.x, "y=", mouse_position.y) ;
    //console.log("K:", K) ;
    //console.log("Kalman Filter X=", cur_x.elements[0], "Y=",cur_x.elements[1], "Vx=", cur_x.elements[2], "Vy=",cur_x.elements[3]) ;
    //console.log("Kalman Filter Vx=", cur_x.elements[0], "Vy=",cur_x.elements[1], "Ax=", cur_x.elements[2], "Ay=",cur_x.elements[3]) ;

    return;

    /*mouse_position.x = cur_x.elements[0];
    mouse_position.y = cur_x.elements[1];
  	
    return;
  	
    //extrapolation
    var predX = last_x;
    var count = 5;//how many frames ahead
  	
    for (var i = 0; i < count; i++)
      predX = (A.multiply(predX)).add(B.multiply(control));
  	
    console.log("extrapolation: x=", predX.elements[0], "y=", predX.elements[1]);
  	
    mouse_position.x = predX.elements[0];
    mouse_position.y = predX.elements[1];*/
}

function init_webgl_zoom_buffers() {
    // place the viewport onto the zoom canvas
    var canvas = document.getElementById('ZOOMCanvas');
    canvas.style.display = "block";// a hack needed by Apple Safari
    var height = canvas.height;

    if (webgl1 || webgl2) {
        canvas.addEventListener("webglcontextlost", function (event) {
            event.preventDefault();

            cancelAnimationFrame(viewport.loopId);
            console.error("ZOOMCanvas: webglcontextlost");
        }, false);

        canvas.addEventListener(
            "webglcontextrestored", function () {
                console.log("ZOOMCanvas: webglcontextrestored");
                init_webgl_zoom_buffers();
            }, false);
    }

    if (webgl2) {
        var ctx = canvas.getContext("webgl2");
        viewport.gl = ctx;
        // console.log("init_webgl is using the WebGL2 context.");

        // enable floating-point textures filtering			
        ctx.getExtension('OES_texture_float_linear');

        // needed by gl.checkFramebufferStatus
        ctx.getExtension('EXT_color_buffer_float');

        // call the common WebGL renderer
        webgl_zoom_renderer(ctx, height);
    } else if (webgl1) {
        var ctx = canvas.getContext("webgl");
        viewport.gl = ctx;
        // console.log("init_webgl is using the WebGL1 context.");

        // enable floating-point textures
        ctx.getExtension('OES_texture_float');
        ctx.getExtension('OES_texture_float_linear');

        // call the common WebGL renderer
        webgl_zoom_renderer(ctx, height);
    } else {
        console.log("WebGL not supported by your browser, falling back onto HTML 2D Canvas (not implemented yet).");
        return;
    }
}

function clear_webgl_viewport() {
    var canvas = document.getElementById('ViewportCanvas');
    canvas.style.display = "block";// a hack needed by Apple Safari

    if (webgl2) {
        var gl = canvas.getContext("webgl2");

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    } else if (webgl1) {
        var gl = canvas.getContext("webgl");

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}

function clear_webgl_zoom_buffers() {
    // cancel the animation loop
    cancelAnimationFrame(viewport.loopId);

    var gl = viewport.gl;

    if (gl === undefined || gl == null)
        return;

    // position buffer
    if (viewport.positionBuffer != undefined)
        gl.deleteBuffer(viewport.positionBuffer);

    // texture
    if (viewport.tex != undefined)
        gl.deleteTexture(viewport.tex);

    // program
    if (viewport.program != undefined) {
        gl.deleteShader(viewport.program.vShader);
        gl.deleteShader(viewport.program.fShader);
        gl.deleteProgram(viewport.program);
    }

    viewport.gl = null;
}

function webgl_zoom_renderer(gl, height) {
    let image = imageContainer;

    if (image == null) {
        console.log("webgl_zoom_renderer: null image");
        return;
    }

    // setup GLSL program
    var vertexShaderCode = document.getElementById("vertex-shader").text;
    var fragmentShaderCode = document.getElementById("common-shader").text + document.getElementById("log-shader").text;

    if (webgl2)
        fragmentShaderCode = fragmentShaderCode + "\ncolour.a = colour.g;\n";

    fragmentShaderCode += document.getElementById(colourmap + "-shader").text;

    // grey-out pixels for alpha = 0.0
    var pos = fragmentShaderCode.lastIndexOf("}");
    fragmentShaderCode = fragmentShaderCode.insert_at(pos, "if (gl_FragColor.a == 0.0) gl_FragColor.rgba = vec4(0.0, 0.0, 0.0, 0.3);\n");

    if (zoom_shape == "circle") {
        pos = fragmentShaderCode.lastIndexOf("}");
        fragmentShaderCode = fragmentShaderCode.insert_at(pos, "float r_x = v_texcoord.z;\n float r_y = v_texcoord.w;\n if (r_x * r_x + r_y * r_y > 1.0) gl_FragColor.rgba = vec4(0.0, 0.0, 0.0, 0.0);\n");
    }


    // WebGL2 accepts WebGL1 shaders so there is no need to update the code	
    if (webgl2) {
        var prefix = "#version 300 es\n";
        vertexShaderCode = prefix + vertexShaderCode;
        fragmentShaderCode = prefix + fragmentShaderCode;

        // attribute -> in
        vertexShaderCode = vertexShaderCode.replace(/attribute/g, "in");
        fragmentShaderCode = fragmentShaderCode.replace(/attribute/g, "in");

        // varying -> out
        vertexShaderCode = vertexShaderCode.replace(/varying/g, "out");

        // varying -> in
        fragmentShaderCode = fragmentShaderCode.replace(/varying/g, "in");

        // texture2D -> texture
        fragmentShaderCode = fragmentShaderCode.replace(/texture2D/g, "texture");

        // replace gl_FragColor with a custom variable, i.e. texColour
        fragmentShaderCode = fragmentShaderCode.replace(/gl_FragColor/g, "texColour");

        // add the definition of texColour
        var pos = fragmentShaderCode.indexOf("void main()");
        fragmentShaderCode = fragmentShaderCode.insert_at(pos, "out vec4 texColour;\n\n");
    }

    var program = createProgram(gl, vertexShaderCode, fragmentShaderCode);
    viewport.program = program;

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");

    // Create a position buffer
    var positionBuffer = gl.createBuffer();
    viewport.positionBuffer = positionBuffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Put a unit quad in the buffer
    var positions = [
        -1, -1,
        -1, 1,
        1, -1,
        1, -1,
        -1, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // load a texture
    var tex = gl.createTexture();
    viewport.tex = tex;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    /*gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);*/
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    if (webgl2)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, image.width, image.height, 0, gl.RG, gl.FLOAT, image.texture);
    else
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, image.width, image.height, 0, gl.LUMINANCE_ALPHA, gl.FLOAT, image.texture);

    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
        console.error(status);
    }

    var last_viewport_loop = 0;
    viewport.refresh = true;

    // shoud be done in an animation loop
    function zoom_rendering_loop() {
        if (viewport_zoom_settings == null) {
            // console.log("webgl_zoom_renderer: null viewport_zoom_settings");
            viewport.loopId = requestAnimationFrame(zoom_rendering_loop);
            return;
        }

        let now = performance.now();

        // limit the FPS
        let _fps = 30;
        if ((now - last_viewport_loop) < (1000 / _fps)) {
            viewport.loopId = requestAnimationFrame(zoom_rendering_loop);
            return;
        } else {
            last_viewport_loop = now;
        }

        if (viewport.gl === undefined || viewport.gl == null) {
            return;
        }

        if (!viewport.refresh) {
            viewport.loopId = requestAnimationFrame(zoom_rendering_loop);
            return;
        } else
            viewport.refresh = false;

        if (invalidateViewport) {
            clear_webgl_viewport();
            invalidateViewport = false;
        }

        //WebGL how to convert from clip space to pixels		
        let px = viewport_zoom_settings.px;
        let py = viewport_zoom_settings.py;
        let viewport_size = viewport_zoom_settings.zoomed_size;
        py = height - py - viewport_size;
        gl.viewport(px, py, viewport_size, viewport_size);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // the image bounding box
        var locationOfBox = gl.getUniformLocation(program, "box");

        // image tone mapping
        var locationOfParams = gl.getUniformLocation(program, "params");

        // drawRegion (execute the GLSL program)
        // Tell WebGL to use our shader program pair
        gl.useProgram(program);

        let xmin = (viewport_zoom_settings.x - viewport_zoom_settings.clipSize) / (image.width - 0); // was - 1
        let ymin = (viewport_zoom_settings.y - viewport_zoom_settings.clipSize) / (image.height - 0); // was - 1
        let _width = (2 * viewport_zoom_settings.clipSize + 1) / image.width; // was + 1
        let _height = (2 * viewport_zoom_settings.clipSize + 1) / image.height; // was + 1

        //console.log("xmin:", xmin, "ymin:", ymin, "_width:", _width, "_height:", _height);		
        gl.uniform4fv(locationOfBox, [xmin, ymin, _width, _height]);

        // logarithmic tone mapping        
        var params = [Math.log(image.pixel_range.min_pixel), Math.log(image.pixel_range.max_pixel), 0, 0];
        gl.uniform4fv(locationOfParams, params);

        // Setup the attributes to pull data from our buffers
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // execute the GLSL program
        // draw the quad (2 triangles, 6 vertices)
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        viewport.loopId = requestAnimationFrame(zoom_rendering_loop);
    };

    viewport.loopId = requestAnimationFrame(zoom_rendering_loop);
}

function imageTimeout() {
    //console.log("image inactive event");

    if (mousedown || streaming)
        return;

    moving = false;

    //d3.select("#image_rectangle").style('cursor','crosshair');

    //console.log("idle mouse position: ", mouse_position);

    var svg = d3.select("#FrontSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    var image_bounding_dims = imageContainer.image_bounding_dims;
    var scale = get_image_scale(width, height, image_bounding_dims.width, image_bounding_dims.height);
    var img_width = scale * image_bounding_dims.width;
    var img_height = scale * image_bounding_dims.height;

    var rect_elem = d3.select("#image_rectangle");

    var ax = (image_bounding_dims.width - 0) / (rect_elem.attr("width") - 0);
    var x = image_bounding_dims.x1 + ax * (mouse_position.x - rect_elem.attr("x"));

    var ay = (image_bounding_dims.height - 0) / (rect_elem.attr("height") - 0);
    var y = (image_bounding_dims.y1 + image_bounding_dims.height - 0) - ay * (mouse_position.y - rect_elem.attr("y"));

    var clipSize = Math.min(image_bounding_dims.width, image_bounding_dims.height) / zoom_scale;
    var sel_width = clipSize * scale;
    var sel_height = clipSize * scale;

    var fitsX = Math.round(x * (fitsData.width - 0) / (imageContainer.width - 0));
    var fitsY = Math.round(y * (fitsData.height - 0) / (imageContainer.height - 0));
    var fitsSize = clipSize * (fitsData.width - 0) / (imageContainer.width - 0);

    var image_update = true;

    if (fitsSize > clipSize)
        image_update = true;
    else
        image_update = false;

    // console.log('idle', 'x = ', x, 'y = ', y, 'clipSize = ', clipSize, 'fitsX = ', fitsX, 'fitsY = ', fitsY, 'fitsSize = ', fitsSize, 'image_update:', image_update);

    //send an image/spectrum request to the server
    var x1 = Math.round(fitsX - fitsSize);
    var y1 = Math.round(fitsY - fitsSize);
    var x2 = Math.round(fitsX + fitsSize);
    var y2 = Math.round(fitsY + fitsSize);

    var dimx = x2 - x1 + 1;
    var dimy = y2 - y1 + 1;

    if (dimx != dimy)
        console.log("unequal dimensions:", dimx, dimy, "fitsX =", fitsX, "fitsY =", fitsY, "fitsSize =", fitsSize);

    var zoomed_size = get_zoomed_size(width, height, img_width, img_height);

    //console.log("zoomed_size:", zoomed_size);

    if (moving || streaming)
        return;

    viewport_count = 0;

    sent_seq_id++;

    // a real-time websocket request
    var range = get_axes_range(width, height);
    var dx = range.xMax - range.xMin;

    if (viewport_zoom_settings != null) {
        let _width = viewport_zoom_settings.zoomed_size;
        let _height = viewport_zoom_settings.zoomed_size;

        var request = {
            type: "realtime_image_spectrum",
            dx: dx,
            image: image_update,
            quality: image_quality,
            x1: fitsData.OFFSETX + x1 + 1,
            y1: fitsData.OFFSETY + y1 + 1,
            x2: fitsData.OFFSETX + x2 + 1,
            y2: fitsData.OFFSETY + y2 + 1,
            width: _width,
            height: _height,
            beam: zoom_shape,
            frame_start: Math.log(1000 * data_band_lo) - 0.5 * fitsData.CDELT3,
            frame_end: Math.log(1000 * data_band_hi) + 0.5 * fitsData.CDELT3,
            seq_id: sent_seq_id,
            timestamp: performance.now()
        };

        if (wsConn != null && wsConn.readyState == 1)
            wsConn.send(JSON.stringify(request));
    }

    setup_window_timeout();

    if (moving || streaming)
        return;

    var zoom_element = d3.select("#zoom");
    var zoom_cross = d3.select("#zoomCross");

    //in the meantime repaint the selection element and the zoom canvas
    let mx = mouse_position.x;
    let my = mouse_position.y;

    if (zoom_shape == "square")
        zoom_element.attr("x", mx - sel_width).attr("y", my - sel_height).attr("width", 2 * sel_width).attr("height", 2 * sel_height).attr("opacity", 1.0);

    if (zoom_shape == "circle")
        zoom_element.attr("cx", mx).attr("cy", my).attr("r", Math.round(sel_width)).attr("opacity", 1.0);

    var crossSize = 1.0 * emFontSize;
    zoom_cross.attr("x", mx - crossSize / 2).attr("y", my - crossSize / 2).attr("width", crossSize).attr("height", crossSize).attr("opacity", 0.75);

    var px, py;

    if (zoom_location == "upper") {
        px = emStrokeWidth;
        py = emStrokeWidth;
    }
    else {
        px = width - 1 - emStrokeWidth - zoomed_size;
        py = height - 1 - emStrokeWidth - zoomed_size;
    }

    zoomed_size = Math.round(zoomed_size);
    px = Math.round(px);
    py = Math.round(py);

    //ctx.clearRect(px, py, zoomed_size, zoomed_size);

    //console.log("imageTimeout::END");
}

async function open_websocket_connection(_datasetId, index) {
    if ("WebSocket" in window) {
        // make a unique session id
        var session_id = uuidv4();

        // open a websocket connection
        var loc = window.location, ws_uri;
        var prot = loc.protocol;

        if (prot !== "https:") {
            ws_uri = "ws://" + loc.hostname + ':' + WS_PORT;
        } else {
            ws_uri = "wss://" + loc.hostname;
        }

        // a JVO override (a special exception)
        if (loc.hostname.indexOf("jvo.") != -1 || loc.hostname.indexOf("jvo-dev.") != -1) {
            ws_uri = "wss://" + loc.hostname;
        }

        ws_uri += ROOT_PATH + "websocket/" + encodeURIComponent(_datasetId) + "/" + session_id;

        {
            d3.select("#ping")
                .attr("fill", "orange")
                .attr("opacity", 0.8);

            XWS = new ReconnectingWebSocket(ws_uri, "", { binaryType: 'arraybuffer' });
            XWS.binaryType = 'arraybuffer';

            XWS.addEventListener("open", function (evt) {
                d3.select("#ping")
                    .attr("fill", "green")
                    .attr("opacity", 0.8);

                XWS.binaryType = 'arraybuffer';

                //let log = wasm_supported ? "WebAssembly is supported" : "WebAssembly is not supported";
                //XWS.send('[debug] ' + log);

                /*var rect = document.getElementById('mainDiv').getBoundingClientRect();
                var width = rect.width - 20;
                var height = rect.height - 20;
                XWS.send('image/' + width + '/' + height);*/

                send_ping();
            });

            XWS.addEventListener("error", function (evt) {

                d3.select("#ping")
                    .attr("fill", "red")
                    .attr("opacity", 0.8);

                d3.select("#latency").text('websocket conn. error');
            });

            XWS.addEventListener("close", function (evt) { });

            XWS.addEventListener("message", function (evt) {
                var t = performance.now();
                var received_msg = evt.data;

                if (evt.data instanceof ArrayBuffer) {
                    var dv = new DataView(received_msg);

                    latency = performance.now() - dv.getFloat32(0, endianness);
                    // console.log("[ws] latency = " + latency.toFixed(1) + " [ms]");
                    recv_seq_id = dv.getUint32(4, endianness);
                    var type = dv.getUint32(8, endianness);

                    // spectrum
                    if (type == 0) {
                        computed = dv.getFloat32(12, endianness);

                        var offset = 16;
                        var spectrum_len = dv.getUint32(offset, endianness);
                        offset += 4;

                        var frame = new Uint8Array(received_msg, offset);
                        // console.log("computed:", computed, "spectrum length:", spectrum_len, "frame.length:", frame.length);

                        // FPZIP decoder part				
                        Module.ready
                            .then(_ => {
                                let start = performance.now();
                                var res = Module.decompressZFPspectrum(spectrum_len, frame);
                                const spectrum = Module.HEAPF32.slice(res[0] / 4, res[0] / 4 + res[1]);
                                let elapsed = Math.round(performance.now() - start);

                                // console.log("spectrum size: ", spectrum.length, "elapsed: ", elapsed, "[ms]");

                                if (spectrum.length > 0) {
                                    if (!windowLeft) {
                                        spectrum_stack.push({ spectrum: spectrum, id: recv_seq_id });
                                        // console.log("spectrum_stack length:", spectrum_stack.length);
                                    };
                                }

                            })
                            .catch(e => console.error(e));

                        //console.log("[ws] computed = " + computed.toFixed(1) + " [ms]" + " length: " + length + " spectrum length:" + spectrum.length + " spectrum: " + spectrum);

                        return;
                    }

                    // viewport
                    if (type == 1) {
                        var offset = 16;
                        var view_width = dv.getUint32(offset, endianness);
                        offset += 4;

                        var view_height = dv.getUint32(offset, endianness);
                        offset += 4;

                        var pixels_length = dv.getUint32(offset, endianness);
                        offset += 4;

                        // console.log('pixels length:', pixels_length);

                        var frame_pixels = new Uint8Array(received_msg, offset, pixels_length);
                        offset += pixels_length;

                        var mask_length = dv.getUint32(offset, endianness);
                        offset += 4;

                        // console.log('mask length:', mask_length);

                        var frame_mask = new Uint8Array(received_msg, offset, mask_length);
                        offset += mask_length;

                        // viewport
                        {
                            //console.log("processing an HDR viewport");
                            let start = performance.now();

                            // decompressZFP returns std::vector<float>
                            // decompressZFPimage returns Float32Array but emscripten::typed_memory_view is buggy
                            var res = Module.decompressZFPimage(view_width, view_height, frame_pixels);
                            const pixels = Module.HEAPF32.slice(res[0] / 4, res[0] / 4 + res[1]);

                            var res = Module.decompressLZ4mask(view_width, view_height, frame_mask);
                            const alpha = Module.HEAPU8.slice(res[0], res[0] + res[1]);

                            let elapsed = Math.round(performance.now() - start);

                            // console.log("viewport width: ", view_width, "height: ", view_height, "elapsed: ", elapsed, "[ms]");

                            process_hdr_viewport(view_width, view_height, pixels, alpha);
                        }

                        return;
                    }

                    // video
                    if (type == 2) {
                        computed = dv.getFloat32(12, endianness);

                        var frame = new Uint8Array(received_msg, 16);

                        var latency = performance.now() - dv.getFloat32(0, endianness);
                        var transfer = (latency - computed) / 1000;//[s]

                        if (transfer > 0) {
                            var bandwidth = (received_msg.byteLength * 8 / 1000) / transfer;//[kilobits per s]

                            //bitrate tracking (variance-tracking Kalman Filter)
                            //eta = (variance - bitrate*bitrate) / (1 + Math.cosh(bitrate));
                            bitrate = (1 - eta) * bitrate + eta * bandwidth;
                            //variance = (1 - eta)*variance + eta * bandwidth*bandwidth;
                            target_bitrate = 0.8 * bitrate;
                        }

                        //console.log("[ws] computed = " + computed.toFixed(1) + " [ms], latency = " + latency.toFixed(1) + "[ms], n/w transfer time = " + (1000 * transfer).toFixed(1) + " [ms],  n/w bandwidth = " + Math.round(bandwidth) + " [kbps], frame length:" + frame.length);

                        //call the wasm decoder
                        {
                            let start = performance.now();

                            if (streaming && videoFrame != null) {
                                var img = videoFrame.img;
                                var data, fill;

                                if (theme == "dark")
                                    fill = 0;
                                else
                                    fill = 255;

                                var data;

                                try {
                                    // contouring
                                    var contours = 0;

                                    if (displayContours)
                                        contours = parseInt(document.getElementById('contour_lines').value) + 1;

                                    //HEVC                                   
                                    var res = Module.hevc_decode_frame(videoFrame.width, videoFrame.height, frame, 0, colourmap, fill, contours);
                                    data = new Uint8ClampedArray(Module.HEAPU8.subarray(res[0], res[0] + res[1])); // it's OK to use .subarray() instead of .slice() as a copy is made in "new Uint8ClampedArray()"
                                } catch (e) {
                                    // console.log(e);
                                };

                                var img = new ImageData(data, videoFrame.width, videoFrame.height);
                                videoFrame.img = img;

                                requestAnimationFrame(function () {
                                    process_video();
                                });
                            }
                            else {
                                try {
                                    //HEVC, ignore the decompressed output, just purge the HEVC buffers
                                    Module.hevc_decode_frame(0, 0, frame, 0, 'greyscale', fill, 0);
                                } catch (e) {
                                    // console.log(e);
                                };
                            }

                            let delta = performance.now() - start;

                            //console.log('total decoding/processing/rendering time: ' + delta.toFixed() + ' [ms]');

                            let log = 'video frame length ' + frame.length + ' bytes, decoding/processing/rendering time: ' + delta.toFixed() + ' [ms], bandwidth: ' + Math.round(bandwidth) + " [kbps], request latency: " + latency.toFixed() + ' [ms]';

                            if (video_fps_control == 'auto') {
                                //latency > computed or delta, take the greater
                                if (Math.max(latency, delta) > 0.8 * vidInterval) {
                                    //reduce the video FPS
                                    vidFPS = 0.8 * vidFPS;
                                    vidFPS = Math.max(1, vidFPS);
                                }
                                else {
                                    //increase the video FPS
                                    vidFPS = 1.2 * vidFPS;
                                    vidFPS = Math.min(30, vidFPS);
                                }
                            }

                            log += ' vidFPS = ' + Math.round(vidFPS);

                            if (videoFrame != null)
                                d3.select("#fps").text('video: ' + Math.round(vidFPS) + ' fps, bitrate: ' + Math.round(bitrate) + ' kbps');//, η: ' + eta.toFixed(4) + ' var: ' + variance
                        }

                        return;
                    }

                }

                if (typeof evt.data === "string") {
                    var cmd = "[close]";
                    var pos = received_msg.indexOf(cmd);

                    if (pos >= 0) {
                        if (XWS != null)
                            XWS.close();

                        d3.select("#ping")
                            .attr("fill", "red")
                            .attr("opacity", 0.8);

                        d3.select("#latency").text('60 min. inactive session time-out');

                        show_timeout();

                        return;
                    }
                }

                if (typeof evt.data === "string") {
                    var cmd = "[heartbeat]";
                    var pos = received_msg.indexOf(cmd);

                    if (pos >= 0) {
                        setTimeout(send_ping, 1000 + ping_latency);

                        var previous_t = parseFloat(received_msg.substring(pos + cmd.length));

                        ping_latency = (t - previous_t);

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

                        //console.log("ping latency = " + ping_latency.toFixed(1) + " [ms]" + ' fps: ' + fps.toFixed()) ;                   

                        if (ping_latency >= 1)
                            d3.select("#latency").text(`${ping_latency.toFixed()} ms ${fps.toFixed()} fps`);
                        else
                            d3.select("#latency").text(`${ping_latency.toFixed(1)} ms ${fps.toFixed()} fps`);

                        return;
                    }

                    try {
                        var data = JSON.parse(received_msg);

                        if (data.type == "init_video") {
                            var width = data.width;
                            var height = data.height;

                            if (videoFrame == null) {
                                let imageFrame = imageContainer;

                                if (imageFrame != null) {
                                    let tmp = imageFrame.image_bounding_dims;
                                    let dims = { x1: tmp.x1, y1: height - tmp.y1 - tmp.height, width: tmp.width, height: tmp.height };

                                    videoFrame = {
                                        width: width,
                                        height: height,
                                        padded_width: data.padded_width,
                                        padded_height: data.padded_height,
                                        img: null,
                                        scaleX: imageFrame.width / width,
                                        scaleY: imageFrame.height / height,
                                        image_bounding_dims: dims,
                                        //image_bounding_dims: imageFrame.image_bounding_dims,
                                        //image_bounding_dims: {x1: 0, y1: 0, width: width, height: height},
                                    }
                                }
                            }

                            try {
                                //init the HEVC decoder		
                                Module.hevc_init_frame(1, width, height);
                            } catch (e) {
                                //console.log(e);
                            };

                            // hide the contour plot
                            if (displayContours)
                                document.getElementById("ContourSVG").style.display = "none";
                        }

                        return;
                    }
                    catch (e) {
                        console.error(received_msg, e);
                    }
                }

            });


            wsConn = XWS;

        }
    } else {
        // The browser doesn't support WebSocket
        alert("WebSocket NOT supported by your Browser!");
    }
}

function process_hdr_viewport(img_width, img_height, pixels, alpha) {
    // console.log("process_hdr_viewport: #" + index);
    if (streaming || moving || windowLeft)
        return;

    // combine pixels with a mask	
    let len = pixels.length | 0;
    var texture = new Float32Array(2 * len);
    let offset = 0 | 0;

    for (let i = 0 | 0; i < len; i = (i + 1) | 0) {
        texture[offset] = pixels[i];
        offset = (offset + 1) | 0;

        texture[offset] = (alpha[i] > 0) ? 1.0 : 0.0;
        offset = (offset + 1) | 0;
    }

    //next project the viewport    
    let viewportContainer = { width: img_width, height: img_height, pixels: pixels, alpha: alpha, texture: texture };

    if (viewport != null) {
        // Clear the ZOOM Canvas
        //console.log("clearing the ZOOM Canvas");
        var gl = viewport.gl;

        if (gl !== undefined && gl != null) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
    }

    init_webgl_viewport_buffers(viewportContainer);
}

function init_webgl_viewport_buffers(container) {
    // place the viewport onto the zoom canvas
    var canvas = document.getElementById('ViewportCanvas');
    canvas.style.display = "block";// a hack needed by Apple Safari
    var height = canvas.height;

    if (webgl1 || webgl2) {
        canvas.addEventListener("webglcontextlost", function (event) {
            event.preventDefault();

            console.error("ViewportCanvas: webglcontextlost");
        }, false);

        canvas.addEventListener(
            "webglcontextrestored", function () {
                console.log("ViewportCanvas: webglcontextrestored");
                init_webgl_viewport_buffers(container);
            }, false);
    }

    if (webgl2) {
        var ctx = canvas.getContext("webgl2");
        // console.log("init_webgl is using the WebGL2 context.");

        // enable floating-point textures filtering			
        ctx.getExtension('OES_texture_float_linear');

        // needed by gl.checkFramebufferStatus
        ctx.getExtension('EXT_color_buffer_float');

        // call the common WebGL renderer
        webgl_viewport_renderer(ctx, container, height);
    } else if (webgl1) {
        var ctx = canvas.getContext("webgl");
        // console.log("init_webgl is using the WebGL1 context.");

        // enable floating-point textures
        ctx.getExtension('OES_texture_float');
        ctx.getExtension('OES_texture_float_linear');

        // call the common WebGL renderer
        webgl_viewport_renderer(ctx, container, height);
    } else {
        console.log("WebGL not supported by your browser, falling back onto HTML 2D Canvas (not implemented yet).");
        return;
    }
}

function webgl_viewport_renderer(gl, container, height) {
    let image = imageContainer;

    if (image == null) {
        console.log("webgl_viewport_renderer: null image");
        return;
    }

    // setup GLSL program
    var vertexShaderCode = document.getElementById("vertex-shader").text;
    var fragmentShaderCode = document.getElementById("common-shader").text + document.getElementById("log-shader").text;

    if (webgl2)
        fragmentShaderCode = fragmentShaderCode + "\ncolour.a = colour.g;\n";

    fragmentShaderCode += document.getElementById(colourmap + "-shader").text;

    // grey-out pixels for alpha = 0.0
    var pos = fragmentShaderCode.lastIndexOf("}");
    fragmentShaderCode = fragmentShaderCode.insert_at(pos, "if (gl_FragColor.a == 0.0) gl_FragColor.rgba = vec4(0.0, 0.0, 0.0, 0.3);\n");

    if (zoom_shape == "circle") {
        pos = fragmentShaderCode.lastIndexOf("}");
        fragmentShaderCode = fragmentShaderCode.insert_at(pos, "float r_x = v_texcoord.z;\n float r_y = v_texcoord.w;\n if (r_x * r_x + r_y * r_y > 1.0) gl_FragColor.rgba = vec4(0.0, 0.0, 0.0, 0.0);\n");
    }

    // WebGL2 accepts WebGL1 shaders so there is no need to update the code	
    if (webgl2) {
        var prefix = "#version 300 es\n";
        vertexShaderCode = prefix + vertexShaderCode;
        fragmentShaderCode = prefix + fragmentShaderCode;

        // attribute -> in
        vertexShaderCode = vertexShaderCode.replace(/attribute/g, "in");
        fragmentShaderCode = fragmentShaderCode.replace(/attribute/g, "in");

        // varying -> out
        vertexShaderCode = vertexShaderCode.replace(/varying/g, "out");

        // varying -> in
        fragmentShaderCode = fragmentShaderCode.replace(/varying/g, "in");

        // texture2D -> texture
        fragmentShaderCode = fragmentShaderCode.replace(/texture2D/g, "texture");

        // replace gl_FragColor with a custom variable, i.e. texColour
        fragmentShaderCode = fragmentShaderCode.replace(/gl_FragColor/g, "texColour");

        // add the definition of texColour
        var pos = fragmentShaderCode.indexOf("void main()");
        fragmentShaderCode = fragmentShaderCode.insert_at(pos, "out vec4 texColour;\n\n");
    }

    var program = createProgram(gl, vertexShaderCode, fragmentShaderCode);

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");

    // Create a position buffer
    var positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Put a unit quad in the buffer
    var positions = [
        -1, -1,
        -1, 1,
        1, -1,
        1, -1,
        -1, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // load a texture
    var tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    /*gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);*/
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    if (webgl2)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, container.width, container.height, 0, gl.RG, gl.FLOAT, container.texture);
    else
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, container.width, container.height, 0, gl.LUMINANCE_ALPHA, gl.FLOAT, container.texture);

    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
        console.error(status);
    }

    //WebGL how to convert from clip space to pixels		
    let px = viewport_zoom_settings.px;
    let py = viewport_zoom_settings.py;
    let viewport_size = viewport_zoom_settings.zoomed_size;
    py = height - py - viewport_size;
    gl.viewport(px, py, viewport_size, viewport_size);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // the image bounding box
    var locationOfBox = gl.getUniformLocation(program, "box");

    // image tone mapping
    var locationOfParams = gl.getUniformLocation(program, "params");

    // drawRegion (execute the GLSL program)
    // Tell WebGL to use our shader program pair
    gl.useProgram(program);

    // show the entire viewport texture
    let xmin = 0.0;
    let ymin = 0.0;
    let _width = 1.0;
    let _height = 1.0;

    gl.uniform4fv(locationOfBox, [xmin, ymin, _width, _height]);

    // logarithmic tone mapping        
    var params = [Math.log(image.pixel_range.min_pixel), Math.log(image.pixel_range.max_pixel), 0, 0];
    gl.uniform4fv(locationOfParams, params);

    // Setup the attributes to pull data from our buffers
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // execute the GLSL program
    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    invalidateViewport = true;

    // clean-up WebGL buffers etc.

    // position buffer	
    if (positionBuffer != undefined)
        gl.deleteBuffer(positionBuffer);

    // texture	
    if (tex != undefined)
        gl.deleteTexture(tex);

    // program
    if (program != undefined) {
        gl.deleteShader(program.vShader);
        gl.deleteShader(program.fShader);
        gl.deleteProgram(program);
    }
}

function x_axis_mouseenter(offset) {
    //send an init_video command via WebSockets
    streaming = true;
    video_stack = [];

    if (viewport_zoom_settings != null) {
        d3.select("#upper").style("stroke", "Gray");
        d3.select("#upperCross").attr("opacity", 0.75);
        d3.select("#upperBeam").attr("opacity", 0.75);
    }

    d3.select("#lower").attr("pointer-events", "none");

    //clear the VideoCanvas
    requestAnimationFrame(function () {
        var c = document.getElementById('VideoCanvas');
        var ctx = c.getContext("2d");

        var width = c.width;
        var height = c.height;

        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 1.0;
    });

    var elem = d3.select("#legend"); elem.attr("opacity", 0);

    // Clear the legend canvas
    var image = imageContainer;
    var gl = image.legend_gl;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //if (videoFrame == null)
    if (wasm_supported) {
        var data_band = get_mouse_energy(offset);

        sent_vid_id++;

        var rect = document.getElementById('mainDiv').getBoundingClientRect();
        var width = Math.round(rect.width - 20);
        var height = Math.round(rect.height - 20);


        var request = {
            type: "init_video",
            frame_start: Math.log(1000 * data_band) - 0.5 * fitsData.CDELT3,
            frame_end: Math.log(1000 * data_band) + 0.5 * fitsData.CDELT3,
            fps: vidFPS,
            seq_id: sent_vid_id,
            bitrate: Math.round(target_bitrate),
            width: width,
            height: height,
            inner_width: fitsData.width,
            inner_height: fitsData.height,
            offsetx: fitsData.OFFSETX,
            offsety: fitsData.OFFSETY,
            timestamp: performance.now()
        };

        if (wsConn != null && wsConn.readyState == 1)
            wsConn.send(JSON.stringify(request));
        video_stack = [];
    }

    hide_navigation_bar();

    d3.select("#scaling")
        .style('cursor', '')
        .attr("opacity", 0.0);

    d3.select("#yaxis")
        .style("fill", axisColour)
        .style("stroke", axisColour);

    d3.select("#energy").attr("opacity", 0.5);

    let fillColour = 'white';

    if (theme == 'bright')
        fillColour = 'black';

    d3.select("#xaxis")
        .style("fill", fillColour)
        .style("stroke", fillColour)
        .attr("opacity", 1.0);

    fillColour = 'white';
    let strokeColour = 'black';

    if (theme == 'bright') {
        fillColour = 'black';
        strokeColour = 'white';
    }

    var svg = d3.select("#BackSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));

    d3.select("#FrontSVG").append("text")
        .attr("id", "XText")
        .attr("x", width / 2)
        .attr("y", height / 2)
        //.attr("font-family", "Arial")		
        .attr("font-family", "Inconsolata")
        .attr("font-weight", "regular")
        .attr("font-size", "5em")
        .attr("text-anchor", "middle")
        .attr("fill", fillColour)
        .attr("stroke", strokeColour)
        .attr("pointer-events", "none")
        .attr("opacity", 1.0);

    shortcut.add("Left", x_axis_left);
    shortcut.add("Right", x_axis_right);

    setup_window_timeout();
}

function x_axis_mouseleave() {
    streaming = false;
    video_stack = [];

    //clear the VideoCanvas and reset the Zoom Viewport
    d3.select("#upper").style("stroke", "transparent");
    d3.select("#upperCross").attr("opacity", 0.0);
    d3.select("#upperBeam").attr("opacity", 0.0);
    d3.select("#lower").attr("pointer-events", "auto");

    requestAnimationFrame(function () {
        var c = document.getElementById('VideoCanvas');
        var ctx = c.getContext("2d");

        var width = c.width;
        var height = c.height;

        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 0.0;
    });

    var elem = d3.select("#legend");

    if (displayLegend)
        elem.attr("opacity", 1);
    else
        elem.attr("opacity", 0);

    d3.select("#fps").text("");

    // show the contour plot
    if (displayContours) {
        document.getElementById("ContourSVG").style.display = "block";

        if (!has_contours)
            update_contours();
    }

    //send an end_video command via WebSockets
    var request = {
        type: "end_video"
    };

    if (videoFrame != null) {
        videoFrame.img = null;
        videoFrame = null;

        if (wsConn != null && wsConn.readyState == 1)
            wsConn.send(JSON.stringify(request));

        video_stack = [];

        try {
            Module.hevc_destroy_frame(1);
        } catch (e) {
            //console.log(e);
        };
    }

    shortcut.remove("Left");
    shortcut.remove("Right");

    d3.select("#energy").attr("opacity", 0.0);
    d3.select("#ene_bar").attr("opacity", 0.0);

    d3.select("#xaxis")
        .style("fill", axisColour)
        .style("stroke", axisColour);

    d3.select("#XText").remove();

    line_pos = -1;
    var modal = document.getElementById('lineidentification');
    modal.style.display = "none";

    display_legend();

    setup_window_timeout();
}

function x_axis_mousemove(offset) {
    line_pos = -1;

    x_axis_move(offset);
}

function replay_video() {
    if (!video_playback)
        return;

    x_axis_mousemove(video_offset);

    //simulate a mouse advance
    var width = parseFloat(d3.select("#energy").attr("width"));
    var offsetx = parseFloat(d3.select("#energy").attr("x"));

    let fps = 30;
    let no_frames = fps * video_period;

    let dx = width / no_frames;
    let dt = 1000.0 / fps;

    var new_video_offset = video_offset[0] + dx;
    if (new_video_offset > offsetx + width)
        new_video_offset = offsetx;

    video_offset[0] = new_video_offset;
    //var dt = video_period / width;

    video_timeout = setTimeout(replay_video, dt);
}

function x_axis_move(offset) {
    clearTimeout(idleVideo);

    let strokeColour = 'white';

    if (theme == 'bright')
        strokeColour = 'black';

    d3.select("#ene_bar")
        .attr("x1", offset[0])
        .attr("x2", offset[0])
        .attr("opacity", 1.0)
        .style("stroke", strokeColour);

    var data_band = get_mouse_energy(offset);

    var text = "";

    if (data_band < 1) {
        text = (1000 * data_band).toPrecision(3) + " " + 'eV';
    } else if (data_band.toPrecision(3) < 1000) {
        text = data_band.toPrecision(3) + " " + 'keV';
    } else {
        text = (data_band / 1000).toPrecision(3) + " " + 'MeV';
    }

    // add the temperature
    var temperature = E2T(1000 * data_band);
    text += " (" + temperature.toPrecision(3) + " K)";

    d3.select("#XText").text(text);

    var modal = document.getElementById('lineidentification');

    var dx = parseFloat(d3.select("#energy").attr("width"));
    var offsetx = parseFloat(d3.select("#energy").attr("x"));

    if ((offset[0] - offsetx) >= 0.5 * dx) {
        modal.style.right = null;
        modal.style.left = "2.5%";
    }
    else {
        modal.style.right = "2.5%";
        modal.style.left = null;
    };

    let line_ene = data_band * 1000; // in eV

    if (!enedrag && wasm_supported) {
        //initially assume 10 frames per second for a video
        //later on use a Kalman Filter to predict the next frame position and request it		
        vidInterval = 1000 / vidFPS;

        now = performance.now();
        elapsed = performance.now() - then;

        if (elapsed > vidInterval) {
            then = now - (elapsed % vidInterval);

            //for each dataset request a video frame via WebSockets
            sent_vid_id++;

            if (realtime_video) {
                var fill;

                if (theme == "dark")
                    fill = 0;
                else
                    fill = 255;

                var request = {
                    type: "video",
                    frame_start: Math.log(1000 * data_band) - 0.5 * fitsData.CDELT3,
                    frame_end: Math.log(1000 * data_band) + 0.5 * fitsData.CDELT3,
                    key: false,
                    fill: fill,
                    fps: vidFPS,
                    seq_id: sent_vid_id,
                    bitrate: Math.round(target_bitrate),
                    timestamp: performance.now()
                };

                if (wsConn != null && wsConn.readyState == 1)
                    wsConn.send(JSON.stringify(request));
            };
        };

        if (videoFrame != null)
            idleVideo = setTimeout(videoTimeout, 250, data_band);
    };

    zoom_lines(line_ene);

    setup_window_timeout();
}

function videoTimeout(data_band) {
    if (!streaming)
        return;

    console.log("video inactive event");

    sent_vid_id++;

    var fill;

    if (theme == "dark")
        fill = 0;
    else
        fill = 255;

    var request = {
        type: "video",
        frame_start: Math.log(1000 * data_band) - 0.5 * fitsData.CDELT3,
        frame_end: Math.log(1000 * data_band) + 0.5 * fitsData.CDELT3,
        key: true,
        fill: fill,
        fps: vidFPS,
        seq_id: sent_vid_id,
        bitrate: Math.round(target_bitrate),
        timestamp: performance.now()
    };

    if (wsConn != null && wsConn.readyState == 1)
        wsConn.send(JSON.stringify(request));

    setup_window_timeout();
}

function get_mouse_energy(offset) {
    var ene = d3.select("#energy");
    var dx = parseFloat(ene.attr("width"));
    var offsetx = parseFloat(ene.attr("x"));

    var xR = d3.scaleLog()
        .range([offsetx, offsetx + dx])
        .domain([data_band_lo, data_band_hi]);

    var band = xR.invert(offset[0]);

    return band;
};

function zoom_lines(ene) {
    if (fitsData == null)
        return;

    if (fitsData.depth <= 1 || lines.length <= 0)
        return;

    var pos = -1;
    var minDist = 10 * ene;

    var modal = document.getElementById('lineidentification');
    var scroller = zenscroll.createScroller(modal);

    var m = document.getElementsByClassName("molecularp");

    for (var i = 0; i < m.length; i++) {
        m[i].style.color = "inherit";
        m[i].style.fontSize = "100%";
        m[i].style.fontWeight = "normal";

        var tmp = parseFloat(m[i].getAttribute("ene"));
        var dist = Math.abs(ene - tmp);

        if (dist < minDist) {
            minDist = dist;
            pos = i;
        };
    };

    if (line_pos >= 0)
        pos = line_pos;

    if (pos > -1) {
        m[pos].style.color = "yellow";
        m[pos].style.fontSize = "130%";
        m[pos].style.fontWeight = "bold";

        pos = Math.max(0, pos - 5);

        //m[pos].scrollIntoView({ block: "start", behavior: "smooth" }); // does not work correctly in Safari
        scroller.to(m[pos], 0); // 'center' or 'to'
    };

    if (m.length > 0 && displayLines)
        modal.style.display = "block";
    else
        modal.style.display = "none";
}

function get_line_energy() {
    var x = parseFloat(d3.select("#ene_bar").attr("x1"));

    var offset = [x, 0];

    var ene = get_mouse_energy(offset);

    return ene;
};

function x_axis_left() {
    var ene = round(get_line_energy(), 10);

    //console.log("current line energy = ", ene, "\tline_pos = ", line_pos) ;

    //find the next line to the left

    var m = document.getElementsByClassName("molecularp");

    if (m.length <= 0)
        return;

    if (line_pos < 0) {
        line_pos = 0;

        for (var i = 0; i < m.length; i++) {
            var tmp = round(parseFloat(m[i].getAttribute("ene")), 10);

            if (tmp >= ene)
                break;

            line_pos = i;
        };
    }
    else {
        if (line_pos - 1 >= 0)
            line_pos--;
    };

    var offset = [parseFloat(m[mol_pos].getAttribute("x")), 0];

    x_axis_move(offset);
};

function x_axis_right() {
    var ene = round(get_line_energy(), 10);

    //console.log("current line energy = ", ene, "\tline_pos = ", line_pos) ;

    //find the next line to the left

    var m = document.getElementsByClassName("molecularp");

    if (m.length <= 0)
        return;

    if (line_pos < 0) {
        line_pos = m.length - 1;

        for (var i = m.length - 1; i >= 0; i--) {
            var tmp = round(parseFloat(m[i].getAttribute("ene")), 10);

            if (tmp <= ene)
                break;

            line_pos = i;
        };
    }
    else {
        if (line_pos + 1 <= m.length - 1)
            line_pos++;
    };


    var offset = [parseFloat(m[mol_pos].getAttribute("x")), 0];

    x_axis_move(offset);
};

function process_video() {
    if (!streaming || videoFrame == null || videoFrame.img == null)
        return;

    //let image_bounding_dims = imageContainer[index - 1].image_bounding_dims;
    //{x1: 0, y1: 0, width: w, height: h};

    let imageCanvas = document.createElement('canvas');
    imageCanvas.style.visibility = "hidden";
    var context = imageCanvas.getContext('2d');

    let imageData = videoFrame.img;
    let image_bounding_dims = videoFrame.image_bounding_dims;

    imageCanvas.width = imageData.width;
    imageCanvas.height = imageData.height;
    //console.log(imageCanvas.width, imageCanvas.height);

    context.putImageData(imageData, 0, 0);

    //next display the video frame
    //place the image onto the main canvas
    var c = document.getElementById('VideoCanvas');
    var width = c.width;
    var height = c.height;
    var ctx = c.getContext("2d");

    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    var scale = get_image_scale(width, height, image_bounding_dims.width, image_bounding_dims.height);

    var img_width = scale * image_bounding_dims.width;
    var img_height = scale * image_bounding_dims.height;

    ctx.drawImage(imageCanvas, image_bounding_dims.x1, image_bounding_dims.y1, image_bounding_dims.width, image_bounding_dims.height, (width - img_width) / 2, (height - img_height) / 2, img_width, img_height);

    if (viewport_zoom_settings != null) {
        let px = emStrokeWidth;
        let py = emStrokeWidth;

        let viewport = viewport_zoom_settings;
        let y = imageCanvas.height - viewport.y - (2 * viewport.clipSize + 1);

        //and a zoomed viewport
        if (zoom_shape == "square") {
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(px, py, viewport_zoom_settings.zoomed_size, viewport_zoom_settings.zoomed_size);

            ctx.drawImage(imageCanvas, (viewport_zoom_settings.x - viewport_zoom_settings.clipSize) / videoFrame[index - 1].scaleX, (y + viewport_zoom_settings.clipSize) / videoFrame[index - 1].scaleY, (2 * viewport_zoom_settings.clipSize + 1) / videoFrame[index - 1].scaleX, (2 * viewport_zoom_settings.clipSize + 1) / videoFrame[index - 1].scaleY, px, py, viewport_zoom_settings.zoomed_size, viewport_zoom_settings.zoomed_size);
        }

        if (zoom_shape == "circle") {
            ctx.save();
            ctx.beginPath();
            ctx.arc(px + viewport_zoom_settings.zoomed_size / 2, py + viewport_zoom_settings.zoomed_size / 2, viewport_zoom_settings.zoomed_size / 2, 0, 2 * Math.PI, true);

            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fill();

            ctx.closePath();
            ctx.clip();
            ctx.drawImage(imageCanvas, (viewport_zoom_settings.x - viewport_zoom_settings.clipSize) / videoFrame[index - 1].scaleX, (y + viewport_zoom_settings.clipSize) / videoFrame[index - 1].scaleY, (2 * viewport_zoom_settings.clipSize + 1) / videoFrame[index - 1].scaleX, (2 * viewport_zoom_settings.clipSize + 1) / videoFrame[index - 1].scaleY, px, py, viewport_zoom_settings.zoomed_size, viewport_zoom_settings.zoomed_size);
            ctx.restore();
        }
    }
}

function index_lines() {
    if (lines.length <= 0)
        return;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // strip any HTML from the name and species (like <sup>, etc.)
        //let name = stripHTML(molecule.name.toLowerCase()).trim();
        //let species = stripHTML(molecule.species.toLowerCase()).trim();

        let ion = line.ion;
        let upper = line.upper;
        let lower = line.lower;
        let emissivity = line.emissivity;

        line.text = ion + " " + upper + " " + lower + " " + emissivity + "ph cm<sup>3</sup>s<sup>-1</sup>";
    }
}

function stripHTML(html) {
    try {
        return $("<p>" + html + "</p>").text(); // jQuery does the heavy lifting
    } catch (_) {
        return html;
    }
}

function screen_line(line, search) {
    if (search != '') {
        if (line.text.indexOf(search) == -1)
            return false;
    }

    var intensity = parseFloat(line.intensity);

    if (intensity < displayIntensity)
        return false;

    return true;
}

function display_lines() {
    if (lines.length <= 0)
        return;

    if (data_band_lo <= 0 || data_band_hi <= 0)
        return;

    // get the search term (if any)
    var searchTerm = '';
    try {
        searchTerm = stripHTML(document.getElementById('searchInput').value.toLowerCase()).trim();
    } catch (_) { }

    var svg = d3.select("#BackSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));
    var range = get_axes_range(width, height);

    try {
        d3.select("#lines").remove();
    }
    catch (e) {
    }

    var group = svg.append("g")
        .attr("id", "lines")
        .attr("opacity", 0.0);

    // filter the molecules
    var line_list = [];
    for (var i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (!screen_line(line, searchTerm))
            continue;

        let energy = line.energy;

        if ((energy >= data_band_lo) && (energy <= data_band_hi))
            line_list.push(line);
    };

    var num = line_list.length;

    if (num > displayLimit) {
        console.log("Too many spectral lines to display:", num, ", applying a hard limit of", displayLimit, ". Please refine your search.");

        // randomly select a subset of the molecules
        line_list = line_list.sort(() => Math.random() - Math.random()).slice(0, displayLimit);
        num = line_list.length;
    }

    var fontStyle = Math.round(0.67 * emFontSize) + "px";// Helvetica";
    var strokeStyle = "#FFCC00";

    if (theme == 'bright')
        strokeStyle = 'black';

    /*if(colourmap == "rainbow" || colourmap == "hot")
    strokeStyle = "white";*/

    //and adjust (reduce) the font size if there are too many molecules to display
    if (num > 20)
        fontStyle = Math.max(8, Math.round(0.67 * emFontSize * .25)) + "px";// Helvetica";

    console.log("valid spectral lines:", num);

    var dx = range.xMax - range.xMin;
    var offsety = height - 1;

    var div_molecules = d3.select("#molecularlist");
    div_molecules.selectAll("*").remove();

    for (var i = 0; i < mol_list.length; i++) {
        let molecule = mol_list[i];
        let f = molecule.frequency * 1e9;

        var x = range.xMin + dx * (f - band_lo) / (band_hi - band_lo);

        var moleculeG = group.append("g")
            .attr("id", "molecule_group")
            .attr("x", x);

        moleculeG.append("line")
            .attr("id", "molecule_line")
            .attr("x1", x)
            .attr("y1", offsety)
            .attr("x2", x)
            .attr("y2", offsety - 1.25 * emFontSize)
            .style("stroke", strokeStyle)
            .style("stroke-width", 1)
            .attr("opacity", 1.0);

        var text;

        if (molecule.species.indexOf("Unidentified") > -1)
            text = "";
        else
            text = molecule.species;

        moleculeG.append("foreignObject")
            .attr("x", (x - 0.5 * emFontSize))
            .attr("y", (offsety - 2.0 * emFontSize))
            .attr("width", (20 * emFontSize))
            .attr("height", (2 * emFontSize))
            .attr("transform", 'rotate(-45 ' + (x - 0.5 * emFontSize) + ',' + (offsety - 2.0 * emFontSize) + ')')
            .attr("opacity", 1.0)
            .append("xhtml:div")
            .style("font-size", fontStyle)
            .style("font-family", "Inconsolata")
            .style("color", strokeStyle)
            .style("display", "inline-block")
            //.append("p")
            .html(text.trim());

        //console.log("spectral line @ x = ",x, (f/1e9).toPrecision(7), text.trim()) ;

        try {
            var htmlStr = molecule.name.trim() + ' ' + text.trim() + ' ' + molecule.qn.trim() + ' <span style="font-size: 80%">(' + molecule.linelist + ')</span>';
        } catch (e) {
            console.log(molecule);
            console.error(e);
        }

        if (htmlStr.indexOf("Unidentified") > -1)
            htmlStr = molecule.name;

        div_molecules.append("p")
            .attr("class", "molecularp")
            .attr("freq", f)
            .attr("x", x)
            .html((f / 1e9).toPrecision(7) + ' GHz' + ' ' + htmlStr);
    }

    group.moveToBack();

    var elem = d3.select("#lines");
    if (displayLines)
        elem.attr("opacity", 1);
    else
        elem.attr("opacity", 0);
}