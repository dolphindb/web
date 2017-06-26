//page load
var editor = null;
var wa_url = WebApiUrl();
$(function () {
    $.cookie("language_file", "js/lang.en.js");
    
    $('#agent_controller_url').text($.cookie('ck_ag_controller_url'));

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
    var p = {
        "sessionid": "0",
        "functionname": "executeCode",
        "parameters": [{
            "name": "script",
            "DF": "scalar",
            "DT": "string",
            "value": codestr
        }]
    };

    CallWebApi(wa_url,p,function(re){
        console.log(re);
    },
    function(){

    });
});

function WebApiUrl() {
    if ($.cookie('ck_ag_controller_url') != null) {
        return "http://" + $.cookie('ck_ag_controller_url');
    }
}