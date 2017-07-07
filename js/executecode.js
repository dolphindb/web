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

            callback(re);
            return false;
        }, function(re) {
            console.log(re);
        });
    };
}