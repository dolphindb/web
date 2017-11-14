var wa_url = "";

var ALL_NODE = [];
var AGENT_LIST = [];
var NODE_LIST = [];

var SESSION_ID = "0";
var grid = document.querySelector('table[grid-manager="grid1"]');



$(function() {
    wa_url = "http://" + window.location.host;

    $.cookie('ck_ag_controller_url', wa_url);

    $.cookie("language_file", "js/lang.en.js");

    GetLocalData(wa_url);

});


function GetLocalData(url) {
    var p = {
        "sessionID": SESSION_ID,
        "functionName": "getNodeList"
    };
    CallWebApi(url, p, connect_server_success, connect_server_error);
}

function LoadLeft(agentList) {
    $("#physicalServerList").html("");
    var l = $("#serverTemplate").tmpl(agentList).appendTo("#physicalServerList");
    getDatabases();

}

function LoadTable(nodeList) {
    console.log(nodeList);
    var dg = new DolphinGrid($("#jsgrid1"), {

    });
    col = [
        { name: "select", type: "checkbox" },
        { name: "site", title: "Site" },
        { name: "state", title: "Status" },
        { name: "serverLog" },
        { name: "perfLog" },
        { name: "connectionNum" },
        { name: "taskNum" },
        { name: "memoryUsed" },
        { name: "memoryAlloc" },
        { name: "maxConnections" },
        { name: "maxMemSize" },
        { name: "workerNum" },
        { name: "executorNum" },
        { name: "medLast10QueryTime" },
        { name: "maxLast10QueryTime" },
        { name: "medLast100QueryTime" },
        { name: "maxLast100QueryTime" },
        { name: "maxRunningQueryTime" }
    ]
    dg.loadFromJson(nodeList, false, col)
}

function refreshGrid(nodeList) {
    var griddata = {
        data: nodeList,
        totals: nodeList.length
    };
    grid.GM('setAjaxData', griddata);
}


function connect_server_success(result) {
    SESSION_ID = result["sessionID"];

    if (result) {
        var data = result["object"];

        if (data.length <= 0) return;
        ALL_NODE = VectorArray2Table(data[0].value);
        console.log("ALL_NODE");
        AGENT_LIST = ALL_NODE.filter(function(x) {
            return x.mode === 1;
        });

        //LoadLeft(AGENT_LIST);
        console.log("AGENT_LIST");
        NODE_LIST = ALL_NODE.filter(function(x) {
            return x.mode === 0;
        });
        console.log("NODE_LIST");
        console.log(NODE_LIST);
        NODE_LIST.sort(up);

        LoadTable(NODE_LIST);
    }
};

function up(x, y) {
    return (x.port > y.port) ? 1 : -1
}

function connect_server_error(ex) {
    console.log(ex);
};
//============================================================================


$("#btn_run").click(function() {

    var t = grid.GM("getCheckedData");
    var isAllSuccess = false;
    var valarr = [];
    var aliasarr = [];
    for (var i = 0; i < t.length; i++) {
        data = t[i];
        if (data.state == "1") {
            continue;
        };
        valarr.push(data.host + ":" + data.port);
        aliasarr.push(data.site.split(":")[2]);
    }
    var p = {
        "sessionID": SESSION_ID,
        "functionName": "startDataNode",
        "params": [{
            "name": "port",
            "form": "vector",
            "type": "string",
            "value": valarr
        }]
    }

    var c = window.confirm("are you sure  you want to start nodes : \n" + aliasarr.join('\n'));
    if (c == false) return;
    CallWebApi(wa_url, p,
        function(re) {

        },
        function(re) {
            console.log(re);
        }, {
            timeout: 1000,
            complete: function(XMLHttpRequest, status) {
                if (status == 'timeout') {
                    console.log('timeout');
                }
            }
        }
    );

});
$("#btn_stop").click(function() {
    var t = grid.GM("getCheckedData");
    var isAllSuccess = false;
    var valarr = [];
    var aliasarr = [];
    for (var i = 0; i < t.length; i++) {
        data = t[i];
        if (data.state == "1") {
            valarr.push(data.host + ":" + data.port);
            aliasarr.push(data.site.split(":")[2]);
        }
    }
    var p = {
        "sessionID": SESSION_ID,
        "functionName": "stopDataNode",
        "params": [{
            "name": "port",
            "form": "vector",
            "type": "string",
            "value": valarr
        }]
    }
    var c = window.confirm("are you sure  you want to stop nodes : \n" + aliasarr.join('\n'));
    if (c == false) return;

    CallWebApi(wa_url, p, function(re) {

        },
        function(re) {
            console.log(re);
        })
});

