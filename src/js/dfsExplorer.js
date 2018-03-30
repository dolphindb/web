var wa_url = "http://" + window.location.host;
var homeTitle = "[Home]"
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

    var url = $.getUrlParam('dfs');
    var defaultPath = "/";
    if (url) {
        defaultPath = url;
    }
    console.log(defaultPath);
    //========default url================
    var json = client.getGridJson(defaultPath);
    bindGrid(json);
    bindPath(defaultPath)

    
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
    $("#dfsPathInput").val(pathStr);
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

var getUpPath = function () {
    var up = getCurrentPath();
    slashIndex = up.lastIndexOf("/");
    if (slashIndex == 0 && up.length > 1) { //root
        return "/";
    } else if (slashIndex > 0) {
        up = up.substr(0, slashIndex);
    }
    return up;
}

var isRootPath = function (path) {
    if (path === "/" || path === "dfs://") {
        return true;
    } else {
        return false;
    }
}
var upDirectory = function () {
    pathStr = getUpPath();
    bindPath(pathStr);
    json = client.getGridJson(pathStr);
    bindGrid(json);
}

var bindGrid = function (tableJson) {
    var grid = $('#jsgrid1');
    var dg = new DolphinGrid(grid, {
        height:"80vh",
        pageSize: 50,
        sorting: true,
        paging: true,
        pageLoading: false,
        autoload: false,
        rowDoubleClick: function (arg) {
            if (arg.item.filetype === 0) { //expanded common directory
                var cp = getCurrentPath();
                var fpath = "";
                if (cp === "") {//if root path
                    fpath = "/";
                } else if (cp === "/") {
                    fpath = cp + arg.item.filename;
                } else {
                    fpath = cp.trimEnd('/') + "/" + arg.item.filename;;
                }
                bindPath(fpath);
                json = client.getGridJson(fpath);
                bindGrid(json);
            } else if (arg.item.filetype === 1) { //if partitionChunk open data browser

            }
        }
    });
    var col = [{
        name: 'filename',
        title: 'Name',
        type: 'text',
        itemTemplate: function (value, item) {
            if (item.filetype === 0) {
                return "<span class='glyphicon glyphicon-folder-close' style='color:rgb(239,222,7)' title='directory'></span> " + value
            } else if (item.filetype === 1) {
                return "<span class='glyphicon glyphicon glyphicon-th' style='color:rgb(239,222,7)' title='partition chunk'></span> " + value
            } else if (item.filetype === 2) {
                return "<span class='glyphicon glyphicon-file' style='color:rgb(190,190,190)' title='file'></span> " + value
            } else if (item.filetype === 9) {
                return " <a href='###' onclick='upDirectory()'><span class='glyphicon glyphicon-folder-open' style='color:rgb(239,222,7)' title='parent directory'></span> <b> . . </b> </a>"
            }
        }
    }, {
        name: 'size',
        title: 'Size',
        type: 'text',
        itemTemplate: function (value, item) {
            if (item.filetype === 2) {//file
                return item.size;
            } else {
                return "";
            }
        }
    }, {
        name: 'filetype',
        title: 'Type',
        type: 'text',
        itemTemplate: function (value, item) {
            if (item.filetype === 0) {
                return "directory";
            } else if (item.filetype === 1) {
                return "partition chunk";
            } else if (item.filetype === 9) { // parent
                return "";
            } else {
                return "file";
            }
        }
    }, {
        name: 'sites',
        title: 'Sites',
        type: 'text',
        itemTemplate: function (value, item) {
            if (item.filetype > 0) {
                var chunkArr = item.sites.split(";");
                var re = "";
                if (chunkArr.length < 1) {
                    return re;
                }
                $(chunkArr).each(function (i, chunkItem) {
                    var chunkRepArr = chunkItem.split(",");
                    if (chunkRepArr.length >= 1) {
                        $(chunkRepArr).each(function (j, chunkRepItem) {
                            var arr = chunkRepItem.split(":");
                            if (arr.length ===3 ) {
                                re = re + arr[0] + " [V" + arr[1] + "]";
                                if (arr[2] === 1) {
                                    re = re + "<span class='glyphicon glyphicon-exclamation-sign' title='chunk is corrupted'></span> ";
                                } else {
                                    re = re + ", ";
                                }
                            }
                        });
                    };
                });
                if (re.length > 0) {
                    var tailIndex = re.lastIndexOf(",");
                    re = re.substr(0, tailIndex);
                }
                return re;
            }
        }
    }, {
        name: 'action',
        title: 'Action',
        type: 'text',
        itemTemplate: function (value, item) {
            var re = "";
            if (item.filetype == 1) {
                if (item.chunks != "") {
                    re = "<a id='btnShowTabletData' onclick='showTabletData(this)' value='" + item.chunks + "' site='" + item.sites + "' partition='/" + item.filename + "'><span class='glyphicon glyphicon-search' title='click to show chunk data'></span></a>";
                }
            }
            return re;
        }
    }]
    dg.loadFromJson(tableJson, false, col);
}

