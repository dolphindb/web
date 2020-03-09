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
    },

    toMatrix: function(){
        if (typeof this._json != "object") return "";
        if (this._json.resultCode != "0") return "";
        if (this._json.object.length <= 0) return "";
        var jsonobj = this._json.object[0].value;
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
    this.exec = new CodeExecutor(this._url);
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
    },
    getSingleClusterPerf:function(){
        var re = this.runSync("select * from getClusterPerf() where mode = 3");
        var entity = new DolphinEntity(re);
        return entity.toTable();
    },
    authenticateByTicket:function(ticket,callback){
        var p = {
            "sessionID": this._sessionid,
            "functionName": "authenticateByTicket",
            "params": [{
                "name": "ticket",
                "form": "scalar",
                "type": "string",
                "value": ticket
            }]
        };
        CallWebApi(this._url, p, callback);
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
        var p = {
            "sessionID": 0,
            "functionName": "isHttpsOn",
            "params": ""
        };
        return CallWebApiSync(this._url, p);
    },
    getLeaderUrl: function(){
        webUrl = this._url.split('//')[1]
        var exec = new CodeExecutor(this._url);
        var script = `def isSameSubnet(host1,host2){
            p1 = host1.split('.')[0]
            s1 =host1.split('.')[1]
            p2 = host2.split('.')[0]
            s2 =host2.split('.')[1]
            if(p1 ==p2 && s1==s2){
                return true
            }else{
                return false
            }
        }
        def getLeaderUrl(currWebUrl){
            c = currWebUrl.split(':')
            chost = c[0]
            cport = c[1]
            leaderAlias = getActiveMaster()
            t = select host,port,publicName from rpc(leaderAlias,getClusterPerf, true) where name = leaderAlias
            if(size(t)==0) return currWebUrl
            host = t[0].host
            port = t[0].port
            public = t[0].publicName
            if(host == chost && port == cport){
                return currWebUrl
            }else{
                if(isSameSubnet(chost,host)){
                    return host + string(':') + string(port)
                }else{
                    for(ip in public.split(';')){
                        if(isSameSubnet(chost,ip)){
                            return ip + string(':') + port
                        }
                    }
                }
            }
             
        }
        getLeaderUrl('${webUrl}')`

        var re = exec.runSync(encodeURIComponent(script));
        if(re.resultCode=="0") {
            return re.object[0].value;
        }
        else{
            console.log(re.msg)
            return ""
        }
    },    
    addNode:function(host,port,alias){
        var p = {
            "sessionID": this._sessionid,
            "functionName": "addNode",
            "params": [{
                "name": "host",
                "form": "scalar",
                "type": "string",
                "value": host
            },{
                "name": "port",
                "form": "scalar",
                "type": "int",
                "value": port
            },{
                "name": "alias",
                "form": "scalar",
                "type": "string",
                "value": alias
            },{
                "name": "isSave",
                "form": "scalar",
                "type": "bool",
                "value": false
            }]
        };
        return CallWebApi(this._url, p);
    },
    getClusterPerf:function(){
        var p = {
            "sessionID": this._sessionid,
            "functionName": "getClusterPerf",
            "params": [{
                "name": "isShowController",
                "form": "scalar",
                "type": "bool",
                "value": true
            }]
        };
        return CallWebApiSync(this._url, p);
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
        exec.run("lj(table(getUserList() as userId), getUserAccess(), `userId)", function(re){
            var tb = new DolphinEntity(re).toTable();
            callback(tb);
        });
    },
    getGroupList: function (callback) {
        var exec = new CodeExecutor(this._url);
        exec.run("getGroupList()", function(re){
            var vec = new DolphinEntity(re).toVector();
            var reobj = [];
            $.each(vec,function(i,e){
                reobj.push({groupId:e});
            });
            callback(reobj);
        });
    },
    isUserLogin: function (userId) {
        return true;
    },
    login: function (userId, password, callback) {
        var p = {
            "sessionID": 0,
            "functionName": "login",
            "params": [{
                "name": "userId",
                "form": "scalar",
                "type": "string",
                "value": userId
            }, {
                "name": "password",
                "form": "scalar",
                "type": "string",
                "value": password
            }
            ]
        };

        CallWebApi(this._url, p, function (re) {
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

        //this.exec.run("login('" + userId + "','" + password + "')", 
    },
    logout:function(userId,callback){
        this.exec.run("logout()", function (re){
            callback(re);
        });
    },
    getCurrentUser: function () {
        var guestUser = { userId: "guest", isAdmin: false };
        var cache = localStorage.getItem("DolphinDB_CurrentUsername");
        if (cache && cache != "") {
            var user = JSON.parse(cache);
            if (user) {
                var re = this.exec.runSync("getUserAccess()");
                if (re.resultCode === "0") {
                    var reTb = new DolphinEntity(re).toTable();
                    var admin = reTb[0].isAdmin;
                    return { userId: reTb[0].userId, isAdmin: admin };
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
    },
    getAuthenticatedUserTicket:function(){
        var re = this.exec.runSync("getAuthenticatedUserTicket()");
        return re;
    },
    getNodeType:function(){
        var re = this.exec.runSync("getNodeType()");
        return re;
    }
}


