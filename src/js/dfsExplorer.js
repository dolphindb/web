var wa_url = "http://" + window.location.host;
//jstree1 
//testcase :
//db = database("dfs://root/node1/node1_1/node1_1_1")
//db = database("dfs://root/node1/node1_1/node1_1_2")
//db = database("dfs://root/node1/node1_2/node1_2_1")
//db = database("dfs://root/node1/node1_2/node1_2_2")
//db = database("dfs://root/node2/node2_1/node2_1_1")
//db = database("dfs://root/node2/node2_2/node2_2_1")
//db = database("dfs://root/node2/node2_2/node2_2_2")
//db = database("dfs://root/node2/node2_3/node2_3_1")
//db = database("dfs://root/node2/node2_3/node2_3_2")

var client = null;
$(function () {
    client = new DolphinDBDFSClient(wa_url);
    var json = client.getGridJson("/");
    bindGrid(json);
    bindPath("/")
});
var bindPath = function (fullPath) {
    $("#dfsPath").empty();
    var pathStr = "";
    $(fullPath.split("/")).each(function (i, e) {
        var cp = e;
        if (i === 0) {//if root path
            pathStr = "/";
            cp = "/";
        } else if (i === 1) {
            pathStr = pathStr + e;
        } else {
            pathStr = pathStr + "/" + e;
        }
        var li = document.createElement("li");
        var archor = document.createElement("a");
        archor.href = '#';
        archor.name = 'pItem';
        $(archor).attr("ref", pathStr);
        $(archor).text(cp);

        $(archor).bind("click", function () {
            var p = $(this).attr("ref");
            var json = client.getGridJson(p);
            bindGrid(json);
            bindPath(p);
        });
        li.append(archor);
        $("#dfsPath").append(li);
        pathStr = getCurrentPath();
    });
}
var getCurrentPath = function () {
    var cp = "";
    $("#dfsPath").children().each(function (i, e) {
        if (cp === "") {//if root path
            cp = "/";
        } else if (cp === "/") {
            cp = cp + e.innerText;
        } else {
            cp = cp + "/" + e.innerText;
        }
    });
    return cp;
}
//var appendPath = function (path) {
//    var cp = getCurrentPath();
//    if (cp === "") {//if root path
//        cp = "/";
//    } else if(cp==="/"){
//        cp = cp + path;
//    } else {
//        cp = cp + "/" + path;
//    }

//    var li = document.createElement("li");
//    var archor = document.createElement("a");
//    archor.href = '#';
//    archor.name = 'pItem';
//    $(archor).attr("ref", cp);
//    archor.innerText = path;
//    $(archor).bind("click", function () {
//        var p = $(this).attr("ref");
//        var json = client.getGridJson(p);
//        bindGrid(json);
//        bindPath(p);
//    });
//    li.append(archor);
//    $("#dfsPath").append(li);
//}
var bindGrid = function (tableJson) {
    var grid = $('#jsgrid1');
    var dg = new DolphinGrid(grid, {
        pageSize: 50,
        sorting: true,
        paging: true,
        pageLoading: false,
        autoload: false,
        rowDoubleClick: function (arg) {
            if (arg.item.filetype == 0 || arg.item.filetype == 1) { //expanded directory or partition directory
                var cp = getCurrentPath();
                var fpath = "";
                if (cp === "") {//if root path
                    fpath = "/";
                } else if (cp === "/") {
                    fpath = cp + arg.item.filename;
                } else {
                    fpath = cp + "/" + arg.item.filename;;
                }
                bindPath(fpath);
                json = client.getGridJson(fpath);
                bindGrid(json);
            }
        }
    });
    var col = [{
        name: 'filename',
        title: 'filename',
        type: 'text',
        itemTemplate: function (value, item) {
            if (item.filetype == 0) {
                return "<span class='glyphicon glyphicon-folder-close' style='color:rgb(239,222,7)' title='directory'></span> " + value
            } else if (item.filetype == 1) {
                return "<span class='glyphicon glyphicon glyphicon-th' style='color:rgb(239,222,7)' title='partition chunk'></span> " + value
            } else if (item.filetype == 2) {
                return "<span class='glyphicon glyphicon-file' style='color:rgb(190,190,190)' title='file'></span> " + value
            }
        }
    }, {
        name: 'size',
        title: 'size',
        type: 'text'
    }, {
        name: 'sites',
        title: 'sites',
        type: 'text',
        itemTemplate: function (value, item) {
            if (item.filetype > 0) {
                return value;
            }

        }
    }


    ]
    dg.loadFromJson(tableJson, false, col);
}
//=================================================================Filter====================================================================
$("#executeSQL").bind("click", function () {
    doQuery($("#txtSQL").val());
});
$("#txtSQL").bind("keypress", function (e) {
    if (e.keyCode == 13) {
        doQuery($("#txtSQL").val());
    }
});

var doQuery = function (sql) {
    var executor = new CodeExecutor(wa_url);
    var path = getCurrentPath();
    if (sql != "") {
        var script = 'select * from getDFSDirectoryContent("' + path + '") where ' + sql;
        codestr = encodeURIComponent(script);
        var re = executor.runSync(codestr);
        tableJson = DolphinResult2Grid(re);
        bindGrid(tableJson);
    } else {
        bindGrid(client.getGridJson(path));
    }
}
//=================================================================Path Object===============================================================
/**
 * design for parsing path
 * @param {fullPath} path 
 */
function PathObject(path) {
    this.fullPath = path;
    this.pathItems = path.split("/");
    this.depth = this.pathItems.length;

    this.getPath = function (depth) {
        var p = "";
        for (var i = depth - 1; i >= 0; i--) {
            p = this.pathItems(i) + "/" + p;
        }
        return p;
    }
}
//================================================================DolphinDB DFS Client===============================================================
//DolphinDB DFS Client 
//get dfs data from Dolphindb server
function DolphinDBDFSClient(webApiUrl) {
    var url = webApiUrl;
    var tableJson = null;
    var treeJson = null;
    var treeCacheTable = [];

    function setCacheByPath(path) {
        var executor = new CodeExecutor(url);
        var script = 'getDFSDirectoryContent("' + path + '")';
        codestr = encodeURIComponent(script);
        var re = executor.runSync(codestr);
        tableJson = DolphinResult2Grid(re);
        //cacheTreeJson
        //$(tableJson).each(function (i, e) {
        //    if (!treeCacheTable) treeCacheTable = [];
        //    //treeCacheTable.push({ "filename": e.filename, "filetype": e.filetype, "filepath": path + e.filename });
        //});
        //console.log(treeCacheTable);
    }

    var pNode = null;
    var cNode = null;
    /**
     * NodeID Child
     */
    function getNode(json, nodeId) {

        //.recursive search node
        for (var i = 0; i < json.length; i++) {
            if (cNode) {
                break;
            }
            var obj = json[i];

            if (!obj || !obj.id) {
                continue;
            }
            //find and return 
            if (obj.id == nodeId) {
                cNode = obj;
                break;
            } else {
                if (obj.children) {
                    pNode = obj;
                    getNode(obj.children, nodeId);
                } else {
                    continue;
                }
            }
        }

        return {
            parentNode: pNode,
            currentNode: cNode
        };
    }
    //todo: 
    this.getTreeJson = function (fullPath) {
        setCacheByPath(fullPath);
        // rebuild all tree json
        //     getDfsByPath("/");
        // } else { // find json node and append sub tree json
        //     // var pathArray = fullPath.split("/");
        //     getDfsByPath(fullPath);
        // }
    }

    this.getGridJson = function (fullPath) {
        setCacheByPath(fullPath);
        return tableJson;
    }

}