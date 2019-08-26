/*=============================================
Decription  : Dolphin Datagrid , design for display data of DolphinDB API result
ref plugin  : jsgrid.js
ref source  : https://github.com/tabalinas/jsgrid
ref website : http://js-grid.com/
dependency  : /third-party/jsgrid/jsgrid.js
Author      : LinL 
Date        : 2017-06-29
==============================================*/
function DolphinGrid(gridInstance, gridSettings) {
    this.grid = gridInstance;
    this.settings = gridSettings;
}

DolphinGrid.prototype = {
    loadFromDolphinJson: function (dolphinJson) {
        if (typeof dolphinJson != "object") return;
        if (typeof dolphinJson.object != "object") return;
        if (isArray(dolphinJson.object) && dolphinJson.object.length > 0) {
            $.extend(this.settings, { pageSize: getPageSize(dolphinJson) });
        }
        var isVector = getDataForm(dolphinJson.object[0]) === "vector";
        var cols = loadCols(dolphinJson.object[0]);
        this.loadFromJson(DolphinResult2Grid(dolphinJson), isVector, cols);
    },

    setGridPage: function (dolphinJson) {
        if (typeof dolphinJson !== "object") return;
        if (typeof dolphinJson.object !== "object") return;
        if (isArray(dolphinJson.object) && dolphinJson.object.length > 0) {
            $.extend(this.settings, { pageSize: getPageSize(dolphinJson) });
        }
    },

    loadFromJson: function (datalist, isVector, cols) {
        if (datalist == null) return false;
        if (datalist.length <= 0 && typeof cols === 'undefined'&&isVector===false) throw "data empty";
        var griddata = {
            data: datalist,
            itemsCount: 1000
        };
        if (!cols) {
            cols = [];
            if (isVector)
                cols.push({ name: 'offset', title: 'offset', type: 'text' })

            for (var keyname in datalist[0]) {
                if (isVector && keyname === 'offset')
                    continue;

                cols.push({ name: keyname, title: keyname, type: 'text' });
            };
        }

        var option = {
            width: "100%",
            autoload: true,
            paging: true,
            pageLoading: true,
            pageSize: 20,
            sorting: false,
            resizing: true,
            noDataContent: "No Record Found",
            pageIndex: 1,
            pageButtonCount: 10,
            data: datalist,
            fields: cols
        }

        if (typeof this.settings === "object") {
            $.extend(option, this.settings);
        }
        this.grid.jsGrid(option);
        return true;
    },

    load: function () {
        this.grid.jsGrid(this.settings);
    },

    loadCols: function (jsonobj) {
        var jsonVector = jsonobj.value;
        if (typeof jsonVector === 'undefined')
            return undefined;
        if (!isArray(jsonVector)) return;
        if (!isArray(jsonVector[0].value)) return;

        var cols = [];
        jsonVector.forEach(function (value, index, array) {
            var w = 100;
            var style = "jsgrid-cell";
            var t = "text";
            if (value.type === "string" || value.type === "symbol") {
                w = 0;
                style = "jsgrid-cell-cut";
            } else if (value.type === "datetime") {
                w = 140;
            } else if (value.type === "time") {
                w = 80;
            } else if (value.type === "date" || value.type === "month" || value.type === "minute" || value.type === "second") {
                w = 100;
            } else if (value.type === "timestamp" || value.type === "nanotime") {
                w = 160;
            } else if (value.type === "nanotimestamp") {
                w = 200
            } else if (["int","short","long","double","float"].indexOf(value.type)>=0){
                t = "number";
            }
            if (w > 0) {
                cols.push({ name: value.name, width: w, css: style, title: value.name, type: t });
            } else {
                cols.push({ name: value.name, css: style, title: value.name, type: 'text' });
            }

        });
        return cols;
    }
}

function getPageSize(dolphinJson) {
    if (typeof dolphinJson !== "object") return;
    if (dolphinJson.object === null) return;
    if (dolphinJson.object.length <= 0) return;
    switch (dolphinJson.object[0].form.toUpperCase()) {
        case "VECTOR":
            return 100;
        case "MATRIX":
            return 100;
        case "SET":
            return 100;
        case "DICTIONARY":
            return 100;
        case "TABLE":
            return 50;
        case "SCALAR":
            return 100;
        default:
            break;
    }
}