$("#btn_refresh").click(function() {
    GetLocalData(wa_url);
    LoadTable(NODE_LIST);
});

$("#txtFilter").keypress(function(e) {
    if (e.keyCode == 13) {
        var fv = $(this).val();
        NODE_LIST = ALL_NODE.filter(function(x) {
            return x.mode === 'dataNode' && x.site.indexOf(fv) >= 0;
        });
        refreshGrid(NODE_LIST);
    }
});

var getDatabases = function() {
    var executor = new CodeExecutor(wa_url);
    executor.run("getDatabases();", function(re) {
        if (re.object.length > 0) {
            var dblist = [];
            var databaseNames = re.object[0].value[0].value; //databaseName
            var domainIds = re.object[0].value[1].value; //domainId
            var tableNames = re.object[0].value[2].value; //tableName

            $.each(domainIds, function(i, v) {
                var tbname = tableNames[i];
                var domainId = v;
                var dbname = databaseNames[i];
                var fi = dblist.findIndex(function(ele, ind, obj) {
                    if (domainId == ele.domainId) return ind;
                });
                if (fi < 0) {
                    var db = {};
                    db.dbName = dbname;
                    db.domainId = domainId;
                    db.tableCount = 1;
                    db.tableNames = tbname;
                    dblist.push(db);
                } else {
                    var db = dblist[fi];
                    db.dbName = dbname;
                    db.tableCount++;
                    db.tableNames = db.tableCount + " tables";
                }
            });
            $("#databaseList").html("");
            l = $("#databaseTemplate").tmpl(dblist).appendTo("#databaseList");
        }
    });
}

var getAllTableDistributions = function(domainId) {
    var p = {
        "sessionID": SESSION_ID,
        "functionName": "getAllTableDistributions",
        "params": [{
            "name": "domainId",
            "form": "scalar",
            "type": "string",
            "value": domainId
        }]
    };
    CallWebApi(wa_url, p, function(re) {
        if (re.object.length > 0) {
            var retable = VectorArray2Table(re.object[0].value);

            for (var i = 0; i < retable.length; i++) {
                var s = retable[i].site.split(":");
                if (s.length > 2) {
                    retable.site = s[2];
                }
            }
            openDatabase(retable);
        }
    });
}

var PARTITIONTYPE = ["SEQ", "VALUE", "RANGE", "LIST"];

function openDatabase(tb_src) {
    var col = [{
        name: "tableName",
        type: "select",
        items: getVectorFromTable(tb_src, "tableName", true, true),
        valueField: "name",
        textField: "name",
        width: 150
    }, {
        name: "partitionId",
        type: "select",
        items: getVectorFromTable(tb_src, "partitionId", true, true),
        valueField: "name",
        textField: "name",
        width: 100
    }, {
        name: "site",
        type: "select",
        items: getVectorFromTable(tb_src, "site", true, true),
        valueField: "name",
        textField: "name",
        width: 200,
        itemTemplate: function(value) {
            var s = value.split(":");
            if (s.length > 2)
                return s[2];
            else
                return value;
        }
    }, {
        name: "partitionType",
        type: "text",
        filtering: false,
        itemTemplate: function(value) {
            return PARTITIONTYPE[value];
        }
    }, {
        name: "partitionCount",
        type: "text",
        filtering: false
    }];
    var dg = new DolphinGrid($('#jsGrid_database'), {
        width: 780,
        filtering: true,
        sorting: true,
        autoload: false,
        controller: {
            loadData: function(filter) {
                return $.grep(tb_src, function(tb) {
                    return (!filter.tableName || tb.tableName == filter.tableName) &&
                        (!filter.partitionId || tb.partitionId == filter.partitionId) &&
                        (!filter.site || tb.site == filter.site);
                });
            }
        },
        fields: col
    });

    dg.load();

}

$("#modal-database").on("show.bs.modal", function(e) {
    getAllTableDistributions($(e.relatedTarget).attr('ref'));
});

