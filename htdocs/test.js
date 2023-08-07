function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
};

function view_mission(satellite) {
    var dataset = document.getElementById(satellite + "_dataset").value.trim();
    var mission = document.getElementById(satellite + "_mission").value.trim();

    if (dataset != "") {
        var url = null;

        url = "/xwebql/events.html?" + "mission=" + encodeURIComponent(mission) + "&dataset=" + encodeURIComponent(dataset);

        window.location.href = url;
    }
    else
        alert("no dataset found !");
}