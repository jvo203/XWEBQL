function get_js_version() {
    return "JS2023-06-26.0";
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

        setup_help();

        setup_FITS_header_page();

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
            })
            .on("mouseleave", function () {
                d3.select("#videoControlG").style("opacity", 0.25);

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

    var image = imageContainer[va_count - 1];
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
        .text("FITSWEBQLSE HOW-TO");

    var bodyDiv = contentDiv.append("div")
        .attr("id", "modal-body")
        .attr("class", "modal-body");

    bodyDiv.append("h3")
        .attr("id", "h3")
        .text("P-V Diagram");

    bodyDiv.append("p")
        .html("An interactive <b>Position-Velocity Diagram</b> can be displayed for the current image. First left-click on the image to select a starting position.");

    bodyDiv.append("p")
        .html("Then move a mouse around and left-click again to complete the <i>P-V line</i> selection. The <i>P-V diagram</i> will display shortly.");

    bodyDiv.append("p")
        .html("In the <b>P-V Diagram view</b> ①, ② and the middle point can be dragged freely to change the <i>P-V line</i>. The <i>P-V diagram</i> will be updated automatically.");

    var pv = bodyDiv.append("video")
        .attr("width", "100%")
        .attr("controls", "")
        .attr("preload", "metadata");

    pv.append("source")
        .attr("src", "https://cdn.jsdelivr.net/gh/jvo203/FITSWEBQLSE/htdocs/fitswebql/pv_diagram.mp4");

    bodyDiv.append("hr");

    bodyDiv.append("h3")
        .attr("id", "csv_h3")
        .text("Spectrum Export");

    bodyDiv.append("p")
        .html("The current image/viewport spectrum can be exported to a <b>CSV</b> file");

    var csv = bodyDiv.append("video")
        .attr("width", "100%")
        .attr("controls", "")
        .attr("preload", "metadata");

    csv.append("source")
        .attr("src", "https://cdn.jsdelivr.net/gh/jvo203/FITSWEBQLSE/htdocs/fitswebql/spectrum_export.mp4");

    csv.append("p")
        .html("Your browser does not support the video tag.");

    bodyDiv.append("hr");

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

    var iR = d3.scaleLog()
        .range([range.xMin, range.xMax])
        .domain([data_band_lo, data_band_hi]);

    var xR = d3.scaleLinear()
        .range([range.xMin, range.xMax])
        .domain([data_band_lo, data_band_hi]);

    var yR = d3.scaleLog()
        .range([range.yMax, range.yMin])
        .domain([dmin, dmax + get_spectrum_margin() * interval]);

    var iAxis = d3.axisTop(iR)
        .tickSizeOuter([3])
        .ticks(7);

    var xAxis = d3.axisTop(xR)
        .tickSizeOuter([3])
        .ticks(7);
    /*.tickFormat(function(d) {
      //limit the number of decimal digits shown
      return parseFloat(d.toPrecision(7)) ;
    });*/
    /*.tickFormat(function(d) {var n ;
           if(fitsData.CDELT3 > 0)
             n = d * (fitsData.depth-1) + 1 ;
           else
             n = (1-d) * (fitsData.depth-1) + 1 ;
           
           var freq = fitsData.CRVAL3+fitsData.CDELT3*(n-fitsData.CRPIX3) ;
           freq /= 1e9 ;//convert from Hz to GHz
           return freq.toPrecision(6) ;
    });*/

    var yAxis = d3.axisRight(yR)
        .tickSizeOuter([3])
        .tickFormat(function (d) {
            var number;

            if (Math.abs(d) <= 0.001 || Math.abs(d) >= 1000)
                number = d.toExponential();
            else
                number = d;

            if (Math.abs(d) == 0)
                number = d;

            return number;
        });

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
            .attr("id", "freq_bar")
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