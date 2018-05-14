var ClusterNodeManager = function () {
    var nodes = [];
    var ctlHost = window.location.host;
    var ctl = ctlHost.split(":");
    var ctlIP = ctl[0];
    var ctlPort = ctl.length>1?ctl[1]:"";

    this.setCache = function (data) {
//         addAliasColumn(data);
        localStorage.setItem("dolphinDB_ClusterNodeList",JSON.stringify(data));
        this.nodes = data;
    };

//     var addAliasColumn = function(data){
//         $(data).each(function(i, e) {
//             data[i].nodeAlias = e.site.split(":")[2];
//         });
//     };

    this.getCache = function () {
        if(localStorage.getItem("dolphinDB_ClusterNodeList")!=null){
            return JSON.parse(localStorage.getItem("dolphinDB_ClusterNodeList"));
        }
    };

    this.getControllerHost = function () {
        return ctlHost;
    };

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
            var ethArr = rowObject.ethernetInfo.split(";");
            $(ethArr).each(function(i, e) {
                if (isInnerIP(e) == false) {
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