function DolphinResult2Grid(reJson, pageOffset) {
    if (typeof reJson != "object") return;
    if (reJson.resultCode != "0") return;
    if (reJson.object.length <= 0) return;
    switch (reJson.object[0].form.toUpperCase()) {
        case "VECTOR":
            return VectorSet2Table(reJson.object[0].value, pageOffset);
            break;
        case "MATRIX":
            return Matrix2Table(reJson.object[0].value)
            break;
        case "SET":
            return VectorSet2Table(reJson.object[0].value);
            break;
        case "DICTIONARY":
            return Dictionay2Table(reJson.object[0].value);
            break;
        case "TABLE":
            return VectorArray2Table(reJson.object[0].value);
            break;
        case "SCALAR":
            break;
        default:
            break;
    }
}
//jsonobj == result.object[0]
function getDataForm(jsonobj) {
    return jsonobj.form;
}
//jsonobj == result.object[0]


//convert vector and set result to table data for grid
function VectorSet2Table(jsonobj, pageOffset) {
    if (!isArray(jsonobj)) return;
    var vectorlength = jsonobj.length;

    var jTable = [];
    var rowindex = 0;
    var colindex = 0;

    // Set offset
    if (typeof pageOffset === "undefined")
        pageOffset = 0;
    for (var i = 0; i < jsonobj.length / 10; i++)
        jTable.setRow(i, "offset", (i + pageOffset * 10) * 10);

    for (var i = 0; i < jsonobj.length; i++) {
        jTable.setRow(rowindex, colindex.toString(), jsonobj[i]);
        colindex++;
        if (colindex >= 10) {
            rowindex++;
            colindex = 0;
        }
    }
    return jTable;
}

function Dictionay2Table(jsonobj) {

    if (!isArray(jsonobj)) return;

    var keys = jsonobj[0].value;
    var vals = jsonobj[1].value;

    var jTable = [];
    for (var i = 0; i < keys.length; i++) {
        var val = vals[i];
        if (typeof vals[i] == "object")
            val = "object";
        jTable.setRow(i, "key", keys[i])
        jTable.setRow(i, "value", val);
    }
    return jTable;
}
//
function Matrix2Table(jsonobj) {

    if (!isArray(jsonobj)) return;
    //parse json to biz variable
    var jsonArr = jsonobj[0].value;
    var rowcount = Number.parseInt(jsonobj[1].value);
    var colcount = Number.parseInt(jsonobj[2].value);
    var colLabels = jsonobj[4].type === "void" ? null : jsonobj[4].value;
    //var rowLables = jsonobj[5].type === "void" ? null : jsonobj[5].value;
    var jTable = [];
    var curIndex = 0;
    for (var i = 0; i < colcount; i++) {
        var colName = colLabels ? colLabels[i] : "col" + i;
        for (var j = 0; j < rowcount; j++) {
            jTable.setRow(j, colName, jsonArr[curIndex]);
            if (curIndex < jsonArr.length - 1) {
                curIndex++;
            }
        }
    }
    return jTable;
}


function VectorArray2Table(jsonVector) {
    if (!isArray(jsonVector)) return;
    if (!isArray(jsonVector[0].value)) return;
    var rowcount = jsonVector[0].value.length;

    var jTable = [];
    jsonVector.forEach(function (value, index, array) {
        var valArr = value["value"];
        if (isArray(valArr)) {
            for (var i = 0; i < valArr.length; i++) {
                jTable.setRow(i, value.name, valArr[i]);
            }
        }
    });
    return jTable;
}

function DolphinTypeToJsgridType(typstr) {
    switch (typestr) {
        case "int":
        case "double":
        case "float":
        case "long":
        case "short":
        case "int":
            return "number";
        default:
            return "text";
    }
}

function isArray(object) {
    return object && typeof object === 'object' && Array == object.constructor;
}

Array.prototype.setRow = function (index, fieldname, value) {
    if (typeof this[index] === 'undefined') {
        var row = {};
        this[index] = row;
    }
    this[index][fieldname] = value;
}