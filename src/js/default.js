var wa_url = "";

var ALL_NODE = [];
var AGENT_LIST = [];
var NODE_LIST = [];
var CTL_LIST = [];
var SESSION_ID = "0";
var grid = document.querySelector('table[grid-manager="grid1"]');

var filterStorageId = "dolphindb_default_gridfilter"


$(function() {
    wa_url = "http://" + window.location.host;

    $.cookie('ck_ag_controller_url', wa_url);

    $.cookie("language_file", "js/lang.en.js");

    $("#txtFilter").val(localStorage.getItem(filterStorageId));

    GetLocalData(wa_url);
    LoadTable(NODE_LIST);

    
});


function GetLocalData(url) {
    var p = {
        "sessionID": SESSION_ID,
        "functionName": "getClusterPerf",
        "params": [{
            "name": "isShowController",
            "form": "scalar",
            "type": "bool",
            "value": true
        }]
    };
    CallWebApi(url, p, connect_server_success, connect_server_error);
}

function LoadLeft(agentList) {
    $("#physicalServerList").html("");
    var l = $("#serverTemplate").tmpl(agentList).appendTo("#physicalServerList");
    //getDatabases();

}

function LoadTable(nodeList) {
    var griddata = {
        data: nodeList,
        totals: nodeList.length
    };

    grid.GM({
        ajax_data: griddata,
        supportAutoOrder: false,
        supportAjaxPage: false,
        supportExport: false,
        supportSorting: true,
        supportDrag: false,
        supportRemind: false,
        i18n: 'en-us',
        emptyTemplate: '<div class="gm-emptyTemplate">empty</div>',
        width: '80vw',
        height: '80vh',
        columnData: [{
            text: 'Mode',
            key: 'mode',
            remind: 'the role of node(controller,agent,datanode)',
            width: 80,
            template: function(mode, rowObject) {
                if (mode === 0) {
                    return "datanode"
                } else {
                    return "controller"
                }
            }
        }, {
            text: 'Node',
            key: 'site',
            remind: 'node name',
            sorting: '',
            template: function(site, rowObject) {
                if (rowObject.state === 1) {
                    var addrHost = window.location.host.split(':')[0];
                    var nodeHost = rowObject.host;
                    if (nodeHost.toUpperCase() == "LOCALHOST") {
                        nodeHost = addrHost.split(':')[0];
                    } 
                    if (nodeHost != addrHost) {
                         var ethArr = rowObject.ethernetInfo.split(";")
                         var h = addrHost.split(".");
                        var iphead = h[0] + "." + h[1];
                        $(ethArr).each(function (i, e) {
                            var h = e.split(".");
                            if (iphead === h[0]+ "." + h[1]){
                                nodeHost = e;
                            }
                        })
                    }
                    r = '<a href=javascript:window.open("nodedetail.html?site=' + nodeHost + ':' + rowObject.port + ':' + rowObject.site.split(':')[2] + '");>' + rowObject.site.split(':')[2] + '</a>'
                    return r;
                } else {
                    return rowObject.site.split(':')[2];
                }
            },
            sortFilter: function(d) {
                return d.split(':')[2];
            }
        }, {
            text: 'State',
            key: 'state',
            remind: ' state of the node',
            sorting: '',
            template: function(state, rowObject) {
                if (state == "1") {
                    return '<font style="color:green">running</font>';
                } else {
                    return '<font style="color:red">stopped</font>';
                }
            }
        }, {
            text: 'ServerLog',
            key: 'serverLog',
            remind: 'server log',
            template: function(action, rowObject) {
                var r = "";
                var ref = rowObject.agentSite + '@' + rowObject.site;
                if (rowObject.host.toUpperCase() == "LOCALHOST") {
                    ref = ref.replace(rowObject.host, window.location.host.split(':')[0]);
                }
                r += '<a style="padding-left:20px" data-toggle="modal" data-target="#modal-showlog" ref="getServerLog@' + ref + '" href="##">view</a>'
                return r;
            },
        }, {
            text: 'PerfLog',
            key: 'perfLog',
            remind: 'query performance log',
            template: function(action, rowObject) {
                var r = "";
                var ref = rowObject.agentSite + '@' + rowObject.site;
                if (rowObject.host.toUpperCase() == "LOCALHOST") {
                    ref = ref.replace(rowObject.host, window.location.host.split(':')[0]);
                }
                r += '<a style="padding-left:20px" data-toggle="modal" data-target="#modal-showlog" ref="getPerfLog@' + ref + '" href="##">view</a>'
                return r;
            },

        }, {
            text: 'Conns',
            key: 'connectionNum',
            remind: ' number of current connections',
            sorting: '',
            width: 80
        }, {
            text: 'MemUsed',
            key: 'memoryUsed',
            remind: 'Memory Used',
            sorting: '',
            width: 100,
            template: function(memoryUsed, rowObject) {
                return bytesToSize(memoryUsed);
            },
        }, {
            text: 'MemAlloc',
            key: 'memoryAlloc',
            remind: 'Memory Allocated',
            sorting: '',
            width: 100,
            template: function(memoryAlloc, rowObject) {
                return bytesToSize(memoryAlloc);
            },
        }, {
            text: 'CpuUsage',
            key: 'cpuUsage',
            remind: 'cpu usage',
            sorting: '',
            width: 100,
            template: function(cpuUsage, rowObject) {
                return fmoney(cpuUsage,1) + "%";
            },
        }, {
            text: 'AvgLoad',
            key: 'avgLoad',
            remind: 'average load',
            sorting: '',
            width: 100,
            template: function(avgLoad, rowObject) {
                return fmoney(avgLoad,2);
            },
        }, {
            text: 'MedQT10',
            key: 'medLast10QueryTime',
            remind: 'median execution time of the previous 10 finished queries',
            sorting: '',
            width: 90,
            template: function(medLast10QueryTime, rowObject) {
                return fmoney(medLast10QueryTime / 1000000,1) + " ms";
            },
        }, {
            text: 'MaxQT10',
            key: 'maxLast10QueryTime',
            remind: 'max execution time of the previous 10 finished queries',
            sorting: '',
            width: 90,
            template: function(maxLast10QueryTime, rowObject) {
                return fmoney(maxLast10QueryTime / 1000000,1) + " ms";
            },
        }, {
            text: 'MedQT100',
            key: 'medLast100QueryTime',
            remind: 'median execution time of the previous 100 finished queries',
            sorting: '',
            width: 100,
            template: function(medLast100QueryTime, rowObject) {
                return fmoney(medLast100QueryTime / 1000000,1) + " ms";
            },
        }, {
            text: 'MaxQT100',
            key: 'maxLast100QueryTime',
            remind: 'max execution time of the previous 100 finished queries',
            sorting: '',
            width: 100,
            template: function(maxLast100QueryTime, rowObject) {
                return fmoney(maxLast100QueryTime / 1000000,1) + " ms";
            },
        }, {
            text: 'MaxRunningQT',
            key: 'maxRunningQueryTime',
            remind: 'the maximum elapsed time of currently running queries',
            sorting: '',
            width: 120,
            template: function(maxRunningQueryTime, rowObject) {
                return fmoney(rowObject.maxRunningQueryTime/1000000,1) + " ms";
            }
        }, {
            text: 'RunningJobs',
            key: 'runningJobs',
            remind: 'the number of running jobs',
            sorting: '',
            width: 110,
            template: function(runningJobs, rowObject) {
                return Number(runningJobs);
            },
        }, {
            text: 'QueuedJobs',
            key: 'queuedJobs',
            remind: 'the number of jobs in the queue',
            sorting: '',
            width: 110,
            template: function(queuedJobs, rowObject) {
                return Number(queuedJobs);
            },
        }, {
            text: 'RunningTasks',
            key: 'runningTasks',
            remind: 'the number of running sub tasks',
            sorting: '',
            width: 110,
            template: function(runningTasks, rowObject) {
                return Number(runningTasks);
            },
        }, {
            text: 'QueuedTasks',
            key: 'queuedTasks',
            remind: 'the number of sub tasks in the queue',
            sorting: '',
            width: 110,
            template: function(queuedTasks, rowObject) {
                return Number(queuedTasks);
            },
        }, {
            text: 'JobLoad',
            key: 'jobLoad',
            remind: 'the ratio of total jobs to number of workers',
            sorting: '',
            width: 90,
            template: function(jobLoad, rowObject) {
                return Number(jobLoad);
            },
        }, {
            text: 'DiskCapacity',
            key: 'diskCapacity',
            remind: 'disk space of all volumes for the node',
            sorting: '',
            width: 90,
            template: function(diskCapacity, rowObject) {
                return fmoney((diskCapacity / Math.pow(1024,3)),1) + " GB";
            },
        }, {
            text: 'DiskFreeSpace',
            key: 'diskFreeSpace',
            remind: 'available disk space of all volumes for the node',
            sorting: '',
            width: 90,
            template: function(diskFreeSpace, rowObject) {
                return fmoney((diskFreeSpace / Math.pow(1024, 3)),1) + " GB";
            },
        }, {
            text: 'DiskFreeSpaceRatio',
            key: 'diskFreeSpaceRatio',
            remind: 'the percentage of free space out of the disk capacity',
            sorting: '',
            width: 90,
            template: function (diskFreeSpaceRatio, rowObject) {
                return Number(diskFreeSpaceRatio * 100).toFixed(1) + " %";
            },
        }, {
            text: 'DiskWirteRate',
            key: 'diskWriteRate',
            remind: 'the rate of disk write',
            sorting: '',
            width: 90,
            template: function (diskWriteRate, rowObject) {
                return fmoney((diskWriteRate / (1024 * 1024)),1) + " MB/s";
            },
        }, {
            text: 'DiskReadRate',
            key: 'diskReadRate',
            remind: 'the rate of disk read',
            sorting: '',
            width: 90,
            template: function (diskReadRate, rowObject) {
                return fmoney((diskReadRate / (1024 * 1024)),1) + " MB/s";
            },
        }, {
            text: 'LastMinuteWriteVolume',
            key: 'lastMinuteWriteVolume',
            remind: 'the size of disk writing last minute',
            sorting: '',
            width: 90,
            template: function (diskWirtePerMinute, rowObject) {
                return fmoney((diskWirtePerMinute / (1024 * 1024)),1) + " MB";
            },
        }, {
            text: 'Workers',
            key: 'workerNum',
            remind: 'number of job workers',
            sorting: '',
            width: 90
        }, {
            text: 'Executors',
            key: 'executorNum',
            remind: 'number of local task executors',
            sorting: '',
            width: 100
        }, {
            text: 'ConnLimit',
            key: 'maxConnections',
            remind: 'max incoming connections',
            sorting: '',
            width: 90
        }, {
            text: 'MemLimit',
            key: 'maxMemSize',
            remind: 'max memory size',
            sorting: '',
            width: 90,
            template: function(maxMemSize, rowObject) {
                return fmoney(maxMemSize,1) + " GB";
            }
        }],
        sortingAfter: function(querys) {
            hideCtlSel();
        }
    });
}

