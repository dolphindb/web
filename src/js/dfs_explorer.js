var a = [{ "id": 1, "text": "Root node", "children": [{ "id": 2, "text": "Child node 1" }, { "id": 3, "text": "Child node 2" }] }];
var wa_url = "http://" + window.location.host;
//jstree1 
var getDfsByPath = function(url) {
    var executor = new CodeExecutor(wa_url);
    var script = "(\"" + url + "\")";
    executor.run("getDFSDirectoryContent" + script, refreshTreeAndGrid, url);
    //ajax revoke
}

var refreshTreeAndGrid = function(json) {
    console.log(json);
    //bindpath
    //bindtree
    //bindgrid
}

var getData = function() {
    return a;
}

$('#jstree1').jstree({
    "core": {
        "animation": 0,
        "check_callback": true,
        "themes": { "stripes": true }
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
    var re = a.filter(function(obj) { obj.text == data.text });
    console.log(re.id);
});
$('#jstree1').on("dblclick.jstree", function(e) {
    console.log(e.target);
});
//jsgrid1
// $('#jsgrid1').jsgrid({

// });