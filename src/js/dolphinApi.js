/*=============================================
Decription  : Dolphin API
Author      : LinL 
Date        : 2018-05-27
==============================================*/
var DolphinEntity = function (json) {
    this._json = json;
}
DolphinEntity.prototype = {
    toScalar: function () {
        if (typeof this._json != "object") return "";
        if (this._json.resultCode != "0") return "";
        if (this._json.object.length <= 0) return "";
        return this._json.object[0].value;
    },
    toVector: function () {
        if (typeof this._json != "object") return "";
        if (this._json.resultCode != "0") return "";
        if (this._json.object.length <= 0) return "";
        return this._json.object[0].value;
    },

    toTable: function () {
        if (typeof this._json != "object") return "";
        if (this._json.resultCode != "0") return "";
        if (this._json.object.length <= 0) return "";
        var rowcount = this._json.object.length;

        var jTable = [];
        this._json.object[0].value.forEach(function (value, index, array) {
            var valArr = value["value"];
            if (isArray(valArr)) {
                for (var i = 0; i < valArr.length; i++) {
                    jTable.setRow(i, value.name, valArr[i]);
                }
            }
        });
        return jTable;
    }
}

var getSiteByAlias = function (alias) {
    var exec = new CodeExecutor(GetFullUrl(window.location.host));
    var re = exec.runSync("rpc('" + alias + "',getNodeHost)");
    var getHost = new DolphinEntity(re).toScalar();
    re = exec.runSync("rpc('" + alias + "',getNodePort)");
    var getPort = new DolphinEntity(re).toScalar();
    return getHost + ":" + getPort + ":" + alias;
}

var DatanodeServer = function (url) {
    this._url = url;
    this._sessionid = 0;   //get session from cookie
}
DatanodeServer.prototype = {
    getDBIdByTabletChunk: function (chunkId, succallback, failcallback) {
        var p = {
            "sessionID": this._sessionid,
            "functionName": "getDBIdByTabletChunk",
            "params": [{
                "name": "chunkId",
                "form": "scalar",
                "type": "string",
                "value": chunkId
            }]
        };
        CallWebApi(this._url, p, succallback, failcallback);
    },

    getTablesByTabletChunk: function (chunkId, succallback, failcallback) {
        var p = {
            "sessionID": this._sessionid,
            "functionName": "getTablesByTabletChunk",
            "params": [{
                "name": "chunkId",
                "form": "scalar",
                "type": "string",
                "value": chunkId
            }]
        };
        CallWebApi(this._url, p, succallback, failcallback);
    },

    run: function (script, succallback) {
        var exec = new CodeExecutor(this._url);
        exec.run(script, succallback);
    },
    runSync: function (script) {
        var exec = new CodeExecutor(this._url);
        return exec.runSync(script);
    }
}

var AgentServer = function (url) {
    this._url = url;

}

