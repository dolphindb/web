var editor = null;
var wa_url = '';
var HOST = '';
var PORT = '';
var logStorageID = '';

var PAGESIZE = 20;

$(function() {

    var siteid = $.getUrlParam('site');

    if (!siteid || siteid == "") {
        wa_url = "http://" + window.location.host;
    } else {
        var hostinfo = siteid.split(':');
        HOST = hostinfo[0];
        PORT = hostinfo[1];
        ALIAS = hostinfo[2];
        wa_url = "http://" + HOST + ":" + PORT + "/";
        if (ALIAS)
            document.title = ALIAS;
    }

    if (siteid || siteid == '')
        $('#link-to-controller').attr('href', 'http://' + window.location.host);
    else
        $('#link-to-controller').attr('href', '');

    logStorageID = "executelog" + siteid;

    $.cookie("language_file", "js/lang.en.js");

    editor = CodeMirror.fromTextArea('txt_code', {
        height: "15%",
        parserfile: "parsesql.js",
        stylesheet: "third-party/codemirror/sqlcolors.css",
        path: "third-party/codemirror/",
        textWrapping: false
    });
    writelog(localStorage.getItem(logStorageID));

    refreshVariables();
});

function refreshVariables() {
    var executor = new CodeExecutor(wa_url);
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
    //TABLE
    var list = datalist.filter(function(x) { return x.form === 'TABLE' && x.shared === 0; });
    localvariable.push(buildNode(list, "Table"));
    //VECTOR
    list = datalist.filter(function(x) { return x.form === 'VECTOR' && x.shared === 0; });
    var tmp = buildNode(list, "Vector");
    localvariable.push(buildNode(list, "Vector"));
    //METRIX
    list = datalist.filter(function(x) { return x.form === 'MATRIX' && x.shared === 0; });
    localvariable.push(buildNode(list, "Matrix"));
    //SET
    list = datalist.filter(function(x) { return x.form === 'SET' && x.shared === 0; });
    localvariable.push(buildNode(list, "Set"));
    //DICTIONARY
    list = datalist.filter(function(x) { return x.form === 'DICTIONARY' && x.shared === 0; });
    localvariable.push(buildNode(list, "Dictionary"));
    //SCALAR
    list = datalist.filter(function(x) { return x.form === 'SCALAR' && x.shared === 0; });
    localvariable.push(buildNode(list, "Scalar"));

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
        .bind('dblclick.jstree', function(e) {
            var dataform = $(e.target).closest('ul').prev().text();
            var contentid = $(e.target).closest('li')[0].id;
            if (dataform == "Scalar") return;

            var code = contentid + ';';
            var divid = localStorage.divid++;
            var divobj = document.createElement("div");
            divobj.id = "div" + divid;
            $(divobj).appendTo($('#dialogs'));
            var tblobj = document.createElement("div");
            tblobj.id = "jsgrid_" + divid;
            $(tblobj).appendTo($(divobj));

            if (dataform == "Table") {
                var tablesize = $(e.target).closest('li').context.innerText.split(" ")[1];
                getShareTableData(contentid, 0, PAGESIZE, function(g) {
                    showTableGrid(tblobj.id, contentid, tablesize, g);
                    openDialog(divobj.id, '[' + dataform + ']' + contentid);
                });
            } else {
                //get variables code "variablename;"
                getData(code, 0, 20, function(g) {
                    showGrid(tblobj.id, code, g);
                    openDialog(divobj.id, '[' + dataform + ']' + contentid);
                }, function(err) {
                    console.log(err);
                });

            }
        });
}

function getShareTableData(tableName, startindex, pagesize, sucfunc, errfunc) {
    var script = tableName + '[' + startindex + ':' + (startindex + pagesize) + '];';
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

    var btnRequests = $('.btn-request');
    btnRequests.attr('disabled', true);

    CallWebApi(wa_url, p, function(re) {
        btnRequests.attr('disabled', false);
        sucfunc(re);
    }, function(err) {
        btnRequests.attr('disabled', false);
        errfunc(err);
    });
}

