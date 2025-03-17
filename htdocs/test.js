function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
};

function view_mission(satellite) {
    var dataset = document.getElementById(satellite + "_dataset").value.trim();
    var mission = document.getElementById(satellite + "_mission").value.trim();

    if (dataset != "") {
        var url = "/xwebql/events.html?" + "mission=" + encodeURIComponent(mission) + "&dataset=" + encodeURIComponent(dataset);

        window.location.href = url;
    }
    else
        alert("no dataset found !");
}

function view_url(index) {
    var events_url = document.getElementById("url" + index).value.trim();

    if (events_url != "") {
        var url = "/xwebql/events.html?" + "url=" + encodeURIComponent(events_url);

        window.location.href = url;
    }
    else
        alert("no X-ray events URL found !");
}