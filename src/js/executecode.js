function CodeExecutor(url) {
    this.apiurl = url;
    this.run = function(script, callback, params) {

        var p = {
            "sessionID": "0",
            "functionName": "executeCode",
            "params": [{
                "name": "script",
                "form": "scalar",
                "type": "string",
                "value": script
            }]
        };
        if (params) {
            $.extend(p, params);
        }

        CallWebApi(this.apiurl, p, function(re) {
            var resultobj = {};
            if (typeof re == "string") {
                resultobj = JSON.parse(re);
            } else {
                resultobj = re;
            }
            // if(resultobj.resultCode=="1"){
            //     alert(resultobj.msg);
            // }else{
                callback(re);
            // }
            return false;
        }, function(re) {
            console.log(re);
        });
    };

    this.runSync = function(script,param) {
        var p = {
            "sessionID": "0",
            "functionName": "executeCode",
            "params": [{
                "name": "script",
                "form": "scalar",
                "type": "string",
                "value": script
            }]
        };
        if (param) {
            $.extend(p, param);
        }
        return CallWebApiSync(this.apiurl, p)
    };
}