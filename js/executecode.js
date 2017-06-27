function CodeExecutor(logwin, datagrid, url) {
    this.logWindow = logwin;
    this.grid = datagrid;
    this.apiurl = url;
}

CodeExecutor.prototype.run = function (script) {

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
        var scriptobj = {};
        if (typeof script == "string") {
            scriptobj = JSON.parse(re);
        }
        if (scriptobj.resultcode == "0") {
            if (scriptobj.object.length > 0) {
                scriptobj.object.each(function (obj, i, arr) {
                    this.displayResult(obj);
                });
            }
        }
        return true;
    }, function (re) {
        return false;
    });



}

CodeExecutor.prototype.displayResult = function (obj) {
    if (typeof obj == "object") {
        switch (obj.DF.toUpperCase()) {
            case "TABLE":
                this.ShowTable(obj.value);
                break;
            case "METRIX":
                this.ShowMetrix(obj.value);
                break;
            case "VECTOR":
                this.ShowVector(obj.value);
                break;
            case "DICTIONARY":
                this.ShowDictionary(obj.value);
                break;
            case "SET":
                this.ShowSet(obj.value);
                break;
            case "SCALAR":
                this.ShowScalar(obj.value);
                break;
            default:
        }
    }
}

CodeExecutor.prototype.ShowTable = function (tableJson) {
    if (typeof jsonobj == "object") {
        if (jsonobj.DF.toUpperCase() == "TABLE") {
            this.bindGrid(jsonobj.value);
        }
    }
}

CodeExecutor.prototype.ShowMetrix = function (metrixJson) {
    if (typeof jsonobj == "object") {
        if (jsonobj.DF.toUpperCase() == "METRIX") {
            this.bindGrid(jsonobj.value);
        }
    }
}


CodeExecutor.prototype.ShowDictionary = function (jsonobj) {
    if (typeof jsonobj == "object") {
        if (jsonobj.DF.toUpperCase() == "DICTIONARY") {
            this.bindGrid(jsonobj.value);
        }
    }
}

CodeExecutor.prototype.ShowVector = function (jsonobj) {
    if (typeof jsonobj == "object") {
        if (jsonobj.DF.toUpperCase() == "VECTOR") {
            this.bindGrid(jsonobj.value);
        }
    }
}

CodeExecutor.prototype.ShowScalar = function (jsonobj) {
    if (typeof jsonobj == "object") {
        if (jsonobj.DF.toUpperCase() == "SCALAR") {
            this.bindGrid(jsonobj.value);
        }
    }
}

CodeExecutor.prototype.ShowSet = function (jsonobj) {
    if (typeof jsonobj == "object") {
        if (jsonobj.DF.toUpperCase() == "SET") {
            this.bindGrid(jsonobj.value);
        }
    }
}

CodeExecutor.prototype.setNodeUrl = function (url) {
    this.serverNodeUrl = url;
}

CodeExecutor.prototype.bindGrid = function (jsonarr) {
    var cols = [];
    var datalist = VectorArray2Table(jsonarr);
    var griddata = {
        data: datalist,
        totals: datalist.length
    };
    jsonarr.each(function (obj, i, arr) {
        cols.push({ text: obj.name, key: obj.name });

    });
    this.grid.GM({
        ajax_data: griddata,
        supportAutoOrder: false,
        columnData: cols
    });
}