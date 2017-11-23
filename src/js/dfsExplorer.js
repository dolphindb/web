var treeJson = [{ "id": 1, "text": "Root node", "children": [{ "id": 2, "text": "Child node 1" }, { "id": 3, "text": "Child node 2" }] }];
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
var bindPath=function(fullPath){
    $(fullPath.split("/")).each(function(i,e){
        var li = document.createElement("li");
        li.innerHTML = "<a href='#' onclick='pathClick'>" + e + "</a>"
        $("#dfsPath").append(li);
    });
}
var getCurrentPath = function(){
    var p = "";
    $("#dfsPath").children().each(function(i,e){
        p = p + "/" + e.innerText;
    });
    return p;
}
var appendPath=function(path){
    var li = document.createElement("li");
    li.innerHTML = "<a href='#' onclick='pathClick'>" + path + "</a>"
    $("#dfsPath").append(li);
}
var bindGrid=function(tableJson){
    var grid = $('#jsgrid1');
    var dg = new DolphinGrid(grid, {
        pageSize: 50,
        sorting: true,
        paging: true,
        pageLoading: false,
        autoload: false,
        rowDoubleClick: function (arg) {
            if (arg.item.filetype == 0) { //you can only expanded filetype==0 
                appendPath(arg.item.filename);
                json = client.getGridJson(getCurrentPath());
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
                    return "<span class='jstree-icon jstree-themeicon'></span> " + value
                } else {
                    return value;
                }
            }
    }, {
        name: 'filetype',
        title: 'filetype',
        type: 'text'
    }, {
            name: 'size',
            title: 'size',
            type: 'text'
        }
    ]
    dg.loadFromJson(tableJson, false, col);
}
var buildTreeJson = function(node, subTree) {
    var subNode = treeJson.filter(function(e) {
        return e.filename === node.filename;
    });
    subNode.children = subTree;
};

var ParseTable2Tree = function(table) {
    var subTreeJson = [];
    $(table).each(function(i, row) {
        subTreeItem = { "id": row.fileid, "text": row.filename };
        subTreeJson.push(subTreeItem);
    });
    return subTreeJson;
};

//handle json result
var refreshTreeAndGrid = function(json) {
    var tree = $('#jstree1').jstree(true);
    sel = tree.get_selected();
    if (!sel.length) { return false; }
    sel = sel[0];
    var children = tree.get_children_dom(sel)

    var treeJson = DolphinResult2Grid(json);
    $(treeJson).each(function(i, e) {
        var nodeid = tree.create_node(sel, { "text": e.filename });
    });
    var sPath = tree.get_path(sel, '/', false)
        //bindgrid()
    
    //bindpath
    $("#dfsPath").html('<li></li>');
    var pathItem = '<li><a href="#">{p}</a></li>';
    $.each(sPath.split('/'), function(i, e) {
        if (e.length > 0) {
            //console.log(e);
            $("#dfsPath").append(pathItem.replace("{p}", e));
        }
    });
}


var getData = function() {
    return a;
}

$('#jstree1').jstree({
    "core": {
        "animation": 0,
        "check_callback": true,
        "themes": { "stripes": true },
        "data": { "text": "/" }
    },
    "types": {
        "#": {
            "max_children": 1,
            "max_depth": 4,
            "valid_children": ["root"]
        },
        "root": {
            "icon": "/static/3.3.4/assets/images/tree_icon.png",
            "valid_children": ["default"]
        },
        "default": {
            "valid_children": ["default", "file"]
        },
        "file": {
            "icon": "glyphicon glyphicon-file",
            "valid_children": []
        }
    },
    "plugins": [
        "contextmenu", "dnd", "search",
        "state", "types", "wholerow"
    ]
});
$('#jstree1').on("changed.jstree", function(e, data) {
    if (data && data.node) {
        var tree = $('#jstree1').jstree(true);
        sel = tree.get_selected();
        if (!sel.length) { return false; }
        sel = sel[0];

        //getDfsByPath(data.node.text);
        var sPath = tree.get_path(sel, '/', false)
            //console.log(sPath);
        if (sPath.indexOf("/") === 0) {
            //getDfsByPath(sPath);
        } else {
            //getDfsByPath("/" + sPath);
        }
    }
});
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