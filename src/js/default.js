var wa_url = "";

var ALL_NODE = [];
var AGENT_LIST = [];
var NODE_LIST = [];
var CTL_LIST = [];
var SESSION_ID = "0";
var grid = document.querySelector('table[grid-manager="grid1"]');

var filterStorageId = "dolphindb_default_gridfilter";

$(document).ready(function() {
    wa_url = "http://" + window.location.host;
    
        $.cookie('ck_ag_controller_url', wa_url);
    
        $.cookie("language_file", "js/lang.en.js");
    
        //detectUsers()
    
        $("#txtFilter").val(localStorage.getItem(filterStorageId));
    
        require(["js/clusterNodeManager"],function(){
            cacheControllerIp(wa_url);
            GetLocalData(wa_url);
            LoadTable(NODE_LIST);
            setTimeout(hideCtlSel, 10);
            var localSet = grid.GM('getLocalStorage');
        });

        $("button#btnOpenDFS").removeClass("ui-button");
});

function setGridStyle(){
    $("td[align='center']").each(function(i,e){
        $(e).css("text-align","center");
        console.log(e);
    });
}
function detectUsers() {
    var scriptExecutor = new CodeExecutor(wa_url);
    var script = "getAllRealUsers().size() > 0 and !false"
    scriptExecutor.run(script, function(res) {
        if (res.resultCode === '0') {
            if (res.object.value === '1') { // user detect
                var url = wa_url + '/login.html'
                window.location.replace(url);
            }
        }
    })
}

function cacheControllerIp(url) {
    if (localStorage.getItem("dolphindb_controller_ip") === null) return;
    var p = {
        "sessionID": SESSION_ID,
        "functionName": "getServerAddressByHost",
        "params": [{
            "name": "hostname",
            "form": "scalar",
            "type": "string",
            "value": window.location.host.split(":")[0]
        }]
    };
    CallWebApi(url, p, cache_success, cache_error);
}

function cache_success(result) {
    if (result && result.resultCode === 0) {
        var ctlIP = result.object[0].value;
        localStorage.setItem("dolphindb_controller_ip", ctlIP);
    }
}

function cache_error(result) {
    console.error(result);
}

function getControllerIp() {
    var ctlIP = localStorage.getItem("dolphindb_controller_ip");
    if (!ctlIP) {
        cacheControllerIp(wa_url);
        return window.location.host;
    } else {
        return ctlIP;
    }
}

function getDatanodeApiUrl(controllerIP, rowObject) {
    var addrHost = controllerIP.split(':')[0];
    var nodeHost = rowObject.host;
    if (nodeHost.toUpperCase() === "LOCALHOST") {
        nodeHost = addrHost.split(':')[0];
    }
    if (isEqualIPAddress(nodeHost, addrHost, "255.255.0.0") === false) {
        var ethArr = rowObject.publicName.split(";");
        $(ethArr).each(function(i, e) {
            if (isInnerIP(e)==false) {
                nodeHost = e;
            }
        });
    }
    return nodeHost;
}
//is same net area
function isEqualIPAddress(addr1, addr2, mask) {
    if (!addr1 || !addr2 || !mask) {
        console.log("invalid paramter");
        return false;
    }
    var
        res1 = [],
        res2 = [];
    addr1 = addr1.split(".");
    addr2 = addr2.split(".");
    mask = mask.split(".");
    for (var i = 0, ilen = addr1.length; i < ilen; i += 1) {
        res1.push(parseInt(addr1[i]) & parseInt(mask[i]));
        res2.push(parseInt(addr2[i]) & parseInt(mask[i]));
    }
    if (res1.join(".") == res2.join(".")) {
        return true;
    } else {
        return false;
    }
}