var ControllerServer = function (url) {
    this._url = url;
    this.exec = new CodeExecutor(this._url);
}
ControllerServer.prototype = {
    getDBIdByTabletChunk: function (alias, chunkId, succallback, failcallback) {
        var exec = new CodeExecutor(this._url);
        exec.run("rpc('" + alias + "',getDBIdByTabletChunk,'" + chunkId + "')", succallback);
    },

    getDBIdByTabletChunkSync: function (alias, chunkId) {
        var exec = new CodeExecutor(this._url);
        return exec.runSync("rpc('" + alias + "',getDBIdByTabletChunk,'" + chunkId + "')");
    },

    getTablesByTabletChunk: function (alias, chunkId, succallback, failcallback) {
        var exec = new CodeExecutor(this._url);
        exec.run("rpc('" + alias + "',getTablesByTabletChunk,'" + chunkId + "')", succallback);
    },
    getTablesByTabletChunkSync: function (alias, chunkId) {
        var exec = new CodeExecutor(this._url);
        return exec.runSync("rpc('" + alias + "',getTablesByTabletChunk,'" + chunkId + "')");
    },
    getIsEnableHttps: function () {
        var exec = new CodeExecutor(this._url);
        return exec.runSync("isHttpsOn()");
    },
    createUser: function (userId, password, isAdmin, callback) {
        var exec = new CodeExecutor(this._url);
        //return exec.run("createUser('" + userId + "','"+password+"',NULL," + isAdmin + ")",callback);
        exec.run("createUser('" + userId + "','" + password + "')", callback);
    },
    createGroup: function (groupId, callback) {
        this.exec.run("createGroup('" + groupId + "')", callback);
    },
    deleteUser: function (userId,callback) {
        this.exec.run("deleteUser('" + userId + "')", callback);
    },
    deleteGroup: function (groupId,callback) {
        this.exec.run("deleteGroup('" + groupId + "')", callback);
    },
    addGroupMember: function (groupId, userIds, callback) {
        var p = {
            "sessionID": 0,
            "functionName": "addGroupMember",
            "params": [{
                "name": "userId",
                "form": "vector",
                "type": "string",
                "value": userIds
            }, {
                "name": "groupId",
                "form": "scalar",
                "type": "string",
                "value": groupId
            }
            ]
        };

        CallWebApi(this._url, p, callback);
    },
    deleteGroupMember: function (groupId, userIds,callback) {
        var p = {
            "sessionID": 0,
            "functionName": "deleteGroupMember",
            "params": [{
                "name": "userId",
                "form": "vector",
                "type": "string",
                "value": userIds
            }, {
                "name": "groupId",
                "form": "scalar",
                "type": "string",
                "value": groupId
            }
            ]
        };

        CallWebApi(this._url, p, callback);
    },

    getUsersByGroupId: function (groupId, callback) {
        this.exec.run("getUsersByGroupId('" + userId + "')", function (re) {
            var entity = new DolphinEntity(re);
            callback(entity.toTable());
        });
    },

    getExistsUserByGroupId: function (groupId, callback) {
        var script = "t = getUsersByGroupId('" + groupId + "');s = take(1,size(t));select * from  lj(table(getUserList()  as userId),table(t as userId,s as selected),`userId)"
        this.exec.run(script, function (re) {
            var reTable = new DolphinEntity(re).toTable();
            callback(reTable);
        });

    },
    changeUserPwd: function (userId, pass) {

    },
    getUserAccess: function (userId, callback) {
        this.exec.run("getUserAccess('" + userId + "')", function (re) {
            var entity = new DolphinEntity(re);
            callback(entity.toTable());
        });
    },
    getUserList: function (callback) {
        var exec = new CodeExecutor(this._url);
        exec.run("getUserAccess()", callback);
    },
    getGroupList: function (callback) {
        var exec = new CodeExecutor(this._url);
        exec.run("getGroupAccess()", callback);
    },
    isUserLogin: function (userId) {
        return true;
    },
    login: function (userId, password, callback) {
        this.exec.run("login('" + userId + "','" + password + "')", function (re) {
            var userobj = { userId: userId, loginTimestamp: "" };
            if (re.resultCode === "0") {
                localStorage.setItem("DolphinDB_CurrentUsername", JSON.stringify(userobj));
                callback(true);
            } else if (re.resultCode === "1") {
                localStorage.setItem("DolphinDB_CurrentUsername", "");
                callback(false);
            }
        }, function (exception) {
            console.log(exception);
        });
    },
    logout:function(userId,callback){
        this.exec.run("logout('" + userId + "')", function (re){
            callback(re);
        });
    },
    getCurrentUser: function () {
        var guestUser = { userId: "guest", isAdmin: true };
        var cache = localStorage.getItem("DolphinDB_CurrentUsername");
        if (cache && cache != "") {
            var user = JSON.parse(cache);
            if (user) {
                var re = this.exec.runSync("getUserSelfAccess()");
                if (re.resultCode === "0") {
                    var reTb = new DolphinEntity(re).toScalar();
                    var user = reTb[0];
                    var admin = (parseInt(reTb[2])&1===1);
                    return { userId: user, isAdmin: admin };
                }
                return guestUser;
            }
        }
        return guestUser
    },
    grant: function (id, permisionType, objs, callback) {
        var p = {
            "sessionID": 0,
            "functionName": "grant",
            "params": [{
                "name": "Id",
                "form": "scalar",
                "type": "string",
                "value": id
            }, {
                "name": "permission",
                "form": "scalar",
                "type": "int",
                "value": permisionType
            }, {
                "name": "objs",
                "form": "vector",
                "type": "string",
                "value": objs
            }
            ]
        };
        CallWebApi(this._url, p, callback);
    },
    deny: function (id, permisionType, objs, callback) {
        var p = {
            "sessionID": 0,
            "functionName": "deny",
            "params": [{
                "name": "Id",
                "form": "scalar",
                "type": "string",
                "value": id
            }, {
                "name": "permission",
                "form": "scalar",
                "type": "int",
                "value": permisionType
            }, {
                "name": "objs",
                "form": "vector",
                "type": "string",
                "value": objs
            }
            ]
        };
        CallWebApi(this._url, p, callback);
    },
    revoke: function (id, permisionType, callback) {
        this.exec.run("revoke('" + id + "'," + permisionType + ")", function (re) {
            callback();
        });
    },
    getAllDistributedTables: function (callback) {
        this.exec.run("getAllDdistributedTables()", function (re) {
            var entity = new DolphinEntity(re);
            callback(entity.toTable());
        });
    }
}


