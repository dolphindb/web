var editor = null;
var wa_url = '';
var HOST = '';
var PORT = '';
var logStorageID = '';
$(function() {

    var siteid = $.getUrlParam('site');

    if (!siteid || siteid == "") {
        wa_url = "http://" + window.location.host;
    } else {
        var hostinfo = siteid.split(':');
        HOST = hostinfo[0];
        PORT = hostinfo[1];
        wa_url = "http://" + HOST + ":" + PORT + "/";
    }

    logStorageID = "executelog" + siteid;

    $.cookie("language_file", "js/lang.en.js");

    editor = CodeMirror.fromTextArea('txt_code', {
        height: "100px",
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
                "text": "variables",
                "state": { "opened": true },
                "icon": "jstree-folder",
                "children": [{
                        "text": "local variables",
                        "state": { "opened": true },
                        "icon": "jstree-folder",
                        "children": localvariable
                    },
                    {
                        "text": "shared tables",
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
            //get variables code "variablename;"
            var code = contentid + ';';
            var divid = localStorage.divid++;
            var divobj = document.createElement("div");
            divobj.id = "div" + divid;
            $(divobj).appendTo($('#dialogs'));
            var tblobj = document.createElement("div");
            tblobj.id = "jsgrid_" + divid;
            $(tblobj).appendTo($(divobj));
            var g = getData(code, 0, 20);
            showGrid(tblobj.id, code, g);
            openDialog(divobj.id, '[' + dataform + ']' + contentid);
        });
}


function showGrid(gridid, getdatascript, g) {
    var d = DolphinResult2Grid(g),
        grid = $('#' + gridid);

    var res = null;

    var dg = new DolphinGrid(grid, {
        pageSize: 10,
        autoload: true,
        controller: {
            loadData: function(filter) {
                var g = getData(getdatascript, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize);
                res = g;
                var total = g.object[0].size;
                var d = DolphinResult2Grid(g);

                return {
                    data: d,
                    itemsCount: total
                };
            }
        }
    });

    //btnDownload.hide();
    //btnPlot.hide();
    dg.setGridPage(g);
    if (dg.loadFromJson(d)) {
        var btnPlot = $('<button />', {
            class: 'btn btn-primary',
            id: 'btn-plot-' + gridid,
            text: 'Plot'
        }).appendTo(grid);

        var resObj = res && res.object[0];
        if (resObj.form) {
            if (resObj.form === "table" ||
                (resObj.form === "matrix" && !CustomVis.isNonNumeralType(resObj.type))) {
                btnPlot.click(function() {
                    var fullData = getData(getdatascript, 0, resObj.size);    // TODO customized size
                    var fullResObj = fullData.object[0];

                    new CustomVis(fullResObj);
                    var customVis = $('#custom-vis');
                    customVis.dialog('option', 'width', Math.max($(window).width() - 200, 600));
                    customVis.dialog('open');
                });

                btnPlot.show();
            }
        }
    }
}

function showResult(gridid, resobj) {
    var d = DolphinResult2Grid(resobj),
        btnPlot = $('#btn-plot');

    var grid = $('#' + gridid);
    var dg = new DolphinGrid(grid, {
        pageSize: 10,
        sorting: true,
        paging: true,
        pageLoading: false,
        autoload: false
    });

    $("#btn-download").hide();
    btnPlot.hide();
    if (dg.loadFromJson(d)) {
        var res = resobj.object && resobj.object[0];
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
        if (obj.form.toUpperCase() != "TABLE") {
            showtype = "&lt;" + obj.type + "&gt;";
        }

        t.push({ "a_attr": obj.name, "id": obj.name, "text": obj.name + showtype + obj.rows + " rows [" + (Number(obj.bytes) / 1024).toFixed(0) + "k]", "icon": "jstree-file" });
    });
    var subtree = {
        "text": dataform,
        "icon": "jstree-folder",
        "children": t
    }
    return subtree;
}


$('#btn_execode').click(function() {
    var codestr = editor.getCode();

    appendlog(codestr);

    codestr = encodeURIComponent(codestr);

    var retrieveRowNumber = parseInt($('#retrieve-row-number').val(), 10);
    result = null;
    if (isNaN(retrieveRowNumber) || retrieveRowNumber <= 0)
        result = getData(codestr);
    else
        result = getData(codestr, 0, retrieveRowNumber);

    if (result.object.length > 0) {
        if (result.object[0].form === "chart")
            showPlot('jsgrid1', result);
        else
            showResult('jsgrid1', result);

        $('#resulttab a[href="#DataWindow"]').tab('show');
    }
    refreshVariables();

});

function getData(script, startindex, pagesize) {
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

    var re = CallWebApiSync(wa_url, p);
    return re;
}

$('#btn_clear').click(function() {
    $('#pnl_log').html('');
    localStorage.setItem(logStorageID, '');
});

function appendlog(logstr) {
    logstr = new Date().toLocaleString() + ":<pre>" + logstr + "</pre>";
    $('#pnl_log').append('\n' + logstr)
    localStorage.setItem(logStorageID, $('#pnl_log').html());
}

function writelog(logstr) {
    $('#pnl_log').html(logstr)
}

$('#btn_clrcode').click(function() {
    editor.setCode('');
});