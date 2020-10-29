var nodeApi = null;

var allDFSTables = null;
var allDFSDatabases = null;
var allFunctionViews = null;

var operationType = null;

var selectedHeader = null;
var selectedGroup = null;
var selectedUser = null;

var selectedAccessType = null;
var selectedTable = null;
var selectedDatabase = null;
var selectedFunc = null;

$(document).ready(function () {
    nodeUrl = GetFullUrl(window.location.host);
    nodeApi = new DatanodeServer(nodeUrl);
    var controller = new ControllerServer(nodeUrl);
    var currentUser = controller.getCurrentUser();
    allDFSTables = nodeApi.getClusterDFSTables().object[0].value;
    allDFSDatabases = nodeApi.getClusterDFSDatabases().object[0].value;
    allFunctionViews = nodeApi.getFunctionViews().object[0].value[0].value;
    $("#btnCheck, #btnGrant, #btnDeny, #btnRevoke").hide();
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
});

var displayAll = function(re, header) {
    if (re.resultCode === "1") {
        alert(re.msg);
    } else {
        $("#displayingTable").empty();
        var res = re.object[0].value;
        $("#displayingTable").append("<thead>\
                                                                            <tr>\
                                                                                <th scope='col'></th>\
                                                                                <th scope='col'>" + header + "</th>\
                                                                            </tr>\
                                                                        </thead>");
        if (res.length !== 0) {
            $("#displayingTable").append("<tbody>");
            for (var i = 0; i < res.length; i++) {
                var item = res[i];
                var val = header + ":" + item;
                $("#displayingTable tbody").append("<tr>\
                                                                                                    <td><input name='item' type='radio' class='item' value=" + val + "></td>\
                                                                                                    <td>" + item + "</td>\
                                                                                                </tr>");
            }
            $("#displayingTable").append("</tbody>");
        }
    }
};

$("#displayingTable").bind("change", ".item", function (e) {
    $("#btnCheck, #btnGrant, #btnDeny, #btnRevoke").show();
});

$("#btnGroupList").bind("click", function (e) {
    var re = nodeApi.getGroupList();
    displayAll(re, "groupId");
});

$("#btnUserList").bind("click", function (e) {
    var re = nodeApi.getUserList();
    displayAll(re, "userId");
});

$("#btnCheck").bind("click", function (e) {
    var checkDialog = $("#checkDialog");
    var re;
    if (selectedHeader === "groupId") {
        re = nodeApi.getGroupAccess(selectedGroup);
    } else if (selectedHeader === "userId") {
        re = nodeApi.getUserAccess(selectedUser);
    }
    var res = re.object[0].value;
    for (var i = 0; i < res.length; i++) {
        $("#checkTable").append("<tr>\
                                                                    <td>" + res[i].name + "</td>\
                                                                    <td>" + res[i].value[0] + "</td>\
                                                                </tr>");
    }
    checkDialog[0].showModal();
});

$("#btnGrant, #btnDeny, #btnRevoke").bind("click", function (e) {
    var accessDialog = $("#accessDialog");
    // clear
    $("#types select").val("");
    $("#tables").empty();
    $("#databases").empty();
    $("#functionviews").empty();
    operationType = $(this).val();
    // add title
    document.getElementById('accessLabel').innerHTML = operationType.charAt(0).toUpperCase() + operationType.slice(1) + " access:";
    accessDialog[0].showModal();
});

$("#types select").bind("change", function(e) {
    selectedAccessType = $("#types select").val();
    // clear first
    $("#tables").empty();
    $("#databases").empty();
    $("#functionviews").empty();
    // tables
    if (selectedAccessType === "TABLE_READ" || selectedAccessType === "TABLE_WRITE") {
        $("#tables").append("<label>DFS Table:<select><option></option>");
        for (var i = 0; i < allDFSTables.length; i++) {
            $("#tables select").append("<option>" + allDFSTables[i] + "</option>");
        }
        $("#tables").append("</select></label>");
    // databases
    } else if (selectedAccessType === "DBOBJ_CREATE" || selectedAccessType === "DBOBJ_DELETE") {
        $("#databases").append("<label>DFS Databases:<select><option></option>");
        for (var i = 0; i < allDFSDatabases.length; i++) {
            $("#databases select").append("<option>" + allDFSDatabases[i] + "</option>");
        }
        $("#databases").append("</select></label>");
    // function views
    } else if (selectedAccessType === "VIEW_EXEC") {
        $("#functionviews").append("<label>Functions:<select><option></option>");
        for (var i = 0; i < allFunctionViews.length; i++) {
            $("#functionviews select").append("<option>" + allFunctionViews[i] + "</option>");
        }
        $("#functionviews").append("</select></label>");
    }
});

$("#tables").bind("change", "select", function(e) {
    selectedTable = $("#tables select").val();
});

$("#databases").bind("change", "select", function(e) {
    selectedDatabase = $("#databases select").val();
});

$("#functionviews").bind("change", "select", function(e) {
    selectedFunc = $("#functionviews select").val();
});

$("#confirmAccessBtn").bind("click", function(e) {
    if (selectedAccessType === null || selectedAccessType === "") {
        alert("Please select the access type you want to " + operationType);
        return;
    }
    var id;
    if (selectedHeader === "groupId") {
        id = selectedGroup;
    } else if (selectedHeader === "userId") {
        id = selectedUser;
    }
    var script = operationType + "(`" + id + "," + selectedAccessType;
    // parameter objs is not needed:
    if (selectedAccessType === "DB_MANAGE" || selectedAccessType === "SCRIPT_EXEC" || selectedAccessType === "TEST_EXEC") {
        script += ")";
    }
    // table
    else if (selectedAccessType === "TABLE_READ" || selectedAccessType === "TABLE_WRITE") {
        if (selectedTable === null || selectedTable === "") {
            alert("Please select the DFS table to " + operationType + " access");
            return;
        }
        script += ","+ "'" + selectedTable + "')";
    }
    // database
    else if (selectedAccessType === "DBOBJ_CREATE" || selectedAccessType === "DBOBJ_DELETE") {
        if (selectedDatabase === null || selectedDatabase === "") {
            alert("Please select the DFS database to " + operationType + " access");
            return;
        }
        script += ","+ "'" + selectedDatabase + "')";
    }
    // function view
    else if (selectedAccessType === "VIEW_EXEC") {
        if (selectedFunc === null || selectedFunc === "") {
            alert("Please select the function to " +  operationType + " access");
            return;
        }
        script += ","+ "'" + selectedFunc + "')";
    }
    nodeApi.runSync(script);
    alert(script);
});

$("#displayingTable").on("change", ".item", function () {
    var vals = $(this).val().split(":");
    selectedHeader = vals[0];
    if (selectedHeader === "groupId") {
        selectedGroup = vals[1];
    } else if (selectedHeader === "userId") {
        selectedUser = vals[1];
    }
});