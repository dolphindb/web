var nodeApi = null;

var allDFSTables = null;
var allDFSDatabases = null;
var allFunctionViews = null;

var createType = null;
var operationType = null;
var opType = null;

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
    allDFSTables = nodeApi.getClusterDFSTables().object[0].value;
    allDFSDatabases = nodeApi.getClusterDFSDatabases().object[0].value;
    allFunctionViews = nodeApi.getFunctionViews().object[0].value[0].value;
    $("#btnCheck, #btnGrant, #btnDeny, #btnRevoke, #btnDelete").hide();
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

var generateList = function(labelText, idSelector, allItems) {
    $(idSelector).append("<label>" + labelText + "<select multiple='true'><option></option>");
    if (allItems.length !== 0) {
        $(idSelector + " select").append("<option>*</option>");
        for (var i = 0; i < allItems.length; i++) {
            $(idSelector + " select").append("<option>" + allItems[i] + "</option>");
        }
    }
    $(idSelector).append("</select></label>");
};

$("#types select").bind("change", function(e) {
    selectedAccessType = $("#types select").val();
    // clear first
    $("#tables").empty();
    $("#databases").empty();
    $("#functionviews").empty();
    // tables
    if (selectedAccessType === "TABLE_READ" || selectedAccessType === "TABLE_WRITE") {
        generateList("DFS Tables: ", "#tables", allDFSTables);
    // databases
    } else if (selectedAccessType === "DBOBJ_CREATE" || selectedAccessType === "DBOBJ_DELETE") {
        generateList("DFS Databases: ", "#databases", allDFSDatabases);
    // function views
    } else if (selectedAccessType === "VIEW_EXEC") {
        generateList("Functions: ", "#functionviews", allFunctionViews);
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

var generateScript = function(script, selectedItem, operationType, itemType) {
    if (selectedItem === null || selectedItem === "") {
        alert("Please select the " + itemType + " to " + operationType + " access");
        return;
    }
    if (selectedItem.includes("*")) {
        script += ", '*')";
    } else {
        script += ", [";
        for (var i = 0; i < selectedItem.length; i++) {
            script += "'" + selectedItem[i] + "', ";
        }
        script = script.substring(0, script.length - 2);
        script += "])";
    }
    return script;
};

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
        script = generateScript(script, selectedTable, operationType, "DFS table(s)");
    }
    // database
    else if (selectedAccessType === "DBOBJ_CREATE" || selectedAccessType === "DBOBJ_DELETE") {
        script = generateScript(script, selectedDatabase, operationType, "DFS database(s)");
    }
    // function view
    else if (selectedAccessType === "VIEW_EXEC") {
        script = generateScript(script, selectedFunc, operationType, "function(s)");
    }
    if (script) {
        nodeApi.runSync(script);
        alert(script);
    }
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
    $("#newDialog label").show();
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
        $("#newDialog label").hide();
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
    var re;
    if (createType === "group") {
        re = nodeApi.getGroupList();
    } else if (createType === "user") {
        re = nodeApi.getUserList();
    }
    displayAll(re, createType + "Id");
});

$("#btnMember").bind("click", function (e) {
    if (selectedHeader !== "groupId") {
        alert("Please select a group to add or remove member");
        return;
    }
    var memberDialog = $("#memberDialog");
    document.getElementById('memberLabel').innerHTML = "Group member manager:";
    $("#opType").show();
    $("#opType select").val("");
    $("#member").hide();
    memberDialog[0].showModal();
});

$("#opType select").bind("change", function (e) {
    opType = $("#opType select").val();
    var existingUsers = nodeApi.getUsersByGroupId(selectedGroup).object[0].value;
    var allUsers = nodeApi.getUserList().object[0].value;
    var availableUsers = [];
    for (var currUser of allUsers) {
        if (!existingUsers.includes(currUser)) {
            availableUsers.push(currUser);
        }
    }
    if (opType === "Add new member(s)" || opType === "Remove existing member(s)") {
        document.getElementById('memberLabel').innerHTML = opType;
        $("#opType").hide();
        $("#member").show();
        $("#member").empty();
        $("#member").append("<select multiple='true'></select>");
        if (opType === "Add new member(s)") {
            for (var i = 0; i < availableUsers.length; i++) {
                $("#member select").append("<option>" + availableUsers[i] + "</option>");
            }
        } else {
            for (var i = 0; i < existingUsers.length; i++) {
                $("#member select").append("<option>" + existingUsers[i] + "</option>");
            }
        }
    }
});

$("#confirmMemberBtn").bind("click", function (e) {
    if (opType === null || opType === "") {
        alert("Please select operation type: add or remove");
        return;
    }
    var selectedUsers = $("#member select").val();
    if (selectedUsers.length === 0) {
        alert("Please select user(s) to add or remove");
        return;
    }
    var script;
    if (opType === "Add new member(s)") {
        script = "addGroupMember([";
    } else {
        script = "deleteGroupMember([";
    }
    for (var i = 0; i < selectedUsers.length; i++) {
        script += "'" + selectedUsers[i] + "',";
    }
    script = script.substring(0, script.length - 1);
    script += "],'" + selectedGroup + "')";
    var re = nodeApi.runSync(script);
    if (re.resultCode === "1") {
        alert(re.msg);
        return;
    }
    alert(script);
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
    $("#btnCheck, #btnGrant, #btnDeny, #btnRevoke, #btnDelete").hide();
});