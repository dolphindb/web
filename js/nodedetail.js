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
    var re = executor.run("objs(true)");
    var rowJson = VectorArray2Table(re.object[0].value);
    console.log(rowJson);
    bindVariables(rowJson)
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
    var re = getdata(getdatascript, startindex, pagesize);
    var grid = $('#' + gridid);
    var dg = new DolphinGrid(grid, {
        controller: {
            loadData: function (filter) {
                var sIndex = (filter.pageIndex - 1) * filter.pageSize;
                var reobj = getdata(getdatascript, sIndex, filter.pageSize);
                var db = VectorArray2Table(reobj);
                return {
                    data: db,
                    itemsCount: reobj[0].size
                };
            }
        }
    });
    dg.loadFromDolphinJson(re);
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
    showGrid("jsgrid1", codestr, 0, 20);
    $('#resulttab a[href="#DataWindow"]').tab('show');
    refreshVariables();

});

function getdata(script, startindex, pagesize) {
    //  var pageIndex = (startindex / pagesize).toFixed(0);
    //  var p = {
    //             "functionname": "page" + pageIndex
    //         }
    //         var data = CallWebApiSync('http://192.168.1.25:8900/getList.asp', p);
    //         console.log(data);
    //         return data;
   

    var executor = new CodeExecutor(wa_url);
    var data = executor.run(script, {"startindex": startindex, "pagesize": pagesize });
    console.log("getdata->data");
    console.log(data);
    var re = [];
    if(data.object.length>0){
        re = data.object[0].value;
    }
    return re;
};

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
// function WebApiUrl() {
//     if ($.cookie('ck_ag_controller_url') != null) {
//         return "http://" + $.cookie('ck_ag_controller_url');
//     }
// }

var tabledata = {
    "sessionid": "2333906441",
    "resultcode": "0",
    "msg": "",
    "object": [
        {
            "name": "data",
            "DF": "table",
            "value": [
                {
                    "name": "idkfg",
                    "DF": "vector",
                    "type": "string",
                    "size":100,
                    "value": [
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "ABC",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ",
                        "XYZ"
                    ]
                },
                {
                    "name": "tkg",
                    "DF": "vector",
                    "type": "string",
                    "size":100,
                    "value": [
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK",
                        "EFG",
                        "IJK"
                    ]
                },
                {
                    "name": "price",
                    "DF": "vector",
                    "type": "double",
                    "size":100,
                    "value": [
                        97.763459,
                        101.206637,
                        100.623032,
                        106.331263,
                        123.587362,
                        88.640253,
                        100.642784,
                        101.578246,
                        105.877604,
                        92.280117,
                        105.253647,
                        98.857689,
                        116.088718,
                        105.561666,
                        86.544696,
                        104.580309,
                        101.185367,
                        103.19279,
                        101.553143,
                        103.107241,
                        97.32941,
                        109.123727,
                        120.498942,
                        110.988457,
                        102.17621,
                        91.040837,
                        104.672295,
                        92.659829,
                        111.916084,
                        107.597955,
                        109.681396,
                        119.687851,
                        90.514142,
                        104.589948,
                        106.719433,
                        122.011455,
                        88.810069,
                        97.179565,
                        110.371458,
                        87.396713,
                        106.986065,
                        93.11912,
                        117.28805,
                        110.649228,
                        104.435766,
                        93.896781,
                        114.361865,
                        99.848157,
                        96.319156,
                        105.791702,
                        48.252295,
                        46.268288,
                        52.144421,
                        51.226437,
                        53.384351,
                        53.500786,
                        58.424496,
                        48.174502,
                        43.700778,
                        52.10753,
                        53.093266,
                        51.083117,
                        44.178215,
                        52.771965,
                        57.167751,
                        50.298599,
                        51.493594,
                        49.139008,
                        44.940376,
                        56.06743,
                        41.411032,
                        46.411857,
                        61.334051,
                        53.220339,
                        52.152774,
                        51.21013,
                        47.878631,
                        54.133556,
                        50.968964,
                        46.219522,
                        47.956546,
                        51.678417,
                        47.571693,
                        53.279852,
                        57.210532,
                        53.225005,
                        58.292236,
                        56.964884,
                        47.893819,
                        56.180063,
                        51.337668,
                        53.464624,
                        43.967884,
                        52.130856,
                        45.37768,
                        52.841497,
                        55.064441,
                        50.104984,
                        51.50496,
                        58.327345
                    ]
                },
                {
                    "name": "volume",
                    "DF": "vector",
                    "type": "long",
                    "size":100,
                    "value": [
                        2890,
                        1745,
                        1832,
                        1976,
                        1349,
                        1778,
                        1874,
                        1545,
                        1909,
                        2113,
                        1444,
                        1586,
                        2331,
                        1504,
                        1970,
                        2365,
                        1407,
                        1513,
                        1514,
                        2103,
                        1790,
                        1827,
                        2147,
                        2533,
                        2167,
                        2257,
                        2696,
                        1944,
                        2493,
                        2260,
                        2234,
                        1765,
                        2139,
                        1366,
                        2224,
                        1787,
                        1626,
                        2119,
                        1958,
                        1628,
                        2297,
                        2084,
                        2534,
                        1413,
                        2139,
                        2191,
                        1445,
                        1482,
                        2613,
                        1684,
                        1000,
                        1065,
                        934,
                        1000,
                        667,
                        1214,
                        256,
                        1047,
                        814,
                        562,
                        539,
                        968,
                        1208,
                        914,
                        883,
                        1049,
                        1086,
                        906,
                        1485,
                        1712,
                        1071,
                        1418,
                        1078,
                        1181,
                        1614,
                        1119,
                        654,
                        648,
                        1061,
                        1470,
                        1266,
                        1239,
                        1253,
                        1190,
                        879,
                        633,
                        1098,
                        1287,
                        1480,
                        1237,
                        853,
                        761,
                        283,
                        1091,
                        913,
                        1257,
                        520,
                        519,
                        1130,
                        1381
                    ]
                }
            ]
        }
    ]
}