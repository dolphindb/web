/*=============================================
Decription  : Dolphin Dialog
ref plugin  : jquery.ui.js
ref website : http://jqueryui.com/dialog/
dependency  : /third-party/bootstrap/js/vendor/jquery-ui.js
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
        divobj.setAttribute("style", "overflow-y:hidden;width:100%");
        var iframe = document.createElement("iframe");
        iframe.setAttribute("src", url);
        iframe.setAttribute("style", "height:100%;width:100%;border:0;overflow-y:hidden");
        $(iframe).appendTo($(divobj));
        $(divobj).appendTo($('body'));
        $("#" + did).dialog(this.settings);
    },
    openSingleWindow: function(url,height,width){
        var h;
        var w;
        if(height){
            h = height;
        }else{
            h= $(window).height()-200;
        }
        if(width){
            w = width;
        }else{
            w= $(window).width()*0.85;
        }

        var iTop = ($(window).height()-h)/2;  
        var iLeft = ($(window).width()-w)/2;
        window.open(url,this.id,'height=' + h + ',width=' + w + ',top=' + iTop + ',left=' + iLeft + ',status=no,toolbar=no,menubar=no,location=no,resizable=no,scrollbars=0,titlebar=no');
    }
}