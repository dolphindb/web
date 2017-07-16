$.getUrlParam = function(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return unescape(r[2]);
    return null;
}

function svgToPng(svgElem, width, height, callback) {
    var svgData = new XMLSerializer().serializeToString(svgElem);

    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");

    var img = new Image();
    img.onload = function() {
        ctx.drawImage(this, 0, 0);
        callback(canvas.toDataURL("image/png"));
    }
    img.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(svgData);
}

var isDataURLSupported = function() {
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
    isDataURLSupported = function() {
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