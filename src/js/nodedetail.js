var editor = null;
var controllerUrl = '';
var nodeUrl = '';
var HOST = '';
var PORT = '';
var logStorageID = '';

var PAGESIZE = 20;
var nodeManager = null;
var nodeApi = null;

$(function () {

    nodeUrl = GetFullUrl(window.location.host);
    //login

    nodeApi = new DatanodeServer(nodeUrl);

    nodeManager = new ClusterNodeManager();
    var siteid = $.getUrlParam('site');

    if (!siteid || siteid === "") {
        controllerUrl = nodeUrl;
    } else {
        var hostinfo = siteid.split(':');
        HOST = hostinfo[0];
        PORT = hostinfo[1];
        controllerUrl = GetFullUrl(HOST + ":" + PORT + "/");
    }

    nodeManager.refreshCache(controllerUrl);

    if (siteid || siteid === '')
        $('#link-to-controller').attr('href', GetFullUrl(window.location.host));
    else
        $('#link-to-controller').attr('href', '');

    logStorageID = "executelog" + siteid;

    $.cookie("language_file", "js/lang.en.js");

    var mime = 'text/x-ddb';
    editor = CodeMirror.fromTextArea(document.getElementById('txt_code'), {
        mode: mime,
        indentWithTabs: true,
        smartIndent: true,
        lineNumbers: true,
        matchBrackets: true,
        autofocus: true,
        viewportMargin: Infinity,
        extraKeys: { "Ctrl-Alt-Space": "autocomplete" },
        hintOptions: {
            tables: {
                
            }
        }
    });

    editor.on('change', function(cm, change) {
        var div = document.getElementById('cm_container');
        div.scrollTop = div.scrollHeight;
    });


    writelog(localStorage.getItem(logStorageID));

    refreshVariables();

    var ALIAS = $.getUrlParam('alias');
    if (ALIAS) {
        document.title = ALIAS;
    }

    var ticket = window.name;

    nodeApi.authenticateByTicket(ticket, function (re) {
        if (re.resultCode === "1") {
            console.log("login as a guest");
        } else {
            console.log("login success ", re)
        }
    });
    
    var re = nodeApi.getNodeType();
    if (re.resultCode === "0") {
        var nodeType = re.object[0].value;
        if(nodeType=="3"){
            getPerfomance();
            $("#btn_refresh").on("click", function(e){
                getPerfomance();
            });
        } else {
            $("#nav-btns").hide();
            $("#pnlPerfContainer").hide();
        }
    }
});

function getPerfomance(){
    var perfTable = nodeApi.getSingleClusterPerf();
    if(perfTable.length>0){
        var divNode = $("#pnlPerf");
        divNode.children().remove();
        var perfRow =  perfTable[0];
        //console.log(perfRow);
        divNode.append("<a class='btn btn-xs'>Connections : <span class='badge' data-toggle='tooltip' title='ConnectionNum/MaxConnections'>" + perfRow["connectionNum"] + " / " + perfRow["maxConnections"] + "<span></a>");
        divNode.append("<a class='btn btn-xs'>Memory usage : <span class='badge' data-toggle='tooltip' title='MemoryUsed(MemoryAlloc)/MaxMemSize'>" + bytesToSize(perfRow["memoryUsed"]) + " (" + bytesToSize(perfRow["memoryAlloc"]) + ") / " + perfRow["maxMemSize"] + " GB" + " </span></a>");
        divNode.append("<a class='btn btn-xs '>Cpu usage : <span class='badge' data-toggle='tooltip' title='CpuUsage/AvgLoad'>" + fmoney(perfRow["cpuUsage"], 1) + "%" + " / " + fmoney(perfRow["avgLoad"], 2) + "</span></a>");
        divNode.append("<a class='btn btn-xs'> Disk rate : <span class='badge' data-toggle='tooltip' title='DiskWriteRate|DiskReadRate'>" + fmoney((perfRow["diskWriteRate"] / (1024 * 1024)), 1) + " MB/s" + " | " +fmoney((perfRow["diskReadRate"] / (1024 * 1024)), 1) + " MB/s" + "</span></a>");
        divNode.append("<a class='btn btn-xs'> Network : <span class='badge' data-toggle='tooltip' title='NetworkSendRate|NetworkRecvRate'>" + fmoney(perfRow["networkSendRate"] / (1024 * 1024), 1) + " MB/s" + " | " + fmoney(perfRow["networkRecvRate"] / (1024 * 1024), 1) + " MB/s" + "</span></a>");
        divNode.append("<a class='btn btn-xs'> Job&Task : <span class='badge' data-toggle='tooltip' title='RunningJobs(QueuedJobs) | RunningTasks(QueuedTasks) '>" + Number(perfRow["runningJobs"]) + " (" + Number(perfRow["queuedJobs"]) + ") | " + Number(perfRow["runningTasks"]) + " (" + Number(perfRow["queuedTasks"]) + ")</span></a>");
        divNode.append("<a class='btn btn-xs'> Worker : <span class='badge' data-toggle='tooltip' title='Workers|Executors|JobLoad'>" + Number(perfRow["workerNum"]) + " | " + Number(perfRow["executorNum"]) + " | " + Number(perfRow["jobLoad"]) +  "</span></a>");

    }
}

