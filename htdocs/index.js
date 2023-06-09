function goto_url(url) {
    window.location.href = url;
}

function localStorage_read_lastdir(key) {
    if (localStorage.getItem(key) === null)
        return "";
    else
        return localStorage.getItem(key);
}

function show_directory_contents(response) {
    $("#filesystem").empty();

    // replace any Windows backslashes
    let loc = response.location.replaceAll('\\', '/');
    dirs = loc.split('/');

    $("#filesystem").append($("<ul></ul>")
        .attr("id", "breadcrumb")
        //.css("position", "fixed")
        .attr("class", "breadcrumb"));

    if (theme == 'bright')
        $("#breadcrumb").css('background-color', 'darkgrey');

    /*$(window).scroll(function(){
    $("#breadcrumb").css({"margin-top": ($(window).scrollTop()) + "px", "margin-left":($(window).scrollLeft()) + "px"});
    });*/

    //navigation
    var dir = "";
    for (let i = 0; i < dirs.length; i++) {
        if (dirs[i] != "")
            dir += '/' + dirs[i];

        var cmd = "fetch_directory(\"" + dir + "\")";

        $("#breadcrumb").append($("<li></li>")
            .attr("class", "breadcrumb-item")
            .append($("<a></a>")
                .attr("onclick", cmd)
                .css("cursor", "pointer")
                .text(dirs[i])));
    }

    $('#breadcrumb').append($("<a></a>")
        .attr("class", "btn btn-link")
        .attr("onclick", "fetch_directory(\"\")")
        .css("float", "right")
        .html("<span class=\"glyphicon glyphicon-home\"></span><span style='font-size: 1.0em; padding: 0.5em'>HOME</span>"));

    $("#filesystem").append($("<table></table>")
        .attr("id", "files")
        .attr("class", "table table-hover")
        .html("<thead><tr style=\"color:inherit\"><th>name</th><th>size <a href=\"#unit\">[1]</a></th><th>last modified</th></tr></thead>"));
    //class=\"danger\" style=\"color:black\"

    $("#filesystem").append($("<p>[1] Base 10 (decimal)</p>")
        .attr("id", "unit"));

    //contents
    filelist = response.contents;

    $("#files").append($("<tbody></tbody>")
        .attr("id", "tbody"));

    //add go up one step
    if ((loc != "/") && (loc != "C:") && (loc != "C:\\") && (loc != "C:/")) {
        dir = "";
        for (let i = 0; i < dirs.length - 1; i++) {
            if (dirs[i] != "")
                dir += '/' + dirs[i];
        }

        if (dir == "")
            dir = "/";

        var cmd = "fetch_directory(\"" + dir + "\")";

        $("#tbody").append($("<tr></tr>")
            .css("cursor", "pointer")
            .attr("onclick", cmd)
            .html("<td><span class=\"glyphicon glyphicon-level-up\"></span>&nbsp;&nbsp;" + ".." + "</td><td></td><td></td>"));
    }

    //list directories first
    for (let i = 0; i < filelist.length; i++) {
        if (filelist[i].type == "dir") {
            var cmd;

            if (loc == "/")
                cmd = "fetch_directory('" + loc + filelist[i].name.replace(/'/g, "\\'") + "')";
            else
                cmd = "fetch_directory('" + loc + '/' + filelist[i].name.replace(/'/g, "\\'") + "')";

            //class=\"text-right\"
            $("#tbody").append($("<tr></tr>")
                .css("cursor", "pointer")
                .attr("onclick", cmd)
                .html("<td><span class=\"glyphicon glyphicon-folder-open\"></span>&nbsp;&nbsp;" + filelist[i].name + "</td><td></td><td>" + filelist[i].last_modified + "</td>"));
        }
    }

    //then files
    for (let i = 0; i < filelist.length; i++) {
        if (filelist[i].type == "file") {
            var path = loc;
            var filename = filelist[i].name;

            var name = filename.substr(0, filename.lastIndexOf('.'));
            var ext = filename.substr(filename.lastIndexOf('.') + 1);
            var url = "/xwebql/events.html?dir=" + encodeURIComponent(path) + "&ext=" + encodeURIComponent(ext) + "&filename=" + encodeURIComponent(name);
            var tmp = "goto_url('" + url.replace(/'/g, "\\'") + "')";

            //style=\"color: inherit\"
            $("#tbody").append($("<tr></tr>")
                .css("cursor", "pointer")
                .attr("onclick", tmp)
                .html("<td><p href=\"" + url + "\"><span class=\"glyphicon glyphicon-open-file\"></span>&nbsp;&nbsp;" + filelist[i].name + "</p></td><td>" + numeral(filelist[i].size).format('0. bd') + "</td><td>" + filelist[i].last_modified + "</td>"));
        }
    }

    $("#filesystem").append($("<br></br>"));

    $("body").css("cursor", "default");
}

function fetch_directory(dir) {
    $("body").css("cursor", "wait");

    var xmlhttp = new XMLHttpRequest();

    var url = 'get_directory';

    if (dir != "")
        url += '?dir=' + encodeURIComponent(dir);

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            //console.log(xmlhttp.responseText) ;

            let response = JSON.parse(xmlhttp.responseText);

            show_directory_contents(response);

            localStorage.setItem("lastdir", dir);
        }
    }

    xmlhttp.open("GET", url, true);
    xmlhttp.timeout = 0;
    xmlhttp.send();
}

//https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function main() {
    filelist = null;

    if (localStorage.getItem("ui_theme") === null)
        theme = "dark";//default theme, needs to be aligned with the main FITSWebQL;  "dark" or "bright"
    else
        theme = localStorage.getItem("ui_theme");

    if (theme == 'bright') {
        $("body").css('background-color', 'white');
        $("body").css('color', 'black');

        try {
            for (let i = 0; i < document.styleSheets.length; i++)
                if (document.styleSheets[i].href.indexOf('local.css') > 0) {
                    let stylesheet = document.styleSheets[i];
                    console.log(document.styleSheets[i]);

                    if (stylesheet.cssRules) {
                        for (let j = 0; j < stylesheet.cssRules.length; j++)
                            if (stylesheet.cssRules[j].selectorText === '.modal-content')
                                stylesheet.deleteRule(j);
                    }

                    console.log(document.styleSheets[i]);
                }
        }
        catch (e) {
            console.log(e);
        }
    }

    if (theme == 'dark') {
        document.getElementById("logo").style.filter = "invert(100%) grayscale(100%)";
    } else {
        document.getElementById("isas").style.filter = "invert(100%) grayscale(100%)";
    }

    //fetch the home directory first
    fetch_directory(localStorage_read_lastdir("lastdir"));
}
