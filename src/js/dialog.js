/*=============================================
Decription  : Dolphin Dialog
ref plugin  : jquery.ui.js
ref website : http://jqueryui.com/dialog/
dependency  : /third-party/bootstrap/js/vendor/jquery-ui-1.10.3.custom.min.js
Author      : LinL 
Date        : 2017-12-27
==============================================*/
function DolphinDialog(dialogId, dialogSetting) {
    this.Id = dialogId;
    this.settings = {};
    var defaultSettings = {
        width: 1000,
        height: 720,
        position: { my: "center", at: "center", of: window },
        title: "[DolphinDB]",
        //dialogClass: "no-close",
    };
    $.extend(this.settings, defaultSettings, dialogSetting);
}

DolphinDialog.prototype = {
    open: function (dialogSetting) {
        $.extend(this.settings, dialogSetting);

        $("#" + this.Id).dialog(this.settings);
    },
    openUrl: function (url, dialogSetting, windowId) {
        if (windowId) {
            did = windowId;
        } else {
            did = guid();
        }
        $.extend(this.settings, dialogSetting);
        divobj = document.createElement("div");
        divobj.id = did;
        divobj.setAttribute("style", "overflow:hidden;width:100%");
        var iframe = document.createElement("iframe");
        iframe.setAttribute("src", url);
        iframe.setAttribute("style", "height:100%;width:100%;border:0;overflow:hidden");
        $(iframe).appendTo($(divobj));
        $(divobj).appendTo($('body'));
        $("#" + did).dialog(this.settings);
    }
}