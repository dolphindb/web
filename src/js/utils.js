$.getUrlParam = function(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r !== null) return decodeURI(r[2]);
    return null;
}

function svgToPic(svgElem, width, height, format, callback) {
    if (format === "svg") {
        $(svgElem).attr({ version: '1.1', xmlns: "http://www.w3.org/2000/svg" });
        var svg = $('#custom-vis-plot').html();
        var b64 = Utils.btoa(svg);
        callback('data:image/svg+xml;base64,\n' + b64);
        return;
    } else {
        var svgData = new XMLSerializer().serializeToString(svgElem);
        var img = new Image();

        img.onload = function() {
            var canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext("2d");

            if (format === "jpeg") {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height); // Make background white
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
//=========================================================
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

    if (isDeleteRepeat) {
        $.each(tmpArr, function(index, row) {
            if (re.findIndex(function(ele, ind, arr) { if (ele.name === row.name) return ind; }) < 0) {
                re.push(row);
            }
        });
        re.sort(sortup);
        return re;
    } else {
        return tmpArr;
    }
}

function sortup(x, y) {
    return (x.name > y.name) ? 1 : -1
}

function sortdown(x, y) {
    return (x.name < y.name) ? 1 : -1
}
//============================================================

var ServerObject = function (sites) {
    var strSite = sites;
    var svrArr = sites.split(":");
    this.getSites = function () {
        return sites;
    }

    this.getServer = function () {
        return svrArr[0] + ":" + svrArr[1];
    }

    this.getHttpServer = function () {
        return window.location.protocol + "//" + this.getServer();
    }

    this.getServerHttpRestrict = function () {
        return "http://" + this.getServer();
    }
    this.getAlias = function () {
        return svrArr[2];
    }
}

function GetFullUrl(host){
    return window.location.protocol + "//" + host;
}
function GetFullUrlHttpRestrict(host){
    return "http://" + host;
}
//==================================================String========================================
String.prototype.trimEnd = function(c)  
{  
    if(c!==null&&c!==""){  
        var str= this;  
        var rg = new RegExp(c);  
        var i = str.length;  
        while (rg.test(str.charAt(--i)));  
        return str.slice(0, i + 1);  
    }  
}  
String.prototype.startWith = function (str) {
    var reg = new RegExp("^" + str);
    return reg.test(this);
}

String.prototype.endWith = function (str) {
    var reg = new RegExp(str + "$");
    return reg.test(this);
}
String.prototype.isNumber = function() {
    var patrn = /^[0-9]*$/;
    if (patrn.exec(this) == null || this == "") {
        return false
    } else {
        return true
    }
}
String.prototype.replaceAll = function(pattern,replaceStr){
    var reg = new RegExp(pattern,"g")
    var newstr = this.replace(reg,replaceStr);
    return newstr;
}
//================================================================================================
function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
function guid() {
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function isInnerIP(ipstr){
   
     var isInnerIp = false;   
     var ipNum = getIpNum(ipstr);
     /**  
      * private IP：A  10.0.0.0    -10.255.255.255  
      *       B  172.16.0.0  -172.31.255.255     
      *       C  192.168.0.0 -192.168.255.255    
      *       D   127.0.0.0   -127.255.255.255(loop)
      **/       
     var aBegin = getIpNum("10.0.0.0");
     var aEnd = getIpNum("10.255.255.255");
     var bBegin = getIpNum("172.16.0.0");
     var bEnd = getIpNum("172.31.255.255");
     var cBegin = getIpNum("192.168.0.0");
     var cEnd = getIpNum("192.168.255.255");
     var dBegin = getIpNum("127.0.0.0");
     var dEnd = getIpNum("127.255.255.255");
     isInnerIp = isInner(ipNum,aBegin,aEnd) || isInner(ipNum,bBegin,bEnd) || isInner(ipNum,cBegin,cEnd) || isInner(ipNum,dBegin,dEnd);    
     return isInnerIp;
}
function getIpNum(ipAddress) {       
    var ip = ipAddress.split(".");        
    var a = parseInt(ip[0]);        
    var b = parseInt(ip[1]);        
    var c = parseInt(ip[2]);        
    var d = parseInt(ip[3]);    
    var ipNum = a * 256 * 256 * 256 + b * 256 * 256 + c * 256 + d;        
    return ipNum;        
}       
  
function isInner(userIp,begin,end){        
    return (userIp>=begin) && (userIp<=end);        
}

function HandleUrlOverHttp(){
    var protocal = window.location.protocol;
    if(protocal.toLowerCase()==="http:"){
        var ctlUrl = GetFullUrlHttpRestrict(window.location.host);
        var controller = new ControllerServer(ctlUrl);
        var re = new DolphinEntity(controller.getIsEnableHttps());
        if(re.toScalar() === "1"){
            window.location.href = window.location.href.replace("http","https");
        }
    }
}

function HtmlEncode(str){
    var temp = document.createElement ("div");
    (temp.textContent != undefined ) ? (temp.textContent = str) : (temp.innerText = str);
    var output = temp.innerHTML;
    temp = null;
    return output;
}