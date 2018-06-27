var editor = null;
var controllerUrl ='';
var nodeUrl = '';
var HOST = '';
var PORT = '';
var logStorageID = '';

var PAGESIZE = 20;
var nodeManager = null;

$(function() {
    nodeUrl = GetFullUrl(window.location.host);
    nodeManager =  new ClusterNodeManager();    
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

    var mime = 'text/x-mariadb';
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
    writelog(localStorage.getItem(logStorageID));

    refreshVariables();

    var ALIAS  = $.getUrlParam('alias');
    if (ALIAS)
        document.title = ALIAS;
});

function refreshVariables() {
    var executor = new CodeExecutor(nodeUrl);
    executor.run("objs(true)", function(re) {
        var rowJson = VectorArray2Table(re.object[0].value);
        bindVariables(rowJson);
    });
}

$('#btn_refresh').click(function() {
    refreshVariables();
});

function bindVariables(datalist) {
    var localvariable = [];

    var list = datalist.filter(function(x) { return x.form === 'TABLE' && x.shared === 0; });
    localvariable.push(buildNode(list, "Table"));

    list = datalist.filter(function(x) { return x.form === 'VECTOR' && x.shared === 0; });
    localvariable.push(buildNode(list, "Vector"));

    list = datalist.filter(function(x) { return x.form === 'MATRIX' && x.shared === 0; });
    localvariable.push(buildNode(list, "Matrix"));

    list = datalist.filter(function(x) { return x.form === 'SET' && x.shared === 0; });
    localvariable.push(buildNode(list, "Set"));

    list = datalist.filter(function(x) { return x.form === 'DICTIONARY' && x.shared === 0; });
    localvariable.push(buildNode(list, "Dictionary"));

    list = datalist.filter(function (x) { return (x.form === 'SCALAR' || x.form === "PAIR") && x.shared === 0; });
    localvariable.push(buildNode(list, "Scalar/Pair"));

    var sharedtable = [];
    list = datalist.filter(function(x) { return x.form === 'TABLE' && x.shared === 1; });
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

            
            if (so_form === "SCALAR") return;

            var code = so_name + ';';
            var divid = localStorage.divid++;
            var divobj = document.createElement("div");
            divobj.id = "div" + divid;
            $(divobj).appendTo($('#dialogs'));
            var tblobj = document.createElement("div");
            tblobj.id = "jsgrid_" + divid;
            $(tblobj).appendTo($(divobj));

            if (so_form === "TABLE") {
                if (so_extra.startWith("dfs://")) {
                    new DolphinDialog("dfstable_" + so_name, { title: "Dfs Table Browser [" + so_extra + "]",width:1000 }).openSingleWindow("dialogs/dfsTable.html?site=" + $.getUrlParam('site') +"&db=" + so_extra + "&tb=" + so_name);
                    return;
                }
                var tablesize = so_rows;
                if(tablesize === "0"){
                    if($('#retrieve-row-number').val()==="")
                        tablesize = 0;
                    else
                        tablesize = parseInt($('#retrieve-row-number').val(), 10);
                }
                //var script = "select top " + (tablesize > 1024 ? 1024 : tablesize) + " * from " + contentid;
                new DolphinDialog(divobj.id, { title: '[' + so_form + ']' + so_name }).openSingleWindow("dialogs/table.html?site=" + $.getUrlParam('site') + "&tb=" + so_name + "&size=" + tablesize);
                /*
                var script = so_name + "[0:" + tablesize + "]";
                getData(script, 0, PAGESIZE, function(g) {
                    if(g.resultCode==="0"){
                        //showTableGrid(tblobj.id, so_name, tablesize, g);
                        new DolphinDialog(divobj.id, { title: '[' + so_form + ']' + so_name }).openSingleWindow("dialogs/table.html?site=" + $.getUrlParam('site') + "&tb=" + so_name + "&size=" + tablesize);
                    }else{
                        appendError(g.msg);
                        $('#resulttab a[href="#log"]').tab('show');
                    }
                }, function(err) {
                    appendlog(err);
                 });
                 */
            } else {
                getData(code, 0, PAGESIZE, function(g) {
                    if(g.resultCode==="0"){
                        //showGrid(tblobj.id, code, g);
                        new DolphinDialog(divobj.id, { title: '[' + so_form + ']' + so_name }).openUrl("dialogs/vector.html?site=" + $.getUrlParam('site') + "&v=" + so_name + "&size=" + tablesize);
                        //openDialog(divobj.id, '[' + so_form + ']' + so_name);
                    }else{
                        appendError(g.msg);
                        $('#resulttab a[href="#log"]').tab('show');
                    }
                }, function(err) {
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
            loadData: function(filter) {
                var deferred = $.Deferred();
                //var script = "select top " + (totalcount > 1024 ? 1024 : totalcount) + " * from " + tablename;
                var script = tablename + "[0:" + totalcount + "]";
                getData(script, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize, function(g) {
                    var d = DolphinResult2Grid(g, filter.pageIndex - 1);
                    deferred.resolve({ data: d, itemsCount: totalcount });
                },function(e){
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
                btnPlot.click(function() {
                    getData(tablename, 0, resObj.size, function(fullData) {
                        var fullResObj = fullData.object[0];

                        new CustomVis(fullResObj, tablename);
                        var customVis = $('#custom-vis');
                        customVis.dialog('option', 'width', Math.max($(window).width() - 200, 600));
                        customVis.dialog('open');
                    }, function(err) {
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
            loadData: function(filter) {
                var deferred = $.Deferred();
                getData(getdatascript, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize, function(g) {
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
    var h = $(window).height() - $("#resulttab").offset().top-200;
    
    var grid = $('#' + gridid);
    var dg = new DolphinGrid(grid, {
        pageSize: 50,
        paging:true,
        height:h,
        sorting: true,
        pagerContainer:$("#jsgridpager"),
        autoload: true,
        pageLoading:true,
        controller: {
            loadData: function (filter) {
                console.log("filter",filter);
                var start = (filter.pageIndex - 1) * filter.pageSize;
                var end = (start + filter.pageSize > d.length)?d.length:start + filter.pageSize;
                console.log("d.slice",d.slice(start,end));
                return {data: d.slice(start,end),itemsCount: d.length}
            }
        },
    });

    $("#btn-download").hide();
    btnPlot.hide();
    var res = resobj.object && resobj.object[0];
    var cols = undefined;
    if (d.length >= 0)
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
    jsonLst.forEach(function(obj, index, arr) {
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

$('#retrieve-row-number').keypress(function(e) {
    if (e.key === "Enter") {
        $('#btn_execode').click();
        return false;
    }
})


$('#btn_execode').click(function() {
    var codestr = editor.getSelection() || editor.getValue();

    var logstr = codestr;

    codestr = encodeURIComponent(codestr);

    var retrieveRowNumber = parseInt($('#retrieve-row-number').val(), 10);

    var showData = function(result) {
        if (result.resultCode === "0") {
            var res = result.object[0];
            if (res) {
                if (res.form === "chart") {
                    showPlot('jsgrid1', result);
                    $('#resulttab a[href="#DataWindow"]').tab('show');
                } else if (res.form === "scalar" || res.form === "pair") {
                    logstr = '<span style="color: #999">Input: </span>' +
                        (logstr.indexOf('\n') !== -1 ? '\n' : '') // Contains newline
                        +
                        logstr +
                        '\n<span style="color: #999">Output: </span>' +
                        res.value;
                    $('#resulttab a[href="#log"]').tab('show');
                } else {
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
        getData(codestr, undefined, undefined, showData, function(err) { console.error(err); });
    else
        getData(codestr, 0, retrieveRowNumber, showData, function(err) { console.error(err); });
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

    CallWebApi(nodeUrl, p, function(re) {
        btnRequests.attr('disabled', false);
        sucfunc(re);
    }, function(err) {
        btnRequests.attr('disabled', false);
        errfunc(err);
    });
}

$('#btn_clear').click(function() {
    $('#pnl_log').html('');
    localStorage.setItem(logStorageID, '');
});

function appendlog(logstr) {
    logstr = new Date().toLocaleString() + ":<pre>" + logstr + "</pre>";
    $('#pnl_log').prepend(logstr);
    localStorage.setItem(logStorageID, $('#pnl_log').html());
}

function appendError(logstr){
    var err = "<span style='color: red'>Error Message: </span>";
    logstr = new Date().toLocaleString() + ":<pre>" + err + logstr + "</pre>";
    $('#pnl_log').prepend(logstr);
    localStorage.setItem(logStorageID, $('#pnl_log').html());
}
function writelog(logstr) {
    $('#pnl_log').html(logstr)
}

$('#btn_clrcode').click(function() {
    editor.setValue('');
});