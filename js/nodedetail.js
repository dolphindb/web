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
    console.log(wa_url);
    $.cookie("language_file", "js/lang.en.js");

    //$('#agent_controller_url').text($.cookie('ck_ag_controller_url'));

    editor = CodeMirror.fromTextArea('txt_code', {
        height: "50px",
        parserfile: "parsesql.js",
        stylesheet: "third-party/codemirror/sqlcolors.css",
        path: "third-party/codemirror/",
        textWrapping: false
    });
});

$('#btn_execode').click(function () {
    var codestr = editor.getCode();
    var grid = document.querySelector('table[grid-manager="grid1"]');
    var executor = new CodeExecutor($("#pnl_log"), grid, wa_url);
    executor.run(codestr);
});

$('#btn_getvaribles').click(function () {
    var p = {
        "sessionid": "0",
        "functionname": "objs",
        "parameters": [{
            "name": "objs",
            "DF": "scalar",
            "DT": "bool",
            "value": "true"
        }]
    };


    CallWebApi(wa_url, p, function (re) {
        console.log('get var success')
        console.log(re);
    },
        function (re) {
            console.log('get var failed')
            console.log(re);
        });
});

function WebApiUrl() {
    if ($.cookie('ck_ag_controller_url') != null) {
        return "http://" + $.cookie('ck_ag_controller_url');
    }
}

