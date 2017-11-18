var a = [{ "id": 1, "text": "Root node", "children": [{ "id": 2, "text": "Child node 1" }, { "id": 3, "text": "Child node 2" }] }];
var wa_url = "http://" + window.location.host;
//jstree1 

$(function() {
    //getDfsByPath("/");
});

var getDfsByPath = function(url) {
    var executor = new CodeExecutor(wa_url);
    var script = 'getDFSDirectoryContent("' + url + '")';
    codestr = encodeURIComponent(script);
    executor.run(codestr, refreshTreeAndGrid);
    //ajax revoke
}

var refreshTreeAndGrid = function(json) {
    var tree = $('#jstree1').jstree(true);
    sel = tree.get_selected();
    if(!sel.length) { return false; }
    sel = sel[0];
    //console.log(tree);
    var treeJson = DolphinResult2Grid(json);
    $(treeJson).each(function(i,e){
        var nodeid = tree.create_node(sel, {"text":e.filename});
        console.log(e.filename);
    });
    var sPath = tree.get_path(sel,'/',false)
    //console.log(sPath);
    var grid = $('#jsgrid1');
    var dg = new DolphinGrid(grid, {
        pageSize: 50,
        sorting: true,
        paging: true,
        pageLoading: false,
        autoload: false
    });
    dg.loadFromJson(treeJson,false);
    //bindpath
    //bindtree
    //bindgrid
}
var onCreated = function(e){
    console.log("node created" + e);
}

var getData = function() {
    return a;
}

$('#jstree1').jstree({
    "core": {
        "animation": 0,
        "check_callback": true,
        "themes": { "stripes": true },
        "data":{"id":0,"text":"/"}
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
    if(data&&data.node){
        var tree = $('#jstree1').jstree(true);
        sel = tree.get_selected();
        if(!sel.length) { return false; }
        sel = sel[0];

        getDfsByPath(data.node.text);
        var sPath = tree.get_path(sel,'/',false)
        console.log(sPath);
    }

});
// $('#jstree1').on("dblclick.jstree", function(e) {
//     console.log(e.target);
// });
//jsgrid1