function refreshGrid(nodeList) {
    //add filter 
    var fv = $("#txtFilter").val();

    var list = nodeList.filter(function (x) {
        return (x.mode === 0 || x.mode === 2) && x.site.indexOf(fv) >= 0;
    });
    var griddata = {
        data: list,
        totals: nodeList.length
    };
    grid.GM('setAjaxData', griddata);

    hideCtlSel();
    //fillMasterInfo();
}


function connect_server_success(result) {
    SESSION_ID = result["sessionID"];
    if (result) {
        var data = result["object"];
        if (data.length <= 0) return;

        ALL_NODE = VectorArray2Table(data[0].value);

        AGENT_LIST = ALL_NODE.filter(function(x) {
            return x.mode === 1;
        });

        LoadLeft(AGENT_LIST);

        NODE_LIST = ALL_NODE.filter(function(x) {
            return x.mode === 0;
        });

        CTL_LIST = ALL_NODE.filter(function(x) {
            return x.mode === 2;
        });
        NODE_LIST = NODE_LIST.sort(byPortUp);
        $(CTL_LIST).each(function(i, e) {
            NODE_LIST.splice(0, 0, e);
        });

        refreshGrid(NODE_LIST)
    }
};

function byPortUp(x, y) {
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
        refreshGrid(NODE_LIST);

        localStorage.setItem(filterStorageId, $("#txtFilter").val());
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

$("#modal-database").on("shown.bs.modal", function(e) {
    getAllTableDistributions($(e.relatedTarget).attr('ref'));
});

$("#modal-showlog").on("shown.bs.modal", function(e) {
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
    $('#jsGrid_perflog').closest().hide();
    if (funcName == "getPerfLog") { length = 50 }
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
            $('#pnllog').hide();
            $('#pnlperflog').hide();
            alert(re.msg);
            return false;
        }
    });
}