function showTableGrid(gridid, tablename, totalcount, g) {

    var d = DolphinResult2Grid(g);
    grid = $('#' + gridid);
    var dg = new DolphinGrid(grid, {

        autoload: true,
        controller: {
            loadData: function(filter) {
                var deferred = $.Deferred();
                console.log(filter);
                getShareTableData(tablename, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize, function(g) {
                    var d = DolphinResult2Grid(g, filter.pageIndex - 1);
                    deferred.resolve({ data: d, itemsCount: totalcount });
                });

                return deferred.promise();
            }
        },
    });

    dg.setGridPage(g);
    var resObj = g && g.object[0];
    var cols = undefined;
    if (d.length === 0)
        cols = loadCols(resObj);
    if (dg.loadFromJson(d, resObj.form === "vector", cols)) {
        var btnPlot = $('<button />', {
            class: 'btn btn-primary btn-request',
            id: 'btn-plot-' + gridid,
            text: 'Plot'
        }).appendTo(grid);

        var resObj = g && g.object[0];
        if (resObj.form) {
            if (resObj.form === "table" ||
                (resObj.form === "matrix" && !CustomVis.isNonNumeralType(resObj.type))) {
                btnPlot.click(function() {
                    getData(getdatascript, 0, resObj.size, function(fullData) {
                        var fullResObj = fullData.object[0];

                        new CustomVis(fullResObj);
                        var customVis = $('#custom-vis');
                        customVis.dialog('option', 'width', Math.max($(window).width() - 200, 600));
                        customVis.dialog('open');
                    }, function(err) {
                        console.error(err);
                    }); // TODO customized size
                });
            }
        }
    }

}

function showGrid(gridid, getdatascript, g) {
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
    if (d.length === 0)
        cols = loadCols(resObj);
    if (dg.loadFromJson(d, resObj.form === "vector", cols)) {
        var btnPlot = $('<button />', {
            class: 'btn btn-primary btn-request',
            id: 'btn-plot-' + gridid,
            text: 'Plot'
        }).appendTo(grid);

        var resObj = g && g.object[0];
        if (resObj.form) {
            if (resObj.form === "table" ||
                (resObj.form === "matrix" && !CustomVis.isNonNumeralType(resObj.type))) {
                btnPlot.click(function() {
                    getData(getdatascript, 0, resObj.size, function(fullData) {
                        var fullResObj = fullData.object[0];

                        new CustomVis(fullResObj);
                        var customVis = $('#custom-vis');
                        customVis.dialog('option', 'width', Math.max($(window).width() - 200, 600));
                        customVis.dialog('open');
                    }, function(err) {
                        console.error(err);
                    }); // TODO customized size
                });
            }
        }
    }
}

function showResult(gridid, resobj) {
    var d = DolphinResult2Grid(resobj),
        btnPlot = $('#btn-plot');

    var grid = $('#' + gridid);
    var dg = new DolphinGrid(grid, {
        pageSize: 50,
        sorting: true,
        paging: true,
        pageLoading: false,
        autoload: false
    });

    $("#btn-download").hide();
    btnPlot.hide();
    var res = resobj.object && resobj.object[0];
    var cols = undefined;
    if (d.length === 0)
        cols = loadCols(res);
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
        dialogClass: "no-close",
        buttons: [{
            text: "OK",
            click: function() {
                $(this).dialog("close");
            }
        }]
    });
}

function buildNode(jsonLst, dataform) {
    var t = [];
    jsonLst.forEach(function(obj, index, arr) {
        var showtype = " ";
        if (obj.form.toUpperCase() !== "TABLE") {
            showtype = "&lt;" + obj.type + "&gt;";
        }

        var node = { "a_attr": obj.name, "id": obj.name, "icon": "jstree-file" };
        if (obj.form === "SCALAR")
            node.text = obj.name + showtype + " [" + (Number(obj.bytes) / 1024).toFixed(0) + "k]";
        else
            node.text = obj.name + showtype + obj.rows + " rows [" + (Number(obj.bytes) / 1024).toFixed(0) + "k]";
        t.push(node);
    });
    var subtree = {
        "text": dataform,
        "icon": "jstree-folder",
        "children": t
    }
    return subtree;
}

$('#btn_execode').click(function() {
    var codestr = editor.selection() || editor.getCode();
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
                } else if (res.form === "scalar") {
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

    CallWebApi(wa_url, p, function(re) {
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
    $('#pnl_log').prepend(logstr)
    localStorage.setItem(logStorageID, $('#pnl_log').html());
}

function writelog(logstr) {
    $('#pnl_log').html(logstr)
}

$('#btn_clrcode').click(function() {
    editor.setCode('');
});