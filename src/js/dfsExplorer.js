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
$(function() {
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
        } else if (i===1) {
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
var getCurrentPath = function(){
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
var bindGrid=function(tableJson){
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
                     fpath= "/";
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
            title: 'name',
            type: 'text',
            itemTemplate: function(value, item) {
                if (item.filetype == 0) {
                    return "<span class='glyphicon glyphicon-folder-close' style='color:rgb(239,222,7)' title='directory'></span> " + value
                } else if (item.filetype == 1) {
                    return "<span class='glyphicon glyphicon glyphicon-th' style='color:rgb(239,222,7)' title='partition chunk'></span> " + value
                } else if (item.filetype == 2) {
                    return  "<span class='glyphicon glyphicon-file' style='color:rgb(190,190,190)' title='file'></span> " + value
                }
            }
    }, {
            name: 'size',
            title: 'size',
            type: 'text'
        }, {
            name: 'filename',
            title: 'distribution',
            type: 'text',
            itemTemplate: function (value, item) {
                if (item.filetype > 0) {
                    return "<span class='glyphicon glyphicon-th-large' style= 'color:rgb(190,190,190)' title= 'file' >"
                }
                
            }
        }


    ]
    dg.loadFromJson(tableJson, false, col);
}
//var buildTreeJson = function(node, subTree) {
//    var subNode = treeJson.filter(function(e) {
//        return e.filename === node.filename;
//    });
//    subNode.children = subTree;
//};

//var ParseTable2Tree = function(table) {
//    var subTreeJson = [];
//    $(table).each(function(i, row) {
//        subTreeItem = { "id": row.fileid, "text": row.filename };
//        subTreeJson.push(subTreeItem);
//    });
//    return subTreeJson;
//};


//var pathClick= function (fullpath) {
//    console.log(fullpath);
//}

//$('#jstree1').jstree({
//    "core": {
//        "animation": 0,
//        "check_callback": true,
//        "themes": { "stripes": true },
//        "data": { "text": "/" }
//    },
//    "types": {
//        "#": {
//            "max_children": 1,
//            "max_depth": 4,
//            "valid_children": ["root"]
//        },
//        "root": {
//            "icon": "/static/3.3.4/assets/images/tree_icon.png",
//            "valid_children": ["default"]
//        },
//        "default": {
//            "valid_children": ["default", "file"]
//        },
//        "file": {
//            "icon": "glyphicon glyphicon-file",
//            "valid_children": []
//        }
//    },
//    "plugins": [
//        "contextmenu", "dnd", "search",
//        "state", "types", "wholerow"
//    ]
//});
//$('#jstree1').on("changed.jstree", function(e, data) {
//    if (data && data.node) {
//        var tree = $('#jstree1').jstree(true);
//        sel = tree.get_selected();
//        if (!sel.length) { return false; }
//        sel = sel[0];

//        //getDfsByPath(data.node.text);
//        var sPath = tree.get_path(sel, '/', false)
//            //console.log(sPath);
//        if (sPath.indexOf("/") === 0) {
//            //getDfsByPath(sPath);
//        } else {
//            //getDfsByPath("/" + sPath);
//        }
//    }
//});
/**
 * design for parsing path
 * @param {fullPath} path 
 */
function PathObject(path) {
    this.fullPath = path;
    this.pathItems = path.split("/");
    this.depth = this.pathItems.length;

    this.getPath = function(depth) {
        var p = "";
        for (var i = depth - 1; i >= 0; i--) {
            p = this.pathItems(i) + "/" + p;
        }
        return p;
    }
}

// $('#jstree1').on("dblclick.jstree", function(e) {
//     console.log(e.target);
// });
//jsgrid1
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
        $(tableJson).each(function (i, e) {
            if (!treeCacheTable) treeCacheTable = [];
            treeCacheTable.push({"filename":e.filename,"filetype":e.filetype,"filepath":path + e.filename});
        });
        console.log(treeCacheTable);
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
    this.getTreeJson = function(fullPath) {
        setCacheByPath(fullPath);
        // rebuild all tree json
        //     getDfsByPath("/");
        // } else { // find json node and append sub tree json
        //     // var pathArray = fullPath.split("/");
        //     getDfsByPath(fullPath);
        // }
    }

    this.getGridJson = function(fullPath) {
        setCacheByPath(fullPath);
        return tableJson;
    }

}