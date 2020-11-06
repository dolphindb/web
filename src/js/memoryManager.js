var currTab = null;
var currNodeSite = null;
var tabToIndex = {"pubConns": 0, "subConns": 1, "pubTables": 2, "subWorkers": 3};

$(document).ready(function () {
    nodeUrl = GetFullUrl(window.location.host);
    var nodeApi = new DatanodeServer(nodeUrl);
    var clusterPerf = nodeApi.runSync("getClusterPerf()");
    var nodeSites = clusterPerf.object[0].value[2].value;

    var nodeHosts = [];
    var doneFirst = false;
    for (var nodeSite of nodeSites) {
        var nodeSiteArr = nodeSite.split(":");
        if (nodeSiteArr[2] !== "agent") {
            var currHost = nodeSiteArr[0] + ":" + nodeSiteArr[1];
            nodeHosts.push(currHost);
            if (!doneFirst) {
                $("#nodes").append("<button type='button' value=" + nodeSite + " class='btn btn-sm btn-info' title=" + currHost + ">" + nodeSiteArr[2] + "</button>");
                doneFirst = true;
            } else {
                $("#nodes").append("<button type='button' value=" + nodeSite + " class='btn btn-sm btn-default' title=" + currHost + ">" + nodeSiteArr[2] + "</button>");
            }
        }
    }

    currTab = $("#memoryTabs li:first")[0].id;

    currNodeSite = $("#nodes button:first").val();
    displayTable(currNodeSite);

    var controller = new ControllerServer(nodeUrl);
    var currentUser = controller.getCurrentUser(); 
    $(".panelbody .row").hide();
    if (currentUser.userId == "guest") {
        $("#btnLogin").show();
        $("#btnLogout").hide();
        $("#btnAdmin").hide();
    } else {
        $("#btnLogin").hide();
        $("#btnLogout").show();
        $("#lblLogin").text("[" + currentUser.userId + "]");
        if (currentUser.isAdmin == true) {
            $("#btnAdmin").show();
        } else {
            $("#btnAdmin").hide();
        }
    }

    $("#btnLogout").bind("click", function () {
        var user = JSON.parse(localStorage.getItem("DolphinDB_CurrentUsername"));
        var controller = new ControllerServer(wa_url);
        controller.logout(user.userId, function (re) {
            if (re.resultCode === "0") {
                localStorage.setItem("DolphinDB_CurrentUsername", "");
                localStorage.setItem(session_storage_id, "");
                window.location.reload();
            } else {
                alert(re.msg);
            }
        })
    });
});

var fillTable = function(res, msg) {
    $("#memoryTable").append("<p style='text-align: center; font-weight: bold; font-size: 16px; font-style: italic'>" + msg + "</p>");
    $("#memoryTable").append("<table class='table table-hover GridManager - ready' style='margin-bottom: 55px'></table>");
    $("#memoryTable table:last").append("<thead><tr></tr></thead>");
    for (var i = 0; i < res.length; i++) {
        $("#memoryTable table:last tr").append("<th>" + res[i].name + "</th>");
    }
    $("#memoryTable table:last").append("<tbody></tbody>");
    for (var i = 0; i < res[0].size; i++) {
        $("#memoryTable table:last tbody").append("<tr></tr>");
        for (var j = 0; j < res.length; j++) {
            $("#memoryTable table:last tr:last").append("<td>" + res[j].value[i] + "</td>");
        }
    }
};

var displayTable = function (currNodeSite) {
    var currNodeSiteArr = currNodeSite.split(":");
    var currNodeUrl = GetFullUrl(currNodeSiteArr[0] + ":" + currNodeSiteArr[1]);
    var currNodeApi = new DatanodeServer(currNodeUrl);
    currNodeApi.runSync("login('admin', '123456')");
    // sessionObjs
    if (currTab === "sessionObjs") {
        var sessionRe = currNodeApi.runSync("getSessionMemoryStat()");
        $("#memoryTable p, #memoryTable table").remove();
        if (sessionRe.resultCode === "1") {
            alert(sessionRe.msg);
        } else {
            fillTable(sessionRe.object[0].value, "memory usage of all sessions on " + currNodeSiteArr[2]);
        }
        var objsRe = currNodeApi.runSync("objs(true)");
        if (objsRe.resultCode === "1") {
            alert(objsRe.msg);
        } else {
            fillTable(objsRe.object[0].value, "memory usage of all variables on " + currNodeSiteArr[2] + " (including variables shared by other sessions)");
        }
    } else {
        // streaming
        var streamingRe = currNodeApi.runSync("getStreamingStat()");
        $("#memoryTable p, #memoryTable table").remove();
        if (streamingRe.resultCode === "1") {
            alert(streamingRe.msg);
        } else {
            var res = streamingRe.object[0].value;
            var tables = res[1].value; 
            var i = tabToIndex[currTab];
            fillTable(tables[i].value, res[0].value[i] + ": " + currNodeSiteArr[2]);
        }
    }
};

// switch node
$("#nodes").on("click", "button", function (e) {
    currNodeSite = $(this).val();
    displayTable(currNodeSite);
    $("#nodes button").removeClass("btn-info");
    $("#nodes button").removeClass("btn-default");
    $("#nodes button").addClass("btn-default");
    $(this).addClass("btn-info");
});

// switch table tab
$("#sessionObjs a, #pubConns a, #subConns a, #pubTables a, #subWorkers a").bind("click", function (e) {
    currTab = this.parentElement.id;
    displayTable(currNodeSite);
    $("#memoryTabs li").removeClass("active");
    $("#" + currTab).addClass("active");
});