//=================================================================Filter====================================================================
var showTabletData = function (e) {
    var chunkId = $(e).attr("value");
    var sitesstr = $(e).attr("site");
    var partition = $(e).attr("partition");
    var nodesite = sitesstr.split(":")[0];
    var version = sitesstr.split(":")[1];
    var site = getSiteByAlias(nodesite);
    var datanode = new ServerObject(site);
    var dnServer = new DatanodeServer(datanode.getHttpServer());
    dnServer.getDBIdByTabletChunk(chunkId, function (re) {
        console.log("re",re);
        var reEntity = new DolphinEntity(re);
        var dbid = reEntity.toScalar();
        var tableids = "";
        dnServer.getTablesByTabletChunk(chunkId, function (re1) {
            console.log("re1", re1);
            reEntity = new DolphinEntity(re1);
            var tables = reEntity.toVector();
            console.log(tables);
            tableids = tables.join(",");
            var dialog = new DolphinDialog("showChunkData_" + chunkId, { title: "Chunk Data Browser[" + chunkId +"]" });
            dialog.openUrl("dialogs/dfsChunkDataBrowser.html?chunkid=" + chunkId +"&alias=" + getSiteByAlias(nodesite) + "&dbid=" + dbid + "&tables=" + tableids + "&partition=" + partition + "&v=" + version);
        })
    }, function (re) {
        console.log(re);
    })
}

var result = [];
$("#dfsPathInput").bind("keydown", function (e) {
    var fpath = $("#dfsPathInput").val();
    if (e.keyCode === 13) {
        bindPath(fpath);
        json = client.getGridJson(fpath);
        bindGrid(json);
        return false;
    } else if (e.keyCode === 9) {
        if (result && result.length === 1) {
            var last = fpath.lastIndexOf("/");
            $("#dfsPathInput").val(fpath.substr(0, last + 1) + result[0].filename);
        }
        return false;
    } else {
        var cpath = $("#dfsPathInput").val() + e.key;
        var json = client.getTableJson();
        if (json) {
            result = json.filter(function (x) {
                var i = cpath.lastIndexOf("/");
                var exp = cpath.substr(i + 1, cpath.length - i - 1);
                return x.filename.indexOf(exp) === 0;
            });
        }
    }
});

var doQuery = function (sql) {
    var executor = new CodeExecutor(wa_url);
    var path = getCurrentPath();
    if (sql !== "") {
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
        var p = { "offset": 0, "length": 10000 };
        var re = executor.runSync(codestr,p);
        tableJson = DolphinResult2Grid(re);
        if (!tableJson) {
            alert("path '" + path + "' does not exist!");
        }
        //cacheTreeJson
        //$(tableJson).each(function (i, e) {
        //    if (!treeCacheTable) treeCacheTable = [];
        //    //treeCacheTable.push({ "filename": e.filename, "filetype": e.filetype, "filepath": path + e.filename });
        //});
        //console.log(treeCacheTable);
    }

    var pNode = null;
    var cNode = null;

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
            if (obj.id === nodeId) {
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
    this.getTableJson = function () {
        return tableJson;
    }

    this.getGridJson = function (fullPath) {
        setCacheByPath(fullPath);
        if (!isRootPath(fullPath)) {
            if (tableJson)
                tableJson.unshift({ "filename": "..", "filetype": 9, "size": 0, "chunks": "", "sites": "" })
        }
        console.log("tableJson", tableJson);
        return tableJson;
    }

}