/*=============================================
Decription  : Dolphin Datagrid , design for display large data more effective
ref plugin  : GridManager.js
ref source  : https://github.com/baukh789/GridManager/issues
ref website : http://gridmanager.lovejavascript.com/
dependency  : Gridmanager.js
Author      : LinL 
Date        : 2017-06-29
==============================================*/
function DolphinGrid(gridInstance) {
    this.grid = gridInstance;

    this.loadFromDolphinJson = function (dolphinJson) {
        if (isArray(dolphinJson) && dolphinJson.length > 0) {
            cols = [];
            for (var i = 0; i < dolphinJson.length; i++) {
                obj = dolphinJson[i];
                cols.push({ name: obj.name, title: obj.name, type:'text'});
            };
            this.loadFromJson(VectorArray2Table(dolphinJson), cols);
        }
    }
    // display datagrid (gridmanager)
    this.loadFromJson = function (datalist, cols) {

        if (datalist.length <= 0) throw "data empty";

        var griddata = {
            data: datalist,
            totals: datalist.length
        };
        if (!cols) {
            cols = [];
            for (var i = 0; i < datalist[0].keys().length; i++) {
                var keyname = datalist[0].keys()[i];
                cols.push({ text: keyname, key: keyname, width: 0 });
            };
        }

    this.grid.jsGrid({
        width: "100%",
        height: "450",
 
        inserting: false,
        editing: false,
        sorting: false,
        paging: true,
 
        data: datalist,
 
        fields: cols
    });
        // this.grid.GM({
        //     ajax_data: griddata,
        //     supportAutoOrder: false,
        //     supportCheckbox: false,
        //     i18n: "en-us",
        //     supportAjaxPage: true,
        //     sizeData: [10, 20, 50, 100],
        //     pageSize: 100,
        //     columnData: cols
        // });
        // var g = this.grid.GM('get');
        // console.log(g);
        // this.grid.GM('setAjaxData', griddata);
    }
}


function VectorArray2Table(jsonVector) {
    //get row count
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