var bindLog = function(json) {
    $('#pnllog').show();
    $('#pnlperflog').hide();
    $('#pnllog').html('');
    json.forEach(function(element) {
        $('#pnllog').append(HTMLEncode(element) + "<br/>");
    }, this);
}

var bindPerfLog = function(json) {
    $('#pnllog').hide();
    $('#pnlperflog').show();
    var col = [{
        name: "UserId",
        type: "text",
        width: 60
    }, {
        name: "SessionId",
        type: "text",
        width: 30
    }, {
        name: "StartTime",
        type: "text",
        width: 80
    }, {
        name: "EndTime",
        type: "text",
        width: 80
    }, {
        name: "JobDesc",
        type: "text",
        width: 300
    }]
    var dg = new DolphinGrid($('#jsGrid_perflog'), {
        width: "100%",
        height:"580px",
        autoload: true,
        paging: true,
        pageLoading: false,
        pageSize: 100,
        pageIndex: 1,
        fields: col
    });
    var griddata = DolphinResult2Grid(json);
    //console.log(griddata);
    dg.loadFromJson(griddata);
}


function bytesToSize(bytes) {
    if (bytes === 0) return '0 MB';
    var k = 1024;
    return fmoney(bytes / Math.pow(k, 2),1) + ' MB';
}