function getAgentSite(controllerIP, rowObject) {
    var agentRows = AGENT_LIST.filter(function(x) {
        return x.host === rowObject.host;
    });
    var agentRow = null;
    if (agentRows.length > 0) {
        agentRow = agentRows[0];
    } else {
        return rowObject.agentSite;
    }
    var agentIP = getDatanodeApiUrl(controllerIP, agentRow);
    var agentOldIP = rowObject.agentSite.split(":")[0];
    var agentUrl = rowObject.agentSite.replace(agentOldIP, agentIP);
    return agentUrl;
}

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
        supportDrag: true,
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
                        return "datanode";
                    } else {
                        return "controller";
                    }
                }
            }, {
                text: 'Node',
                key: 'site',
                remind: 'node name',
                sorting: '',
                template: function(site, rowObject) {
                    if (rowObject.state === 1) {
                        var nodeManager = new ClusterNodeManager();
                        var nodeHost = nodeManager.getNodeApiUrl(rowObject.name);
                        r = '<a href="###" class="a-link" onclick=javascript:window.open("nodedetail.html?site=' + nodeHost + ':' + rowObject.port + ':' + rowObject.name + '");>' + rowObject.name + '</a>';
                        return r;
                    } else {
                        return rowObject.name;
                    }
                },
                sortFilter: function(d) {
                    return d.split(':')[2];
                }
            }, {
                text: 'State',
                key: 'state',
                remind: 'state of the node',
                align:'center',
                sorting: '',
                template: function(state, rowObject) {
                    if (rowObject.state === 1) {
                        //return '<font style="color:green">running</font>';
                        return "<img style='margin: 0 auto' title='running' src='images/running.png' />"
                    } else {
                        return "<img style='margin: 0 auto' title='stopped' src='images/stopped.png' />";
                    }
                }
            }, {
                text: 'ServerLog',
                key: 'serverLog',
                remind: 'server log',
                template: function(action, rowObject) {
                    var r = "";
                    var ref = "";
                    var api_url = "";
                    var node_alias = rowObject.site.split(":")[2];
                    if (rowObject.mode === 0) {
                        var agentUrl = getAgentSite(getControllerIp(), rowObject);
                        api_url = agentUrl;
                        ref = agentUrl + '@' + rowObject.site;
                    } else { //controller
                        api_url = getControllerIp();
                        ref = rowObject.site.replace(rowObject.host, getControllerIp()) + '@' + rowObject.site;
                    }
                    r += '<a style="padding-left:20px" class="a-link"  ref="getServerLog@' + ref + '" href="javascript:void(0)" onclick="showServerLog(\'' + api_url + '\',\'' + node_alias + '\')">view</a>';
                    return r;
                }
            }, {
                text: 'QueryLog',
                key: 'perfLog',
                remind: 'query performance log',
                template: function(action, rowObject) {
                    var r = "";
                    var api_url = "";
                    var node_alias = rowObject.site.split(":")[2];
                    if (rowObject.mode === 0) {
                        var agentUrl = getAgentSite(getControllerIp(), rowObject);
                        api_url = agentUrl;
                        ref = agentUrl + '@' + rowObject.site;
                        r += '<a style="padding-left:20px" class="a-link" ref="getPerfLog@' + ref + '" href="javascript:void(0)" onclick="showPerfLog(\'' + api_url + '\',\'' + node_alias + '\')">view</a>';
                        return r;
                    } else
                        return "<span style='padding-left:20px;color:gray'>N/A</span>"
                }
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
                }
            }, {
                text: 'MemAlloc',
                key: 'memoryAlloc',
                remind: 'Memory Allocated',
                sorting: '',
                width: 100,
                template: function(memoryAlloc, rowObject) {
                    return bytesToSize(memoryAlloc);
                }
            }, {
                text: 'CpuUsage',
                key: 'cpuUsage',
                remind: 'cpu usage',
                sorting: '',
                width: 100,
                template: function(cpuUsage, rowObject) {
                    return fmoney(cpuUsage, 1) + "%";
                }
            }, {
                text: 'AvgLoad',
                key: 'avgLoad',
                remind: 'average load',
                sorting: '',
                width: 100,
                template: function(avgLoad, rowObject) {
                    return fmoney(avgLoad, 2);
                }
            }, {
                text: 'MedQT10',
                key: 'medLast10QueryTime',
                remind: 'median execution time of the previous 10 finished queries',
                sorting: '',
                width: 90,
                template: function(medLast10QueryTime, rowObject) {
                    return fmoney(medLast10QueryTime / 1000000, 1) + " ms";
                }
            }, {
                text: 'MaxQT10',
                key: 'maxLast10QueryTime',
                remind: 'max execution time of the previous 10 finished queries',
                sorting: '',
                width: 90,
                template: function(maxLast10QueryTime, rowObject) {
                    return fmoney(maxLast10QueryTime / 1000000, 1) + " ms";
                }
            }, {
                text: 'MedQT100',
                key: 'medLast100QueryTime',
                remind: 'median execution time of the previous 100 finished queries',
                sorting: '',
                width: 100,
                template: function(medLast100QueryTime, rowObject) {
                    return fmoney(medLast100QueryTime / 1000000, 1) + " ms";
                }
            }, {
                text: 'MaxQT100',
                key: 'maxLast100QueryTime',
                remind: 'max execution time of the previous 100 finished queries',
                sorting: '',
                width: 100,
                template: function(maxLast100QueryTime, rowObject) {
                    return fmoney(maxLast100QueryTime / 1000000, 1) + " ms";
                }
            }, {
                text: 'MaxRunningQT',
                key: 'maxRunningQueryTime',
                remind: 'the maximum elapsed time of currently running queries',
                sorting: '',
                width: 120,
                template: function(maxRunningQueryTime, rowObject) {
                    return fmoney(rowObject.maxRunningQueryTime / 1000000, 1) + " ms";
                }
            }, {
                text: 'RunningJobs',
                key: 'runningJobs',
                remind: 'the number of running jobs',
                sorting: '',
                width: 110,
                template: function(runningJobs, rowObject) {
                    return Number(runningJobs);
                }
            }, {
                text: 'QueuedJobs',
                key: 'queuedJobs',
                remind: 'the number of jobs in the queue',
                sorting: '',
                width: 110,
                template: function(queuedJobs, rowObject) {
                    return Number(queuedJobs);
                }
            }, {
                text: 'RunningTasks',
                key: 'runningTasks',
                remind: 'the number of running sub tasks',
                sorting: '',
                width: 110,
                template: function(runningTasks, rowObject) {
                    return Number(runningTasks);
                }
            }, {
                text: 'QueuedTasks',
                key: 'queuedTasks',
                remind: 'the number of sub tasks in the queue',
                sorting: '',
                width: 110,
                template: function(queuedTasks, rowObject) {
                    return Number(queuedTasks);
                }
            }, {
                text: 'JobLoad',
                key: 'jobLoad',
                remind: 'the ratio of total jobs to number of workers',
                sorting: '',
                width: 90,
                template: function(jobLoad, rowObject) {
                    return Number(jobLoad);
                }
            }, {
                text: 'DiskCapacity',
                key: 'diskCapacity',
                remind: 'disk space of all volumes for the node',
                sorting: '',
                width: 90,
                template: function(diskCapacity, rowObject) {
                    return fmoney((diskCapacity / Math.pow(1024, 3)), 1) + " GB";
                }
            }, {
                text: 'DiskFreeSpace',
                key: 'diskFreeSpace',
                remind: 'available disk space of all volumes for the node',
                sorting: '',
                width: 90,
                template: function(diskFreeSpace, rowObject) {
                    return fmoney((diskFreeSpace / Math.pow(1024, 3)), 1) + " GB";
                }
            }, {
                text: 'DiskFreeSpaceRatio',
                key: 'diskFreeSpaceRatio',
                remind: 'the percentage of free space out of the disk capacity',
                sorting: '',
                width: 90,
                template: function(diskFreeSpaceRatio, rowObject) {
                    return Number(diskFreeSpaceRatio * 100).toFixed(1) + " %";
                }
            }, {
                text: 'DiskWirteRate',
                key: 'diskWriteRate',
                remind: 'the rate of disk write',
                sorting: '',
                width: 90,
                template: function(diskWriteRate, rowObject) {
                    return fmoney((diskWriteRate / (1024 * 1024)), 1) + " MB/s";
                }
            }, {
                text: 'DiskReadRate',
                key: 'diskReadRate',
                remind: 'the rate of disk read',
                sorting: '',
                width: 90,
                template: function(diskReadRate, rowObject) {
                    return fmoney((diskReadRate / (1024 * 1024)), 1) + " MB/s";
                }
            }, {
                text: 'LastMinuteWriteVolume',
                key: 'lastMinuteWriteVolume',
                remind: 'the size of disk writing last minute',
                sorting: '',
                width: 90,
                template: function(diskWirtePerMinute, rowObject) {
                    return fmoney((diskWirtePerMinute / (1024 * 1024)), 1) + " MB";
                }
            }, {
                text: 'LastMinuteReadVolume',
                key: 'lastMinuteReadVolume',
                remind: 'the size of disk reading last minute',
                sorting: '',
                width: 90,
                template: function(lastMinuteReadVolume, rowObject) {
                    return fmoney((lastMinuteReadVolume / (1024 * 1024)), 1) + " MB";
                }
            },{
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
                    return fmoney(rowObject.maxMemSize, 1) + " GB";
                }
            }, {
                text: 'NetworkSendRate',
                key: 'networkSendRate',
                remind: 'the rate of sending',
                sorting: '',
                width: 90,
                template: function(networkSendRate, rowObject) {
                    return fmoney(rowObject.networkSendRate / (1024 * 1024), 1) + " MB/s";
                }
            }, {
                text: 'NetworkRecvRate',
                key: 'networkRecvRate',
                remind: 'the rate of receiving',
                sorting: '',
                width: 90,
                template: function(networkRecvRate, rowObject) {
                    return fmoney(rowObject.networkRecvRate / (1024 * 1024), 1) + " MB/s";
                }
            }, {
                text: 'LastMinuteNetworkSend',
                key: 'lastMinuteNetworkSend',
                remind: 'the size of network sending last minute',
                sorting: '',
                width: 90,
                template: function(lastMinuteNetworkSend, rowObject) {
                    return fmoney(rowObject.lastMinuteNetworkSend / (1024 * 1024), 1) + " MB";
                }
            }, {
                text: 'LastMinuteNetworkRecv',
                key: 'lastMinuteNetworkRecv',
                remind: 'the size of network receiving last minute',
                sorting: '',
                width: 90,
                template: function(lastMinuteNetworkRecv, rowObject) {
                    return fmoney(rowObject.lastMinuteNetworkRecv / (1024 * 1024), 1) + " MB";
                }
            }, {
                text: 'LastMsgLatency',
                key: 'lastMsgLatency',
                remind: 'the latency of the last received message',
                sorting: '',
                width: 90,
                template: function(lastMsgLatency, rowObject) {
                    return fmoney(rowObject.lastMsgLatency / 1000000, 1) + " ms";
                }
            },
            {
                text: 'CumMsgLatency',
                key: 'cumMsgLatency',
                remind: 'the weighted average latency of all received messages during the subscription',
                sorting: '',
                width: 90,
                template: function(cumMsgLatency, rowObject) {
                    return fmoney(rowObject.cumMsgLatency / 1000000, 1) + " ms";
                }
            }
        ],
        sortingAfter: function(querys) {
            hideCtlSel();
        },
        sortingBefore:function(query){
            console.log(query);
        }
    });
}

