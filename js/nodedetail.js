//page load
var editor = null;
var wa_url = WebApiUrl();
var HOST = '';
var PORT = '';

$(function () {

    var siteid = $.getUrlParam('site');
    var hostinfo = siteid.split(':');
    HOST = hostinfo[0];
    PORT = hostinfo[1];

    wa_url = "http://" + HOST + ":" + PORT + "/";

    $.cookie("language_file", "js/lang.en.js");

    //$('#agent_controller_url').text($.cookie('ck_ag_controller_url'));

    editor = CodeMirror.fromTextArea('txt_code', {
        height: "50px",
        parserfile: "parsesql.js",
        stylesheet: "third-party/codemirror/sqlcolors.css",
        path: "third-party/codemirror/",
        textWrapping: false
    });

    //get server variables
    refreshVariables();
});

function refreshVariables() {
    var executor = new CodeExecutor(wa_url);
    executor.run("objs(true)", function (re) {
        bindVariables(VectorArray2Table(re[0].value))
    });
}
function bindVariables(datalist) {
    var localvariable = [];


    //TABLE
    var list = Enumerable.from(datalist).where("x=>(x.form=='TABLE' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Table"));
    //VECTOR
    list = Enumerable.from(datalist).where("x=>(x.form=='VECTOR' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Vector"));
    //METRIX
    list = Enumerable.from(datalist).where("x=>(x.form=='METRIX' && x.shared==0)").toArray();
    localvariable.push(buildNode(list, "Metrix"));
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

    $('#pnl_variables')
        .jstree(json_tree)
        .bind('dblclick.jstree', function (e) {
            var contentid = e.target.parentNode.id;
            var executor = new CodeExecutor(wa_url);
            executor.run(contentid, function (re) {
                var grid = document.querySelector('table[grid-manager="gridview"]');
                bindGrid(re, grid);
                $("#dialog").dialog({
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
            });
        });
}

function buildNode(jsonLst, dataform) {
    var t = [];
    jsonLst.forEach(function (obj, index, arr) {
        t.push({ "a_attr": obj.name, "id": obj.name, "text": obj.name + "&lt;" + obj.type + "&gt;" + obj.rows + " rows [" + (Number(obj.bytes) / 1024).toFixed(0) + "k]", "icon": "jstree-file" });
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
    codestr = encodeURIComponent(codestr);
    var grid = document.querySelector('table[grid-manager="grid1"]');
    var executor = new CodeExecutor(wa_url);
    executor.run(codestr, function (re) {
        bindGrid(re, grid);
        refreshVariables();
    })

});

function bindGrid(jsonarr, grid) {
    var cols = [];
    var datalist = VectorArray2Table(jsonarr[0].value);
    var griddata = {
        data: datalist,
        totals: datalist.length
    };
    for (var i = 0; i < jsonarr[0].value.length; i++) {
        obj = jsonarr[0].value[i];
        cols.push({ text: obj.name, key: obj.name });

    };
    grid.GM({
        ajax_data: griddata,
        supportAutoOrder: false,
        supportCheckbox: false,
        columnData: cols
    });

    grid.GM("refreshGrid");
};


function WebApiUrl() {
    if ($.cookie('ck_ag_controller_url') != null) {
        return "http://" + $.cookie('ck_ag_controller_url');
    }
}

