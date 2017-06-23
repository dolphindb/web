//page load
var editor = null;
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
    editor.save();
   
    console.log(editor.getValue());

});