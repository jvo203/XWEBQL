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

}