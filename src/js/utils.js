$.getUrlParam = function(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return unescape(r[2]);
    return null;
}

function svgToPic(svgElem, width, height, format, callback) {
    if (format === "svg") {
        $(svgElem).attr({ version: '1.1' , xmlns:"http://www.w3.org/2000/svg"});
        var svg = $('#custom-vis-plot').html();
        var b64 = Utils.btoa(svg);
        callback('data:image/svg+xml;base64,\n' + b64);
        return;
    }
    else {
        var svgData = new XMLSerializer().serializeToString(svgElem);
        var img = new Image();

        img.onload = function() {
            var canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext("2d");

            if (format === "jpeg") {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);    // Make background white
            }
            ctx.drawImage(this, 0, 0);
            callback(canvas.toDataURL("image/" + format));
        }
        img.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(svgData);
    }
}

Utils = {};

Utils.isDataURLSupported = function() {
    var supported = false;

    var iframe = document.createElement("iframe");
    iframe.setAttribute('src', 'data:text/html,<html></html>');

    document.body.appendChild(iframe);
    try {
        supported = !!iframe.contentDocument;
    } catch (e) {
        supported = false;
    }

    document.body.removeChild(iframe);
    Utils.isDataURLSupported = function() {
        return supported;
    }

    return supported;
}

Utils.isBase64Supported = function() {
    var supported = false;

    try {
        supported = !!Base64.encode;
        if (supported)
            Utils.btoa = Base64.encode;
    } catch (e) {
        try {
            supported = !!btoa;
            if (supported)
                Utils.btoa = btoa.bind(window);
        } catch (e) {
            supported = false;
        }
    }

    Utils.isBase64Supported = function() {
        return supported;
    }

    return supported;
}

var getVectorFromTable = function(tbData, colName, isDeleteRepeat, isAddEmptyRow) {
    var re = [];
    var tmpArr = [];
    if (isAddEmptyRow)
        re.push({ name: "" });
    $.each(tbData, function(index, row) {
        var item = {};
        item.name = row[colName];
        tmpArr.push(item);
    });
    console.log(re);
    if (isDeleteRepeat) {
        $.each(tmpArr, function(index, row) {
            if (re.findIndex(function(ele, ind, arr) { if (ele.name == row.name) return ind; }) < 0) {
                re.push(row);
            }
        });
        return re;
    } else {
        return tmpArr;
    }
}