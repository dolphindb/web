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
    getLicense: function(){
        var re = this.exec.runSync("license()")
        return re
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
    },
    getNodeType:function(){
        var re = this.exec.runSync("getNodeType()");
        return re;
    },
    addFunction:function(funcDef) {
        this.exec.runSync(funcDef);
    },
    getFunctionViews:function() {
        var re = this.exec.runSync("getFunctionViews()");
        return re;
    },
    addFunctionView:function(funcName) {
        this.exec.runSync("addFunctionView(" + funcName + ")");
    },
    dropFunctionView:function(funcName) {
        this.exec.runSync("dropFunctionView('" + funcName + "')");
    },
    getGroupList: function() {
        var re = this.exec.runSync("getGroupList()");
        return re;
    },
    getUsersByGroupId: function(groupId) {
        var re = this.exec.runSync("getUsersByGroupId('" + groupId + "')");
        return re;
    },
    getUserList: function() {
        var re = this.exec.runSync("getUserList()");
        return re;
    },
    getRecentJobs: function() {
        var re = this.exec.runSync("getRecentJobs(")
        return re;
    },
   
    getClusterDFSTables: function() {
        var re = this.exec.runSync("getClusterDFSTables()");
        return re;
    },

    getClusterDFSDatabases: function() {
        var re = this.exec.runSync("getClusterDFSDatabases()");
        return re;
    },
    getGroupAccess: function(groupId) {
        var re = this.exec.runSync("getGroupAccess('" + groupId + "')");
        return re;
    },
    getUserAccess: function(userId) {
        var re = this.exec.runSync("getUserAccess('" + userId + "')");
        return re;
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
    getLicense: function(){
        var re = this.exec.runSync("license()")
        return re
        // var entity = new DolphinEntity(re);
        // return entity.toTable()
    },
    getVersion: function(){
        var re = this.exec.runSync("version()")
        return re
    },
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
                    return host + ":" + string(port)
                }else{
                    for(ip in public.split(';')){
                        if(isSameSubnet(chost,ip)){
                            return ip + ":" + port
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
    isLeader: function(){
        var exec = new CodeExecutor(this._url);
        var script = "getActiveMaster()==getNodeAlias()"
        var re = exec.runSync(encodeURIComponent(script))
        if(re.resultCode=="0") {
            if(re.object[0].value=="1"){
                return true;
            } else {
                return false;
            }
        }
        else{
            console.log(re.msg)
            return false
        }
    },
    getCurrentLeader: function(){
        var exec = new CodeExecutor(this._url);
        var script = "exec first(site) from rpc(getActiveMaster(),getClusterPerf,true) where mode=2"
        var re = exec.runSync(encodeURIComponent(script))
        if(re.resultCode=="0") {
            return re.object[0].value;
        }
        else{
            alert(re.msg)            
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
    // add computenode addNode(host, port, alias, [saveConfig], [nodeType='datanode'])
    addComputeNode: function(host,port,alias){
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
                "value": true
            },{
                "name": "nodeType",
                "form": "scalar",
                "type": "string",
                "value": "computenode"
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
    cancelJob: function (node,jobId,callback) {
        // console.log("excuting...");
        this.exec.run("rpc('"+ node + "',cancelJob,'"+ jobId+"')",callback)
        
        // this.exec.run("cancelJob('"+ jobid + "')",callback)
    },
    cancelConsoleJob: function(node,rootJobId,callback){
        // this.exec.run("cancelConsoleJob('"+ rootJobId +"')",callback)
        this.exec.run("rpc('"+ node + "',cancelConsoleJob,'"+ rootJobId+"')",callback)
    },
    deleteScheduledJob: function(node,jobId,callback){
        // this.exec.run("deleteScheduledJob('"+jobId+"')",callback)
        this.exec.run("rpc('"+ node + "',deleteScheduledJob,'"+ jobId+"')",callback)
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
        exec.run("getUserAccess(getUserList())", function(re){
            // console.log(new DolphinEntity(re));
            var tb = new DolphinEntity(re).toTable();
            callback(tb);
        });
    },
    getRecentJobs: function (callback) {
        var exec = new CodeExecutor(this._url);
        exec.run("pnodeRun(getRecentJobs)", function(re){
            // console.log(new DolphinEntity(re));
            var tb = new DolphinEntity(re).toTable()
            callback(tb);
        });
    },
    getConsoleJobs: function (callback) {
        this.exec.run("pnodeRun(getConsoleJobs)",function(re){
            var tb = new DolphinEntity(re).toTable()
            callback(tb);
        })
    },
    getScheduledJobs: function(callback){
        this.exec.run("pnodeRun(getScheduledJobs)",function(re){
            // console.log(new DolphinEntity(re));
            var tb = new DolphinEntity(re).toTable()
            callback(tb);
        })
    },
    getGroupList: function (callback) {
        var exec = new CodeExecutor(this._url);
        exec.run("getGroupAccess(getGroupList())", function(re){
            var vec = new DolphinEntity(re).toTable();
            var reobj = [];
            $.each(vec,function(i,e){
                reobj.push(e);
            });
            //
            // console.log(reobj);
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
                callback({"result":true, "msg":""});
            } else if (re.resultCode === "1") {
                localStorage.setItem("DolphinDB_CurrentUsername", "");
                var haMsgIndex = re.msg.indexOf("<NotLeader>");
                var reMsg = "The user name or password is incorrect."
                if(haMsgIndex>=0)
                    reMsg = "Login is only supported on the active master : " + re.msg.replace("<NotLeader>","")
                callback({"result":false, "msg":reMsg});
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
        // var p = {
        //     "sessionID": 0,
        //     "functionName": "grant",
        //     "params": [{
        //         "name": "Id",
        //         "form": "scalar",
        //         "type": "string",
        //         "value": id
        //     }, {
        //         "name": "permission",
        //         "form": "scalar",
        //         "type": "int",
        //         "value": permisionType
        //     }, {
        //         "name": "objs",
        //         "form": "vector",
        //         "type": "string",
        //         "value": objs
        //     }
        //     ]
        // };
        // CallWebApi(this._url, p, callback);

        this.exec.run("grant('" + id + "'," + permisionType + ", '" + objs + "')", function (re) {
            callback();
        });
    },
    deny: function (id, permisionType, objs, callback) {
        // var p = {
        //     "sessionID": 0,
        //     "functionName": "deny",
        //     "params": [{
        //         "name": "Id",
        //         "form": "scalar",
        //         "type": "string",
        //         "value": id
        //     }, {
        //         "name": "permission",
        //         "form": "scalar",
        //         "type": "int",
        //         "value": permisionType
        //     }, {
        //         "name": "objs",
        //         "form": "vector",
        //         "type": "string",
        //         "value": objs
        //     }
        //     ]
        // };
        // CallWebApi(this._url, p, callback);
        if (objs.length===0){
            this.exec.run("deny('" + id + "'," + permisionType + ")", function (re) {
                callback();
            });
        }else{
            this.exec.run("deny('" + id + "'," + permisionType + ", '" + objs + "')", function (re) {
                callback();
            });
        }
       

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