$("#modal-showlog").on("show.bs.modal", function(e) {
    var param = $(e.relatedTarget).attr('ref');
    var urlArr = param.split('@');
    var funcName = urlArr[0];
    var svrArr = urlArr[1].split(':');
    if (svrArr.length < 2) return;
    var svr_url = "http://" + svrArr[0] + ":" + svrArr[1];
    var nodeAlias = urlArr[2].split(':')[2];
    $('#modal-showlog').attr('ref', svr_url);
    $('#modal-showlog').attr('funcName', funcName);
    $('#log_node').text(nodeAlias);

    re = getLog(svr_url, $('#txtOffset').val(), $('#txtLength').val(), logFromhead, $('#log_node').text(), funcName);

});

var logFromhead = false;
$("#btnForward").bind('click', function() {
    var len = $('#txtLength').val();
    var currentpostion = $('#txtOffset').val();
    $('#txtOffset').val(parseInt(currentpostion) + parseInt(len));
    LoadLog();
});

$("#btnBackward").bind('click', function() {
    var len = $('#txtLength').val();
    var currentpostion = $('#txtOffset').val();
    var nextPosition = parseInt(currentpostion) - parseInt(len);
    if (nextPosition < 0)
        nextPosition = 0;
    $('#txtOffset').val(nextPosition);
    LoadLog();
});

$('#btnReload').bind('click', function() {
    LoadLog();
});

$('#btnFromHead').bind('click', function() {
    $('#btnFrom').text($('#btnFromHead').text());
    logFromhead = true;
    LoadLog();
});

$('#btnFromTail').bind('click', function() {
    $('#btnFrom').text($('#btnFromTail').text());
    logFromhead = false;
    LoadLog();
});

var LoadLog = function() {
    var svr_url = $('#modal-showlog').attr('ref');
    var funcName = $('#modal-showlog').attr('funcName');
    getLog(svr_url, $('#txtOffset').val(), $('#txtLength').val(), logFromhead, $('#log_node').text(), funcName);
}

var getLog = function(svr_url, offset, length, fromhead, nodeAlias, funcName) {
    $('#pnllog').hide();
    $('#jsGrid_perflog').hide();
    var p = {
        "sessionID": SESSION_ID,
        "functionName": funcName,
        "params": [{
            "name": "length",
            "form": "scalar",
            "type": "int",
            "value": length
        }, {
            "name": "offset",
            "form": "scalar",
            "type": "int",
            "value": offset
        }, {
            "name": "fromhead",
            "form": "scalar",
            "type": "bool",
            "value": fromhead
        }, {
            "name": "nodeAlias",
            "form": "scalar",
            "type": "string",
            "value": nodeAlias
        }]
    };

    CallWebApi(svr_url, p, function(re) {
        if (re.resultCode == "0") {
            if (re.object.length > 0) {
                var retable = re.object[0].value;
                if (funcName == "getServerLog") {
                    bindLog(retable);
                } else if (funcName == "getPerfLog") {
                    bindPerfLog(re);
                }

            }
        } else {
            alert(re.msg);
            return false;
        }
    });
}

var bindLog = function(json) {
    $('#pnllog').show();
    $('#jsGrid_perflog').hide();
    $('#pnllog').html('');
    json.forEach(function(element) {
        $('#pnllog').append(HTMLEncode(element) + "<br/>");
    }, this);
}

var bindPerfLog = function(json) {
    $('#pnllog').hide();
    $('#jsGrid_perflog').show();
    var col = [{
        name: "UserId",
        type: "text",
        width: 60
    }, {
        name: "SessionId",
        type: "text",
        width: 80
    }, {
        name: "StartTime",
        type: "text",
    }, {
        name: "EndTime",
        type: "text",
    }, {
        name: "JobDesc",
        type: "text",
    }]
    var dg = new DolphinGrid($('#jsGrid_perflog'), {
        width: 750,
        autoload: false,
        paging: false,
        fields: col
    });
    var griddata = DolphinResult2Grid(json);
    //console.log(griddata);
    dg.loadFromJson(griddata);
}


function bytesToSize(bytes) {
    if (bytes === 0) return '0 MB';
    var k = 1024;
    return (bytes / Math.pow(k, 2)).toFixed(1) + ' MB';
}

function HTMLEncode(html) {
    var temp = document.createElement("div");
    (temp.textContent != null) ? (temp.textContent = html) : (temp.innerText = html);
    var output = temp.innerHTML;
    temp = null;
    return output;
}