function bytesToSize(bytes) {
    if (bytes === 0) return '0 MB';
    var k = 1024;
    return fmoney(bytes / Math.pow(k, 2), 1) + ' MB';
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

function refreshVariables() {
    var executor = new CodeExecutor(nodeUrl);
    executor.run("objs(true)", function (re) {
        var rowJson = VectorArray2Table(re.object[0].value);
        // console.log('=========');
        // console.log(re);
        // console.log(re.object);
        // console.log(re.object[0]);
        // console.log(re.object[0].value);
        // console.log(rowJson);
        bindVariables(rowJson);
    });
}

$('#btn_refresh').click(function () {
    refreshVariables();
});

function bindVariables(datalist) {
    var localvariable = [];

    var list = datalist.filter(function (x) { return x.form === 'TABLE' && x.shared === 0; });
    localvariable.push(buildNode(list, "Table"));

    list = datalist.filter(function (x) { return x.form === 'VECTOR' && x.shared === 0; });
    localvariable.push(buildNode(list, "Vector"));

    list = datalist.filter(function (x) { return x.form === 'MATRIX' && x.shared === 0; });
    localvariable.push(buildNode(list, "Matrix"));

    list = datalist.filter(function (x) { return x.form === 'SET' && x.shared === 0; });
    localvariable.push(buildNode(list, "Set"));

    list = datalist.filter(function (x) { return x.form === 'DICTIONARY' && x.shared === 0; });
    localvariable.push(buildNode(list, "Dictionary"));

    list = datalist.filter(function (x) { return (x.form === 'SCALAR' || x.form === "PAIR") && x.shared === 0; });
    localvariable.push(buildNode(list, "Scalar/Pair"));

    var sharedtable = [];
    list = datalist.filter(function (x) { return x.form === 'TABLE' && x.shared === 1; });
    sharedtable.push(buildNode(list, "Table"));

    var json_tree = {
        'core': {
            'dblclick_toggle': true,
            'data': [{
                "text": "Variables",
                "state": { "opened": true },
                "icon": "jstree-folder",
                "children": [{
                    "text": "Local variables",
                    "state": { "opened": true },
                    "icon": "jstree-folder",
                    "children": localvariable
                },
                {
                    "text": "Shared tables",
                    "state": { "opened": false },
                    "icon": "jstree-folder",
                    "children": sharedtable
                }
                ]
            }]
        }
    };
    localStorage.divid = 0;
    $('#pnl_variables').data('jstree', false).empty();
    $('#pnl_variables')
        .jstree(json_tree)
        .unbind('dblclick.jstree')
        .bind('dblclick.jstree', function (e) {
            //get server object value
            var so_form = e.target.attributes.form.value;
            var so_name = e.target.attributes.name.value;
            var so_type = e.target.attributes.type.value;
            var so_rows = e.target.attributes.rows.value;
            var so_columns = e.target.attributes.columns.value;
            var so_bytes = e.target.attributes.bytes.value;
            var so_shared = e.target.attributes.shared.value;
            var so_extra = e.target.attributes.extra.value;


            if (so_form === "SCALAR" || so_form === "PAIR") return;

            var code = so_name + ';';
            var divid = localStorage.divid++;
            var divobj = document.createElement("div");
            divobj.id = "div" + divid;
            $(divobj).appendTo($('#dialogs'));
            var tblobj = document.createElement("div");
            tblobj.id = "jsgrid_" + divid;
            $(tblobj).appendTo($(divobj));
            var tablesize = so_rows;
            if (so_form === "TABLE") {
                if (so_extra.startWith("dfs://")) {
                    new DolphinDialog("dfstable_" + so_name, { title: "Dfs Table Browser [" + so_extra + "]", width: 1000 }).openSingleWindow("dialogs/dfsTable.html?site=" + $.getUrlParam('site') + "&db=" + so_extra + "&tb=" + so_name);
                    return;
                }

                if (tablesize === "0") {
                    if ($('#retrieve-row-number').val() === "")
                        tablesize = 0;
                    else
                        tablesize = parseInt($('#retrieve-row-number').val(), 10);
                }

                new DolphinDialog(divobj.id, { title: '[' + so_form + ']' + so_name }).openSingleWindow("dialogs/table.html?site=" + $.getUrlParam('site') + "&tb=" + so_name + "&size=" + tablesize);
            } else {
                getData(code, 0, PAGESIZE, function (g) {
                    if (g.resultCode === "0") {
                        //showGrid(tblobj.id, code, g);
                        new DolphinDialog(divobj.id, { title: '[' + so_form + ']' + so_name }).openUrl("dialogs/vector.html?site=" + $.getUrlParam('site') + "&v=" + so_name + "&size=" + tablesize);
                        //openDialog(divobj.id, '[' + so_form + ']' + so_name);
                    } else {
                        appendError(g.msg);
                        $('#resulttab a[href="#log"]').tab('show');
                    }
                }, function (err) {
                    console.log(err);
                });
            }
        });
}

//
function showTableGrid(gridid, tablename, totalcount, g) {
    // In variable panel
    var d = DolphinResult2Grid(g);
    grid = $('#' + gridid);
    var dg = new DolphinGrid(grid, {
        height: 600,
        autoload: true,
        controller: {
            loadData: function (filter) {
                var deferred = $.Deferred();
                //var script = "select top " + (totalcount > 1024 ? 1024 : totalcount) + " * from " + tablename;
                var script = tablename + "[0:" + totalcount + "]";
                getData(script, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize, function (g) {
                    var d = DolphinResult2Grid(g, filter.pageIndex - 1);
                    deferred.resolve({ data: d, itemsCount: totalcount });
                }, function (e) {
                    appendlog(e);
                });

                return deferred.promise();
            }
        },
    });

    dg.setGridPage(g);
    var resObj = g && g.object[0];
    var cols = undefined;
    if (d.length >= 0)
        cols = dg.loadCols(resObj);
    if (dg.loadFromJson(d, resObj.form === "vector", cols)) {
        var btnPlot = $('<button />', {
            class: 'btn btn-primary btn-request',
            id: 'btn-plot-' + gridid,
            text: 'Plot'
        }).appendTo(grid);

        if (resObj.form) {
            if (resObj.form === "table" ||
                (resObj.form === "matrix" && !CustomVis.isNonNumeralType(resObj.type))) {
                btnPlot.click(function () {
                    getData(tablename, 0, resObj.size, function (fullData) {
                        var fullResObj = fullData.object[0];

                        new CustomVis(fullResObj, tablename);
                        var customVis = $('#custom-vis');
                        customVis.dialog('option', 'width', Math.max($(window).width() - 200, 600));
                        customVis.dialog('open');
                    }, function (err) {
                        console.error(err);
                    });
                });
            }
        }
    }
}

function showGrid(gridid, getdatascript, g) {
    // In variable panel
    var d = DolphinResult2Grid(g);
    grid = $('#' + gridid);

    var dg = new DolphinGrid(grid, {
        autoload: true,
        controller: {
            loadData: function (filter) {
                var deferred = $.Deferred();
                getData(getdatascript, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize, function (g) {
                    var total = g.object[0].size;
                    var d = DolphinResult2Grid(g, filter.pageIndex - 1);

                    deferred.resolve({ data: d, itemsCount: total });
                });

                return deferred.promise();
            }
        },
    });

    dg.setGridPage(g);
    var resObj = g && g.object[0];
    var cols = undefined;
    if (d.length >= 0)
        cols = dg.loadCols(resObj);
    if (dg.loadFromJson(d, resObj.form === "vector", cols)) {

    }
}

function showResult(gridid, resobj) {
    // In data browser
    var d = DolphinResult2Grid(resobj),
        btnPlot = $('#btn-plot');
    var h = $(window).height() - $("#resulttab").offset().top - 200;

    var grid = $('#' + gridid);
    var dg = new DolphinGrid(grid, {
        pageSize: 50,
        paging: true,
        height: h,
        sorting: false,
        pagerContainer: $("#jsgridpager"),
        autoload: true,
        pageLoading: true,
        controller: {
            loadData: function (filter) {
                var start = (filter.pageIndex - 1) * filter.pageSize;
                var end = (start + filter.pageSize > d.length) ? d.length : start + filter.pageSize;
                return { data: d.slice(start, end), itemsCount: d.length }
            }
        },
    });

    $("#btn-download").hide();
    btnPlot.hide();
    var res = resobj.object && resobj.object[0];
    var cols = undefined;
    if (d.length >= 0 && res.form === "table")
        cols = dg.loadCols(res);
    if (dg.loadFromJson(d, res.form === "vector", cols)) {
        if (res && res.form) {
            if (res.form === "table" ||
                (res.form === "matrix" && !CustomVis.isNonNumeralType(res.type))) {
                customVis = new CustomVis(res);
                btnPlot.show();
            }
        }
    }
}

function showPlot(gridid, resobj) {

    var chartObj = resobj.object[0],
        grid = $('#' + gridid);

    DolphinPlot(chartObj, grid);
}

function openDialog(dialog, tit) {
    $("#" + dialog).dialog({
        width: 800,
        height: 600,
        position: { my: "center", at: "center", of: window },
        title: tit,

    });
}

function buildNode(jsonLst, dataform) {
    var t = [];
    jsonLst.forEach(function (obj, index, arr) {
        var showtype = " ";
        if (obj.form.toUpperCase() !== "TABLE") {
            showtype = "&lt;" + obj.type + "&gt;";
        }

        var node = { "a_attr": obj, "li_attr": obj, "id": obj.name, "icon": "jstree-file" };
        if (obj.form === "SCALAR" || obj.form === "PAIR") {
            node.text = obj.name + showtype;
            var scriptExecutor = new DatanodeServer(nodeUrl);
            var dolphindbObj = new DolphinEntity(scriptExecutor.runSync(obj.name));
            node.text = node.text + " : " + dolphindbObj.toScalar();
        }
        else {
            node.text = obj.name + showtype + obj.rows + " rows [" + (Number(obj.bytes) / 1024).toFixed(0) + "k]";
        }
        t.push(node);
    });
    var subtree = {
        "text": dataform,
        "icon": "jstree-folder",
        "children": t
    }
    return subtree;
}

$('#retrieve-row-number').keypress(function (e) {
    if (e.key === "Enter") {
        $('#btn_execode').click();
        return false;
    }
})

$('#retrieve-decimal-place').keypress(function (e) {
    if (e.key === "Enter") {
        $('#btn_execode').click();
        return false;
    }
})

$('#btn_execode').click(function () {
    var codestr = editor.getSelection() || editor.getValue();

    var logstr = HtmlEncode(codestr);

    codestr = encodeURIComponent(codestr);

    var retrieveRowNumber = parseInt($('#retrieve-row-number').val(), 10);
    
    var precision = $('#retrieve-decimal-place').val() === "" ? 6 : $('#retrieve-decimal-place').val();

    var showData = function (result) {
        if (result.resultCode === "0") {
            var res = result.object[0];
            if (res) {
                if (res.form === "chart") {
                    showPlot('jsgrid1', result);
                    $('#resulttab a[href="#DataWindow"]').tab('show');
                } else if (res.form === "scalar"|| res.form === "pair") {
                    logstr = '<span style="color: #999">Input: </span>' +
                    (logstr.indexOf('\n') !== -1 ? '\n' : '') // Contains newline
                    +
                    logstr +
                    '\n<span style="color: #999">Output: </span>';
                    if (res.type === 'double') {
                        if(res.form === 'scalar') {
                            logstr += parseFloat(parseFloat(res.value).toFixed(precision));
                        } else {
                            for (var i = 0; i < res.value.length; i++) {
                                res.value[i] = parseFloat(res.value[i].toFixed(precision));
                            }
                            logstr += res.value;                           
                        }
                    } else {
                        logstr += res.value;
                    }
                    $('#resulttab a[href="#log"]').tab('show');
                } else {
                    if (res.form === 'table' || res.form === 'dictionary') {
                        for(var i = 0; i < res.value.length; i++) {
                            if(res.value[i].type === 'double') {
                                for (var j = 0; j < res.value[i].value.length; j++) {
                                    res.value[i].value[j] = parseFloat(res.value[i].value[j].toFixed(precision));
                                }
                            }
                        }
                    } else if (res.form === 'vector' || res.form === 'set') {
                        if (res.type === 'double') {
                            for (var i = 0; i < res.value.length; i++) {
                                res.value[i] = parseFloat(res.value[i].toFixed(precision));
                            }
                        }
                    } else if (res.form === 'matrix') {
                        if (res.type == 'double') {
                            for (var i = 0; i < res.value[0].value.length; i++) {
                                res.value[0].value[i] = parseFloat(res.value[0].value[i].toFixed(precision));
                            }
                        }
                    }
                    showResult('jsgrid1', result);
                    $('#resulttab a[href="#DataWindow"]').tab('show');
                }
            } else
                $('#resulttab a[href="#log"]').tab('show');
        } else {
            logstr = '<span style="color: #999">Input: </span>' + logstr + '\n<span style="color: red">Error Message: </span>' + result.msg;
            $('#resulttab a[href="#log"]').tab('show');
        }
        refreshVariables();

        appendlog(logstr);
    }
    if (isNaN(retrieveRowNumber) || retrieveRowNumber <= 0)
        getData(codestr, undefined, undefined, showData, function (err) { console.error(err); });
    else
        getData(codestr, 0, retrieveRowNumber, showData, function (err) { console.error(err); });
});

$("#btn_access").click(function() {
    window.open("accessSetup.html", "accessSetup");
});

$("#btnOpenFunctionView").bind("click", function (e) {
    window.open("functionView.html", "functionView");
});

function getData(script, startindex, pagesize, sucfunc, errfunc) {
    var p = {
        "sessionID": "0",
        "functionName": "executeCode",
        "params": [{
            "name": "script",
            "form": "scalar",
            "type": "string",
            "value": script
        }]
    };

    if (typeof startindex !== "undefined")
        p.offset = startindex.toString();
    if (typeof pagesize !== "undefined")
        p.length = pagesize.toString();

    var btnRequests = $('.btn-request');
    btnRequests.attr('disabled', true);

    CallWebApi(nodeUrl, p, function (re) {
        btnRequests.attr('disabled', false);
        sucfunc(re);
    }, function (err) {
        btnRequests.attr('disabled', false);
        errfunc(err);
    });
}

$('#btn_clear').click(function () {
    $('#pnl_log').html('');
    localStorage.setItem(logStorageID, '');
});

function appendlog(logstr) {
    logstr = new Date().toLocaleString() + ":<pre>" + logstr + "</pre>";
    $('#pnl_log').prepend(logstr);
    localStorage.setItem(logStorageID, $('#pnl_log').html());
}

function appendError(logstr) {
    var err = "<span style='color: red'>Error Message: </span>";
    logstr = new Date().toLocaleString() + ":<pre>" + err + logstr + "</pre>";
    $('#pnl_log').prepend(logstr);
    localStorage.setItem(logStorageID, $('#pnl_log').html());
}
function writelog(logstr) {
    $('#pnl_log').html(logstr)
}

$('#btn_clrcode').click(function () {
    editor.setValue('');
});