function refreshGrid(nodeList) {
    //add filter 
    var fv = $("#txtFilter").val();

    var list = nodeList.filter(function(x) {
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
    if (result) {
        SESSION_ID = result["sessionID"];

        var data = result["object"];
        if (data.length <= 0) return;

        ALL_NODE = VectorArray2Table(data[0].value);
        var nodeManager = new ClusterNodeManager();
        nodeManager.setCache(ALL_NODE); 
       
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

        refreshGrid(NODE_LIST);
    }
}

function byPortUp(x, y) {
    return (x.port > y.port) ? 1 : -1;
}

function connect_server_error(ex) {
    console.log(ex);
}
//============================================================================


$("#btn_run").click(function() {

    var t = grid.GM("getCheckedData");
    var isAllSuccess = false;
    var valarr = [];
    var aliasarr = [];
    for (var i = 0; i < t.length; i++) {
        data = t[i];
        if (data.state === 1) {
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
    if (c === false) return;
    CallWebApi(wa_url, p,
        function(re) {

        },
        function(re) {
            console.log(re);
        }, {
            timeout: 1000,
            complete: function(XMLHttpRequest, status) {
                if (status === 'timeout') {
                    console.log('startDataNode timeout');
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
        if (data.state === 1) {
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
    if (c === false) return;

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

$('#btn-datanode-config').click(function() {
    var divobj = document.getElementById("datanode-config")
    if (!divobj) {
        divobj = document.createElement("div");
        divobj.id = "datanode-config";
        divobj.setAttribute("style", "overflow:hidden");
        var iframe = document.createElement("iframe");
        iframe.setAttribute("src", "dialogs/datanodeConfig.html");
        iframe.setAttribute("style", "height:100%;width:98%;border:0;overflow:hidden");
        $(iframe).appendTo($(divobj));
        $(divobj).appendTo($('#dialogs'))
    }
    openDialog("datanode-config", "Nodes Configuration");

    var frameWindow = $(divobj).children("iframe")[0].contentWindow;
    if (typeof frameWindow.refreshMe === "function") {
        frameWindow.refreshMe();
    }
})

$('#btn-controller-config').click(function() {
    var divobj = document.getElementById("controller-config")
    if (!divobj) {
        divobj = document.createElement("div");
        divobj.id = "controller-config";
        divobj.setAttribute("style", "overflow:hidden");
        var iframe = document.createElement("iframe");
        iframe.setAttribute("src", "dialogs/controllerConfig.html");
        iframe.setAttribute("style", "height:100%;width:98%;border:0;overflow:hidden");
        $(iframe).appendTo($(divobj));
        $(divobj).appendTo($('#dialogs'))
    }
    openDialog("controller-config", "Controller Configuration");

    var frameWindow = $(divobj).children("iframe")[0].contentWindow;
    if (typeof frameWindow.refreshMe === "function") {
        frameWindow.refreshMe();
    }
})

$('#btn-nodes-setup').click(function() {
    var divobj = document.getElementById("nodes-setup")
    if (!divobj) {
        divobj = document.createElement("div");
        divobj.id = "nodes-setup";
        divobj.setAttribute("style", "overflow:hidden");
        var iframe = document.createElement("iframe");
        iframe.setAttribute("src", "dialogs/nodesSetup.html");
        iframe.setAttribute("style", "height:100%;width:98%;border:0;overflow:hidden");
        $(iframe).appendTo($(divobj));
        $(divobj).appendTo($('#dialogs'))
    }
    openDialog("nodes-setup", "Nodes Setup");

    var frameWindow = $(divobj).children("iframe")[0].contentWindow;
    if (typeof frameWindow.refreshMe === "function") {
        frameWindow.refreshMe();
    }
})

$("#txtFilter").keypress(function(e) {
    if (e.keyCode === 13) {
        refreshGrid(NODE_LIST);

        localStorage.setItem(filterStorageId, $("#txtFilter").val());
    }
});


//================================================================page event==========================================


$("#btn_collapse").bind("click", function() {
    var span = $("#icon_collapse");
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

$("#dfsUrl").bind("keypress", function(e) {
    if (e.keyCode === 13) {
        $("#btnOpenDFS").click();
    }
});

$("#btnOpenDFS").bind("click", function(e) {
    var url = $("#dfsUrl").val();
    if (url.toUpperCase().indexOf("DFS://") === 0) {
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
    setGridStyle();
}

function showServerLog(url, alias) {
    var apiUrl = url;
    var nodeAlias = alias;
    var did = "svrlog_" + nodeAlias;

    new DolphinDialog(did, { title: 'ServerLog[' + nodeAlias + ']'}).openSingleWindow("dialogs/svrlog.html?svr=" + apiUrl + "&node=" + nodeAlias + "&sessid=" + SESSION_ID);
}

function showPerfLog(url, alias) {
    var apiUrl = url;
    var nodeAlias = alias;
    var did = "perflog_" + nodeAlias;
  
    new DolphinDialog(did, { title: 'QueryLog[' + nodeAlias + ']'}).openSingleWindow("dialogs/perflog.html?svr=" + apiUrl + "&node=" + nodeAlias + "&sessid=" + SESSION_ID);
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
    var l = s.split(".")[0].split("").reverse(),
        r = s.split(".")[1];
    t = "";
    for (i = 0; i < l.length; i++) {
        t += l[i] + ((i + 1) % 3 === 0 && (i + 1) != l.length ? "," : "");
    }
    return t.split("").reverse().join("") + "." + r;
}

function bytesToSize(bytes) {
    if (bytes === 0) return '0 MB';
    var k = 1024;
    return fmoney(bytes / Math.pow(k, 2), 1) + ' MB';
}

function openDialog(dialog, tit) {
    $("#" + dialog).dialog({
        width: 900,
        height: 650,
        position: { my: "center", at: "center", of: window },
        title: tit,
        dialogClass: "no-close",
    });
}

function closeDialog(dialog) {
    $("#" + dialog).dialog("close");
}