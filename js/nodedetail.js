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
    if(siteid ==""){
        wa_url = "http://" + window.location.host;
    }
    

    $.cookie("language_file", "js/lang.en.js");

    //$('#agent_controller_url').text($.cookie('ck_ag_controller_url'));

    editor = CodeMirror.fromTextArea('txt_code', {
        height: "50px",
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

    $('#pnl_variables').data('jstree', false).empty();
    $('#pnl_variables')
        .jstree(json_tree)
        .bind('dblclick.jstree', function (e) {
            var contentid = e.target.parentNode.id;
            var executor = new CodeExecutor(wa_url);
            executor.run(contentid + ';', function (re) {
                //var grid = document.querySelector('table[grid-manager="gridview"]');
                var grid = $('#jsgrid2');
                var dg = new DolphinGrid(grid);
                dg.loadFromDolphinJson(re);
                $("#dialog").dialog({
                    width:800,
                    height:600,
                    position :{ my: "center", at: "center", of: window },
                    title : re.object[0].name + ' [ ' + re.object[0].DF + ' ] ',
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
        var showtype = " ";
        if(obj.form.toUpperCase()!="TABLE") {
            showtype = "&lt;" + obj.type + "&gt;";
        }
            
        t.push({ "a_attr": obj.name, "id": obj.name, "text": obj.name + showtype + obj.rows + " rows [" + (Number(obj.bytes) / 1024).toFixed(0) + "k]", "icon": "jstree-file" });
        //t.push({ "text": obj.name + "&lt;" + obj.type + "&gt;" + obj.rows + " rows [" + (Number(obj.bytes) / 1024).toFixed(0) + "k]", "icon": "jstree-file" });
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
    var executor = new CodeExecutor(wa_url);
    
    executor.run(codestr, function (re) {
        if (isArray(re.object) && re.object.length > 0) {
            var dg = new DolphinGrid(grid,{height: "300"});
            dg.loadFromDolphinJson(re);
            //writetolog(JSON.stringify(re.object));
            $('#resulttab a[href="#DataWindow"]').tab('show');
        }
        refreshVariables();
    })

});

$('#btn_clear').click(function () {
    $('#pnl_log').html('');
    localStorage.executelog = '';
});

function appendlog(logstr){
    logstr = new Date().toLocaleString() + ":<pre>" + logstr + "</pre>";
    $('#pnl_log').append('\n' + logstr)
    localStorage.executelog = $('#pnl_log').html();
}

function writelog(logstr){
    $('#pnl_log').html(logstr)
}
// function WebApiUrl() {
//     if ($.cookie('ck_ag_controller_url') != null) {
//         return "http://" + $.cookie('ck_ag_controller_url');
//     }
// }

