var ClusterNodeManager = function () {
    var nodes = [];
    var ctlHost = window.location.host;
    var ctl = ctlHost.split(":");
    var ctlIP = ctl[0];
    var ctlPort = ctl.length>1?ctl[1]:"";

    this.setCache = function (data) {
        localStorage.setItem("dolphinDB_ClusterNodeList",JSON.stringify(data));
        this.nodes = data;
    };

    this.getCache = function () {
        if(localStorage.getItem("dolphinDB_ClusterNodeList")!=null){
            var obj = JSON.parse(localStorage.getItem("dolphinDB_ClusterNodeList"));
            return obj;
        }
    };

    this.refreshCache = function(controllerUrl){
        var p = {
            "sessionID": 0,
            "functionName": "getClusterPerf",
            "params": [{
                "name": "isShowController",
                "form": "scalar",
                "type": "bool",
                "value": true
            }]
        };
        CallWebApi(controllerUrl, p, refreshCallback);
    }

    refreshCallback = function(result){
        if(result&&result["object"]!=null&&result["object"].length>0){
            var data = result["object"][0].value;
            localStorage.setItem("dolphinDB_ClusterNodeList",JSON.stringify(data));
        }
        
    }

    this.getControllerHost = function () {
        return ctlHost;
    };

    //not work in nodedetail.js
    this.getControllerSite = function(){
        var nodelistJson = this.getCache();
        var f = nodelistJson.filter(function(x){
            return x.mode === 2;
        });
        if(f!=null || f.length>0)
        {
             var siteObject = new ServerObject(f[0].site);
             var alias = siteObject.getAlias();
             return window.location.host + ":" + alias;
        }
    }

    this.getNodeAlias = function(host,port){
        var nodelistJson = this.getCache();
        if(nodelistJson){
            var f = nodelistJson.filter(function(x){
                return x.host === host && x.port===port;
            });
            if(f!=null || f.length>0){
                var svr = new ServerObject(f[0].site);
                return svr.getAlias();
            } 
        }
    }

    this.getNodeApiUrl = function(nodeAlias){
        var nodes = this.getCache();
        var f = nodes.filter(function(x) {
            return x.name === nodeAlias;
        });
        if(f===null || f.length===0) return null;
        var rowObject = f[0];
        var addrHost = ctlIP;
        var nodeHost = rowObject.host;
        if (nodeHost.toUpperCase() === "LOCALHOST") {
            nodeHost = addrHost.split(':')[0];
        }
        if (isEqualIPAddress(nodeHost, addrHost, "255.255.0.0") === false) {
            var ethArr = rowObject.publicName.split(";");
            $(ethArr).each(function(i, e) {
                if (isInnerIP(e)==false) {
                    nodeHost = e;
                }
            });
        }
        return nodeHost;
    };

    function isEqualIPAddress(addr1, addr2, mask) {
        if (!addr1 || !addr2 || !mask) {
            console.log("invalid paramter");
            return false;
        }
        var
            res1 = [],
            res2 = [];
        addr1 = addr1.split(".");
        addr2 = addr2.split(".");
        mask = mask.split(".");
        for (var i = 0, ilen = addr1.length; i < ilen; i += 1) {
            res1.push(parseInt(addr1[i]) & parseInt(mask[i]));
            res2.push(parseInt(addr2[i]) & parseInt(mask[i]));
        }
        if (res1.join(".") == res2.join(".")) {
            return true;
        } else {
            return false;
        }
    }
}