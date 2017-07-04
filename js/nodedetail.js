//page load
var editor = null;
var wa_url = '';
var HOST = '';
var PORT = '';

$(function () {

    var siteid = $.getUrlParam('site');
    var hostinfo = siteid.split(':');
    HOST = hostinfo[0];
    PORT = hostinfo[1];

    wa_url = "http://" + HOST + ":" + PORT + "/";
    if (!siteid || siteid == "") {
        wa_url = "http://" + window.location.host;
    }


    $.cookie("language_file", "js/lang.en.js");

    //$('#agent_controller_url').text($.cookie('ck_ag_controller_url'));

    editor = CodeMirror.fromTextArea('txt_code', {
        height: "100px",
        parserfile: "parsesql.js",
        stylesheet: "third-party/codemirror/sqlcolors.css",
        path: "third-party/codemirror/",
        textWrapping: false
    });
    writelog(localStorage.executelog);
    //get server variables
    refreshVariables();
});

function refreshVariables() {
    var executor = new CodeExecutor(wa_url);
    executor.run("objs(true)", function (re) {
        var rowJson = VectorArray2Table(re.object[0].value);
        console.log(rowJson);
        bindVariables(rowJson)
    });
}

$('#btn_refresh').click(function () {
    refreshVariables();
});

function bindVariables(datalist) {
    var localvariable = [];
    //TABLE
    var list = Enumerable.from(datalist).where("x=>(x.form=='TABLE' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Table"));
    //VECTOR
    list = Enumerable.from(datalist).where("x=>(x.form=='VECTOR' && x.shared==0)").toArray();
    var tmp = buildNode(list, "Vector");
    localvariable.push(buildNode(list, "Vector"));
    //METRIX
    list = Enumerable.from(datalist).where("x=>(x.form=='MATRIX' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Matrix"));
    //SET
    list = Enumerable.from(datalist).where("x=>(x.form=='SET' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Set"));
    //DICTIONARY
    list = Enumerable.from(datalist).where("x=>(x.form=='DICTIONARY' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Dictionary"));
    //SCALAR
    list = Enumerable.from(datalist).where("x=>(x.form=='SCALAR' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Scalar"));

    var sharedtable = [];
    list = Enumerable.from(datalist).where("x=>(x.form=='TABLE' && x.shared==1)").toArray();
    sharedtable.push(buildNode(list, "Table"));



    var json_tree = {
        'core': {
            'dblclick_toggle': true,
            'data': [
                {
                    "text": "variables",
                    "state": { "opened": true },
                    "icon": "jstree-folder",
                    "children": [
                        {
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
                }
            ]
        }
    };
    localStorage.divid = 0;
    $('#pnl_variables').data('jstree', false).empty();
    $('#pnl_variables')
        .jstree(json_tree)
        .unbind('dblclick.jstree')
        .bind('dblclick.jstree', function (e) {
            console.log("comin");
            var contentid = e.target.parentNode.id;
            var code = contentid + ';';
            var divid = localStorage.divid++;
            var divobj = document.createElement("div");
            divobj.id = "div" + divid;
            console.log(divobj.id);
            $(divobj).appendTo($('#dialogs'));
            var tblobj = document.createElement("div");
            tblobj.id = "jsgrid_" + divid;
            console.log(tblobj.id);
            $(tblobj).appendTo($(divobj));
            showGrid(tblobj.id, code, 0, 20);
            openDialog(divobj.id);
        });
}


function showGrid(gridid, getdatascript, startindex, pagesize) {

    var executor = new CodeExecutor(wa_url);
    executor.run(getdatascript, function (re) {
        var grid = $('#' + gridid);
        var dg = new DolphinGrid(grid, {
            controller: {
                loadData: function (filter) {
                    var g = getData(getdatascript, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize);
                    var total = g.object[0].size;
                    var d = DolphinResult2Grid(g);
                    return {
                        data: d,
                        itemsCount: total
                    };
                }
            }
        });
        dg.loadFromDolphinJson(re);
    }, { "startindex": startindex, "pagesize": pagesize });
}

function openDialog(dialog, tit) {


    $("#" + dialog).dialog({
        width: 800,
        height: 600,
        position: { my: "center", at: "center", of: window },
        title: tit,
        dialogClass: "no-close",
        buttons: [
            {
                text: "OK",
                click: function () {
                    $(this).dialog("close");
                }
            }
        ]
    });
}
function buildNode(jsonLst, dataform) {
    var t = [];
    jsonLst.forEach(function (obj, index, arr) {
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


$('#btn_execode').click(function () {
    var codestr = editor.getCode();
    appendlog(codestr);
    codestr = encodeURIComponent(codestr);
    var grid = $('#jsgrid1');
    var dg = new DolphinGrid(grid,
        {
            height: "370px",
            pagesize:10,
            controller: {
                loadData: function (filter) {
                    var g = getData(codestr, (filter.pageIndex - 1) * filter.pageSize, filter.pageSize);
                    var total = g.object[0].size;
                    var d = DolphinResult2Grid(g);

                    return {
                        data: d,
                        itemsCount: total
                    };
                }
            }

        });
    var g = getData(codestr, 0, 10);
    var d = DolphinResult2Grid(g);
    dg.loadFromJson(d);

    $('#resulttab a[href="#DataWindow"]').tab('show');

    refreshVariables();


});

function getData(script, startindex, pagesize) {
    var p = {
        "sessionid": "0",
        "functionname": "executeCode",
        "startindex": startindex.toString(),
        "pagesize": pagesize.toString(),
        "parameters": [{
            "name": "script",
            "DF": "scalar",
            "DT": "string",
            "value": script
        }]
    };
    var re = CallWebApiSync(wa_url, p);
    return re;
}

$('#btn_clear').click(function () {
    $('#pnl_log').html('');
    localStorage.executelog = '';
});

function appendlog(logstr) {
    logstr = new Date().toLocaleString() + ":<pre>" + logstr + "</pre>";
    $('#pnl_log').append('\n' + logstr)
    localStorage.executelog = $('#pnl_log').html();
}

function writelog(logstr) {
    $('#pnl_log').html(logstr)
}

