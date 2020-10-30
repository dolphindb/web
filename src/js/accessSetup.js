var nodeApi = null;

var allDFSTables = null;
var allDFSDatabases = null;
var allFunctionViews = null;

var createType = null;
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
    $("#btnCheck, #btnGrant, #btnDeny, #btnRevoke, #btnDelete").hide();
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
    $("#btnCheck, #btnGrant, #btnDeny, #btnRevoke, #btnDelete").show();
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
    $("#checkTable").empty();
    for (var i = 0; i < res.length; i++) {
        $("#checkTable").append("<tr>\
                                                                    <td>" + res[i].name + "</td>\
                                                                    <td style='padding-left:50px'>" + res[i].value[0] + "</td>\
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
        $("#tables").append("<label>DFS Table: <select multiple='true'><option></option>");
        if (allDFSTables.length !== 0) {
            $("#tables select").append("<option>*</option>");
            for (var i = 0; i < allDFSTables.length; i++) {
                $("#tables select").append("<option>" + allDFSTables[i] + "</option>");
            }
        }
        $("#tables").append("</select></label>");
    // databases
    } else if (selectedAccessType === "DBOBJ_CREATE" || selectedAccessType === "DBOBJ_DELETE") {
        $("#databases").append("<label>DFS Databases: <select multiple='true'><option></option>");
        if (allDFSDatabases.length !== 0) {
            $("#databases select").append("<option>*</option>");
            for (var i = 0; i < allDFSDatabases.length; i++) {
                $("#databases select").append("<option>" + allDFSDatabases[i] + "</option>");
            }
        }
        $("#databases").append("</select></label>");
    // function views
    } else if (selectedAccessType === "VIEW_EXEC") {
        $("#functionviews").append("<label>Functions: <select multiple='true'><option></option>");
        if (allFunctionViews.length !== 0) {
            $("#functionviews select").append("<option>*</option>");
            for (var i = 0; i < allFunctionViews.length; i++) {
                $("#functionviews select").append("<option>" + allFunctionViews[i] + "</option>");
            }
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
        if (selectedTable.includes("*")) {
            script += ", '*')";
        } else {
            script += ", [";
            for (var i = 0; i < selectedTable.length; i++) {
                script += "'" + selectedTable[i] + "', ";
            }
            script = script.substring(0, script.length - 2);
            script += "])";
        }
    }
    // database
    else if (selectedAccessType === "DBOBJ_CREATE" || selectedAccessType === "DBOBJ_DELETE") {
        if (selectedDatabase === null || selectedDatabase === "") {
            alert("Please select the DFS database to " + operationType + " access");
            return;
        }
        if (selectedDatabase.includes("*")) {
            script += ", '*')";
        } else {
            script += ", [";
            for (var i = 0; i < selectedDatabase.length; i++) {
                script += "'" + selectedDatabase[i] + "', ";
            }
            script = script.substring(0, script.length - 2);
            script += "])";
        }
    }
    // function view
    else if (selectedAccessType === "VIEW_EXEC") {
        if (selectedFunc === null || selectedFunc === "") {
            alert("Please select the function to " +  operationType + " access");
            return;
        }
        if (selectedFunc.includes("*")) {
            script += ", '*')";
        } else {
            script += ", [";
            for (var i = 0; i < selectedFunc.length; i++) {
                script += "'" + selectedFunc[i] + "', ";
            }
            script = script.substring(0, script.length - 2);
            script += "])"
        }
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

$("#btnNew").bind("click", function (e) {
    var newDialog = $("#newDialog");
    $("#createType").show();
    $("#createType select").val("");
    $("#field1").empty();
    $("#field2").empty();
    $("#field3").empty();
    newDialog[0].showModal();
});

$("#createType select").bind("change", function(e) {
    createType = $("#createType select").val();
    $("#field1").empty();
    $("#field2").empty();
    $("#field3").empty();
    if (createType === "user" || createType === "group") {
        $("#createType").hide();
    }
    if (createType === "user") {
        $("#field1").append("<label>username:\
                                                        <input type='text'>\
                                                    </label>");
        $("#field2").append("<label>password:\
                                                        <input type='password'>\
                                                    </label>");
         $("#field3").append("<label>confirm password:\
                                                        <input type='password'>\
                                                    </label>");
    } else if (createType === "group") {
        $("#field1").append("<label>group name:\
                                                        <input type='text'>\
                                                    </label>");
        $("#field2").append("<label>Add members:\
                                                        <select multiple='true'>\
                                                        </select>\
                                                    </label>");
        var res = nodeApi.getUserList().object[0].value;
        for (var i = 0; i < res.length; i++) {
            $("#field2 select").append("<option>" + res[i] + "</option>");
        }                                
    }
});

$("#confirmNewBtn").bind("click", function (e) {
    if (createType === null || createType === "") {
        alert("Please select user/group");
        return;
    }
    var re;
    var name = $("#field1 input[type='text']").val();
    var successInfo = "Successfully created a new " + createType +" [" + name + "]";
    if (createType === "user") {
        var password1 = $("#field2 input[type='password']").val();
        var password2 = $("#field3 input[type='password']").val();
        if (password1 !== password2) {
            alert("Please confirm your password");
            return;
        }
        re = nodeApi.runSync("createUser('" + name + "','" + password1 + "')");
    } else if (createType === "group") {
        options = $("#field2 select").val();
        var script = "createGroup('" + name + "'";
        if (options.length !== 0) {
            script += ",";
            successInfo += " with " + options.length + " members: [";
            for (var i = 0; i < options.length; i++) {
                script += "`" + options[i];
                successInfo += options[i] + ", "
            }
            successInfo = successInfo.substring(0, successInfo.length - 2);
            successInfo += "]";
        }
        script += ")";
        re = nodeApi.runSync(script);
    }
    if (re.resultCode === "1") {
        alert(re.msg);
        return;
    }
    alert(successInfo);
});

$("#btnDelete").bind("click", function (e) {
    var script;
    if (selectedHeader === "groupId") {
        script = "deleteGroup(`" + selectedGroup + ")";
    } else if (selectedHeader === "userId") {
        script = "deleteUser(`" + selectedUser + ")";
    }
    nodeApi.runSync(script);
    alert(script);
    var re;
    if (selectedHeader === "groupId") {
        re = nodeApi.getGroupList();
    } else if (selectedHeader === "userId") {
        re = nodeApi.getUserList();
    }
    displayAll(re, selectedHeader);
});