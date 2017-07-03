function CodeExecutor(url) {
    this.apiurl = url;
    this.run = function (script,callback,params) {

        var p = {
            "sessionid": "0",
            "functionname": "executeCode",
            "parameters": [{
                "name": "script",
                "DF": "scalar",
                "DT": "string",
                "value": script
            }]
        };
        if(params){
            $.extend(p, params);
        }

        CallWebApi(this.apiurl, p, function (re) {
            var resultobj = {};
            if (typeof re == "string") {
                resultobj = JSON.parse(re);
            }
            else {
                resultobj = re;
            }

            callback(re);
            return false;
        }, function (re) {
            console.log(re);
        });
    };
}
