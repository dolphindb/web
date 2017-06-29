function CodeExecutor(url) {
    this.apiurl = url;



    this.run = function (script,callback) {

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

        CallWebApi(this.apiurl, p, function (re) {
            var resultobj = {};
            if (typeof re == "string") {
                resultobj = JSON.parse(re);
            }
            else {
                resultobj = re;
            }


            if (resultobj.resultcode == "0") {
                //return resultobj.object;
                // if (resultobj.object.length > 0) {
                //     for (var i = 0; i < resultobj.object.length; i++) {
                //         obj = resultobj.object[i];
                //         return displayResult(obj);
                //     }
                // }
            }
            callback(re.object);
            return false;
        }, function (re) {
            console.log(re);
        });
    };

    // function ShowTable(jsonobj) {
    //     if (typeof jsonobj == "object") {
    //         if (jsonobj.DF.toUpperCase() == "TABLE") {
    //             bindGrid(jsonobj.value);
    //         }
    //     }
    // };
    // function ShowMetrix(jsonobj) {
    //     if (typeof jsonobj == "object") {
    //         if (jsonobj.DF.toUpperCase() == "METRIX") {
    //             bindGrid(jsonobj.value);
    //         }
    //     }
    // };

    // function ShowDictionary(jsonobj) {
    //     if (typeof jsonobj == "object") {
    //         if (jsonobj.DF.toUpperCase() == "DICTIONARY") {
    //             bindGrid(jsonobj.value);
    //         }
    //     }
    // };

    // function ShowVector(jsonobj) {
    //     if (typeof jsonobj == "object") {
    //         if (jsonobj.DF.toUpperCase() == "VECTOR") {
    //             bindGrid(jsonobj.value);
    //         }
    //     }
    // };

    // function ShowScalar(jsonobj) {
    //     if (typeof jsonobj == "object") {
    //         if (jsonobj.DF.toUpperCase() == "SCALAR") {
    //             bindGrid(jsonobj.value);
    //         }
    //     }
    // };

    // function ShowSet(jsonobj) {
    //     if (typeof jsonobj == "object") {
    //         if (jsonobj.DF.toUpperCase() == "SET") {
    //             bindGrid(jsonobj.value);
    //         }
    //     }
    // };

    // function setNodeUrl(url) {
    //     this.serverNodeUrl = url;
    // };

    // function displayResult(obj) {
    //     var reobj;
    //     if (typeof obj == "object") {
    //         switch (obj.DF.toUpperCase()) {
    //             case "TABLE":
    //                 reobj = VectorArray2Table(obj.value);
    //                 break;
    //             case "METRIX":
    //                 reobj = VectorArray2Table(obj.value);
    //                 break;
    //             case "VECTOR":
    //                 reobj = VectorArray2Table(obj.value);
    //                 break;
    //             case "DICTIONARY":
    //                 reobj = VectorArray2Table(obj.value);
    //                 break;
    //             case "SET":
    //                 reobj = VectorArray2Table(obj.value);
    //                 break;
    //             case "SCALAR":
    //                 reobj = VectorArray2Table(obj.value);
    //                 break;
    //             default:
    //         }
    //     }
    //     return reobj;
    // };
}
