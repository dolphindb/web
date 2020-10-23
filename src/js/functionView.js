var nodeApi = null;
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
        var bodyList = nodeApi.getFunctionViews().object[0].value[1].value;
        selectedFuncViews = [];
        for (var body of bodyList) {
            body = body.replace(/\s*/g,"");
            selectedFuncViews.push(body);
        }
    }
    console.log(selectedFuncViews);
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
        $("#functionViewTable").append("<thead>\
                                                                                    <tr>\
                                                                                        <th scope='col'><input type='checkbox' onClick='swapCheck()'></th>\
                                                                                         <th scope='col'>Name</th>\
                                                                                         <th scope='col'>body</th>\
                                                                                    </tr>\
                                                                                </thead>");
        if (res.size !== "0") {
            $("#functionViewTable").append("<tbody>");
            for(var i = 0; i < res.size; i++) {
                var name = nameList[i];
                var body = bodyList[i];
                body = body.replace(/\s*/g,"");
                $("#functionViewTable tbody").append("<tr>\
                                                                                                        <td><input type='checkbox' class='funcView' value=" + body + "></td>\
                                                                                                        <td>" + name + "</td>\
                                                                                                        <td>" + body + "</td>\
                                                                                                    </tr>");
            }
            $("#functionViewTable").append("</tbody>");
        }
    }
};

$("#btnAddFunctionView").bind("click", function (e) {
    var newFuncViewDialog = $("#newFuncViewDialog");
    $("#newFuncView").val("");
    newFuncViewDialog[0].showModal();
    $("#confirmFuncViewBtn").bind("click", function (e) {
        var userInput = $("#newFuncView").val();
        console.log(userInput);
        nodeApi.runSync(userInput);
        var i = userInput.indexOf("def");
        var j = userInput.indexOf("(");
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
            var funcName = funcView.substring(funcView.indexOf("def") + 3, funcView.indexOf("(")).trim();
            nodeApi.dropFunctionView(funcName);
        }
        getAllFuncViews();
        selectedFuncViews = [];
    }
});

$("#btnUpdateFunctionView").bind("click", function (e) {
    if (selectedFuncViews.length === 0) {
        alert("Please select one function view to be updated");
        return;
    }
    if (selectedFuncViews.length !== 1) {
        alert("Please update only one function view at a time");
        return;
    }
    var updateFuncViewDialog = $("#updateFuncViewDialog");
    $("#updateFuncView").val(selectedFuncViews[0]);
    console.log("BEFORE+++++++");
    console.log(selectedFuncViews[0]);
    updateFuncViewDialog[0].showModal();
    $("#confirmUpdateBtn").bind("click", function (e) {
        var updatedInput = $("#updateFuncView").val();
        var i = updatedInput.indexOf("def");
        var j = updatedInput.indexOf("(");
        var funcName = updatedInput.substring(i + 3, j).trim();
        nodeApi.dropFunctionView(funcName);
        nodeApi.runSync(updatedInput);
        nodeApi.addFunctionView(funcName);
        getAllFuncViews();
    });
});

$("#functionViewTable").on("change", ".funcView", function () {
    var funcView = $(this).val();
    if ($(this).is(':checked')) {
        selectedFuncViews.push(funcView);
    } else {
        selectedFuncViews.splice(selectedFuncViews.indexOf(funcView), 1);
    }
    console.log(selectedFuncViews);
});