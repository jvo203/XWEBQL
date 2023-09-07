function init() {
    d3.select("body").append("div")
        .attr("id", "mainDiv")
        .attr("class", "main");

    var rect = document.getElementById('mainDiv').getBoundingClientRect();
    var width = Math.round(rect.width);
    var height = Math.round(rect.height);
    document.getElementById('mainDiv').setAttribute("style", "width:" + width.toString() + "px");
    document.getElementById('mainDiv').setAttribute("style", "height:" + height.toString() + "px");

    var width = Math.round(rect.width - 20);
    var height = Math.round(rect.height - 20);

    d3.select("#mainDiv").append("svg")
        .attr("id", "FrontSVG")
        .attr("width", width)
        .attr("height", height)
        .attr("pointer-events", "auto")
        .on("mouseenter", function () {
            console.log("FrontSVG::mouseenter");
            /*hide_navigation_bar();*/
        })
        .on("mouseleave", function () {
            console.log("FrontSVG::mouseleave");
        })
        .attr('style', 'position: fixed; left: 10px; top: 10px; z-index: 57; cursor: default');

    display_menu();

    var svg = d3.select("#FrontSVG");
    var width = parseFloat(svg.attr("width"));
    var height = parseFloat(svg.attr("height"));
    var range = get_axes_range(width, height);

    //set the default font-size    
    emFontSize = Math.max(12, 0.011 * (0.2 * rect.width + 0.8 * rect.height));
    emStrokeWidth = Math.max(1, 0.1 * emFontSize);
    document.body.style.fontSize = emFontSize + "px";
    console.log("emFontSize : ", emFontSize.toFixed(2), "emStrokeWidth : ", emStrokeWidth.toFixed(2));

    svg.append("text")
        .attr("x", (width - 2 * emFontSize))
        .attr("y", 0.70 * range.yMin)
        .attr("font-family", "Helvetica")
        .attr("font-weight", "normal")
        .attr("font-size", 0.75 * range.yMin)
        .attr("stroke", "none")
        .attr("opacity", 0.5)//0.25        
        .text("☰");

    // add a big "CLICK ME" circle in the middle of the screen
    svg.append("circle")
        .attr("id", "click_me_circle")
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .attr("r", 0.40 * Math.min(width, height))
        .attr("fill", "red")
        .attr("stroke", "transparent")
        .attr("stroke-width", 0.5 * Math.min(width, height))
        .attr("opacity", 0.1)
        .on("mouseenter", function () {
            d3.select(this).attr("opacity", 0.5);
        })
        .on("mouseleave", function () {
            d3.select(this).attr("opacity", 0.1);
        })
        .on("click", function () {
            console.log("click_me_circle::click");
            d3.select(this).attr("opacity", 0.1);
            document.getElementById('menu').style.display = "block";
        });

    let strokeColour = 'white';

    if (theme == 'bright')
        strokeColour = 'black';

    //add a menu activation area
    svg.append("rect")
        .attr("id", "menu_activation_area")
        .attr("x", 0)
        .attr("y", emStrokeWidth - 1)
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


function hide_navigation_bar() {
    console.log("hide_navigation_bar()");
    try {
        document.getElementById('menu').style.display = "none";
        d3.select("#menu_activation_area").attr("opacity", 0.1);//was 0.7
    } catch (e) { }
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

function display_menu() {
    var div = d3.select("body").append("div")
        .attr("id", "menu")
        .attr("class", "menu")
        .on("mouseenter", function () {
            console.log("menu::mouseenter");
        })
        .on("mouseleave", function () {
            console.log("menu::mouseleave");
        });

    var nav = div.append("nav").attr("class", "navbar navbar-fixed-top fixed-top navbar-expand-sm navbar-dark")
        .attr("id", "navbar");

    var main = nav.append("div")
        .attr("class", "container-fluid");

    var header = main.append("div")
        .attr("class", "navbar-header");

    header.append("a")
        .attr("href", "https://www.nao.ac.jp/")
        .append("img")
        .attr("id", "naoj")
        .attr("class", "navbar-left")
        .attr("src", "https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/logo_naoj_nothing_s.png")
        .attr("alt", "NAOJ")
        .attr("max-height", "100%")
        .attr("height", 50);

    var mainUL = main.append("ul")
        .attr("class", "nav navbar-nav");

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

    d3.select('#video_fps_control_li').style("display", "block");

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

    d3.select('#video_fps_control_li').style("display", "block");

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
            .attr("onmousedown", "javascript:console.log('mousedown');")
            .attr("onfocus", "javascript:console.log('focus');")
            .attr("onfocusin", "javascript:console.log('focusin');")
            .attr("onfocusout", "javascript:console.log('focusout');")
            .attr("onmouseup", "javascript:console.log('mouseup');")
            .attr("onclick", "javascript:console.log('click');")
            .html("<option>dark</option><option>bright</option>");

        document.getElementById('ui_theme').value = theme;
    }

    //colourmap    
    var colourmap_string = "<option>amber</option><option>red</option><option>green</option><option>blue</option><option>greyscale</option><option>negative</option><option disabled>---</option><option>cubehelix</option><option>haxby</option><option>hot</option><option>parula</option><option>rainbow</option><option disabled>---</option><option>inferno</option><option>magma</option><option>plasma</option><option>viridis</option>";

    tmpA = prefDropdown.append("li")
        //.style("background-color", "#FFF")	
        .append("a")
        .style("class", "form-group")
        .attr("class", "form-horizontal");

    tmpA.append("label")
        .attr("for", "colourmap")
        .attr("class", "control-label")
        .html("colourmap:&nbsp; ");

    tmpA.append("select")
        .attr("id", "colourmap")
        .attr("onchange", "javascript:change_colourmap();")
        .html(colourmap_string);

    document.getElementById('colourmap').value = colourmap;

    //coords_fmt    
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


function change_ui_theme() {
    theme = document.getElementById('ui_theme').value;
    localStorage.setItem("ui_theme", theme);

    if (theme == 'bright')
        colourmap = "rainbow";
    else
        colourmap = "green";

    localStorage.setItem("xcolourmap", colourmap);

    location.reload();
}

function change_colourmap() {
    colourmap = document.getElementById('colourmap').value;
    localStorage.setItem("xcolourmap", colourmap);

    location.reload();
}