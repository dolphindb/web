var nodeApi = null;
var allFunctionViews = [];
var selectedFuncViews = [];
var isCheckAll = false;

$(document).ready(function () {
    nodeUrl = GetFullUrl(window.location.host);
    nodeApi = new DatanodeServer(nodeUrl);
    var controller = new ControllerServer(nodeUrl);
    var currentUser = controller.getCurrentUser();
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
    getAllFuncViews();
});

var codeMirrorEditor = function(element, width, height) {
    var editor = CodeMirror.fromTextArea(element, {
        showCursorWhenSelecting: true,
        cursorHeight: 0.85,
        // lineNumbers: true,
        styleActiveLine: true,
        mode: 'text/x-ddb',
        lineWrapping: true,
    　readOnly: false,
        styleActiveLine: true,
        matchBrackets: true
    });
    editor.setSize(width, height);
    return editor;
};

var newFuncEditor = codeMirrorEditor($("#newFuncView")[0], 800, 200);
var updateFuncEditor = codeMirrorEditor($("#updateFuncView")[0], 800, 200);

var swapCheck = function() {
    if (isCheckAll) {
        $("input[type='checkbox']").each(function() {
            this.checked = false;
        });
        isCheckAll = false;
        selectedFuncViews = [];
    } else {
        $("input[type='checkbox']").each(function() {
            this.checked = true;
        })
        isCheckAll = true;
        var res = nodeApi.getFunctionViews().object[0];
        var nameList = res.value[0].value;
        var bodyList = res.value[1].value;
        selectedFuncViews = [];
        for (var i = 0; i < nameList.length; i++) {
            var name = nameList[i];
            var body = bodyList[i];
            selectedFuncViews.push({"name": name, "body": body});
        }
    }
}

var getAllFuncViews = function() {
    var re = nodeApi.getFunctionViews();
    if (re.resultCode === "1") {
        alert(re.msg);
    } else {
        $("#functionViewTable").empty();
        var res = re.object[0];
        // name
        var nameList = res.value[0].value;
        // body
        var bodyList = res.value[1].value;
        // allFunctionViews
        allFunctionViews = [];
        for (var i = 0; i < nameList.length; i++) {
            var name = nameList[i];
            var body = bodyList[i];
            allFunctionViews.push({"name": name, "body": body});
        }
        $("#functionViewTable").append("<thead>\
                                                                                    <tr>\
                                                                                        <th scope='col'><input type='checkbox' onClick='swapCheck()'></th>\
                                                                                         <th scope='col'>Name</th>\
                                                                                         <th scope='col'>body</th>\
                                                                                         <th scope='col'></th>\
                                                                                    </tr>\
                                                                                </thead>");
        if (allFunctionViews.length !== "0") {
            $("#functionViewTable").append("<tbody>");
            for(var i = 0; i < allFunctionViews.length; i++) {
                var name = nameList[i];
                var body = bodyList[i];
                $("#functionViewTable tbody").append("<tr>\
                                                                                                        <td><input type='checkbox' class='funcView' value=" + name + "></td>\
                                                                                                        <td>" + name + "</td>\
                                                                                                        <td>" + body + "</td>\
                                                                                                        <td><button class='btn btn-sm btn-info btnUpdateFunctionView' value=" + name + ">Update</button></td>\
                                                                                                    </tr>");
            }
            $("#functionViewTable").append("</tbody>");
        }
    }
};

$("#btnAddFunctionView").bind("click", function (e) {
    var newFuncViewDialog = $("#newFuncViewDialog");
    // $("#newFuncView").val("");
    newFuncEditor.setValue("");
    newFuncViewDialog[0].showModal();
    $("#confirmFuncViewBtn").bind("click", function (e) {
        // var userInput = $("#newFuncView").val();
        var userInput = newFuncEditor.getValue();
        nodeApi.runSync(userInput);
        var i = userInput.indexOf("def");
        var j = userInput.indexOf("(");
        if (i === -1 || j === -1) {
            alert("Please provide a valid function definition");
            return;
        }
        var funcName = userInput.substring(i + 3, j).trim();
        nodeApi.addFunctionView(funcName);
        getAllFuncViews();
    });
});

$("#btnDeleteFunctionView").bind("click", function (e) {
    if (selectedFuncViews.length === 0) {
        alert("Please select at least one function view to be deleted");
    } else {
        for (var funcView of selectedFuncViews) {
            var funcName = funcView["name"];
            nodeApi.dropFunctionView(funcName);
        }
        getAllFuncViews();
        selectedFuncViews = [];
    }
});

$("#functionViewTable").on("click", ".btnUpdateFunctionView", function (e) {
    // previous function name
    var selectedFuncName = $(this).val();
    console.log(selectedFuncName);
    var updateFuncViewDialog = $("#updateFuncViewDialog");
    for (var i = 0; i < allFunctionViews.length; i++) {
        var currFuncName = allFunctionViews[i]["name"];
        if (currFuncName === selectedFuncName) {
            updateFuncEditor.setValue(allFunctionViews[i]["body"]);
        }
    }
    updateFuncViewDialog[0].showModal();
    $("#confirmUpdateBtn").bind("click", function (e) {
        var updatedInput = updateFuncEditor.getValue();
        var i = updatedInput.indexOf("def");
        var j = updatedInput.indexOf("(");
        if (i === -1 || j === -1) {
            alert("Please provide a valid function definition");
            return;
        }
        // new function name
        var funcName = updatedInput.substring(i + 3, j).trim();
        // drop and then add
        nodeApi.dropFunctionView(selectedFuncName);
        nodeApi.runSync(updatedInput);
        nodeApi.addFunctionView(funcName);
        getAllFuncViews();
    });
    selectedFuncViews = [];
});

$("#functionViewTable").on("change", ".funcView", function () {
    // name
    var name = $(this).val();
    // body
    for (var funcView of allFunctionViews) {
        if (funcView["name"] === name) {
            if ($(this).is(':checked')) {
                selectedFuncViews.push(funcView);
                return;
            } else {
                var removeIdx;
                for (var idx = 0; idx < selectedFuncViews.length; idx++) {
                    var currFuncName = selectedFuncViews[idx]["name"];
                    if (currFuncName === name) {
                        removeIdx = idx;
                        selectedFuncViews.splice(removeIdx, 1);
                        return;
                    }
                }
            }
        }
    }
});