function HTMLEncode(html) {
    var temp = document.createElement("div");
    (temp.textContent != null) ? (temp.textContent = html) : (temp.innerText = html);
    var output = temp.innerHTML;
    temp = null;
    return output;
}

//fill master info 
function fillMasterInfo() {
    var p = {
        "sessionID": SESSION_ID,
        "functionName": "getMasterPerfInfo"
    };
    CallWebApi(wa_url, p, function(re) {
        if (re.resultCode == "0") {
            //debugger;
            var conn = re.object[0].value[1].value[2]; //connectionNum;
            var tasks = re.object[0].value[1].value[3];
            var memory = Number(re.object[0].value[1].value[0] / 1000).toFixed(2) + "GB\/" + Number(re.object[0].value[1].value[1]).toFixed(2) + "GB";
            var cpu = re.object[0].value[1].value[4];
            var load = re.object[0].value[1].value[5];
            $("#mst_conn").text(conn);
            $("#mst_tasks").text(tasks);
            $("#mst_memory").text(memory);
            $("#mst_cpu").text(cpu);
            $("#mst_load").text(load);
        } else {
            alert(re.msg);
            return false;
        }
    });
}


//================================================================page event==========================================
$(document).ready(function () {
    setTimeout(hideCtlSel, 10);

    var localSet = grid.GM('getLocalStorage');
    console.log(localSet)
});

$("#btn_collapse").bind("click", function() {
    var span = $("#icon_collapse");
    console.log(span);
    if (span.attr('class') === "glyphicon glyphicon-arrow-left") {
        span.attr('class', 'glyphicon glyphicon-arrow-right');
        span.attr('title', 'expand agent panel');
        $("#main").attr('class', 'col-lg-12 col-md-12');
        $("#sidebar").hide();
    } else {
        span.attr('class', 'glyphicon glyphicon-arrow-left');
        $("#main").attr('class', 'col-lg-10 col-md-9');
        span.attr('title', 'collapse agent panel');
        $("#sidebar").show();
    }

});

$("#dfsUrl").bind("keypress", function (e) {
    if (e.keyCode == 13) {
        $("#btnOpenDFS").click();
    }
});

$("#btnOpenDFS").bind("click", function (e) {
    var url = $("#dfsUrl").val();
    if (url.toUpperCase().indexOf("DFS://") == 0) {
        url = url.replace("dfs:/", "");
    }
    if (isUrl(url)) {
        window.open("dfsExplorer.html?dfs=" + url, "dfsExplorer");
    } else {
        alert("error path! example:/root/directory1/db1");
    }
});
function hideCtlSel() {
    $("td:contains('controller')").parent().children().first().html('');
}

//==============================================================util function============================================
function isUrl(u) {
    var reg = /^([\/][\w-]*)*$/i;
    var isurl = reg.test(u);
    return isurl;
}
function fmoney(s, n) {
    n = n > 0 && n <= 20 ? n : 2;
    s = parseFloat((s + "").replace(/[^\d\.-]/g, "")).toFixed(n) + "";
    var l = s.split(".")[0].split("").reverse(), r = s.split(".")[1];
    t = "";
    for (i = 0; i < l.length; i++) {
        t += l[i] + ((i + 1) % 3 == 0 && (i + 1) != l.length ? "," : "");
    }
    return t.split("").reverse().join("") + "." + r;
}  