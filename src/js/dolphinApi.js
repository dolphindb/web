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

    run: function (script,succallback) {
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
}
ControllerServer.prototype = {
    getDBIdByTabletChunk: function (alias, chunkId, succallback, failcallback) {
        var exec = new CodeExecutor(this._url);
        exec.run("rpc('" + alias + "',getDBIdByTabletChunk,'" + chunkId + "')",succallback);
    },

    getDBIdByTabletChunkSync:function(alias,chunkId){
        var exec = new CodeExecutor(this._url);
        return exec.runSync("rpc('" + alias + "',getDBIdByTabletChunk,'" + chunkId + "')");   
    },

    getTablesByTabletChunk: function (alias,chunkId, succallback, failcallback) {
        var exec = new CodeExecutor(this._url);
        exec.run("rpc('" + alias + "',getTablesByTabletChunk,'" + chunkId + "')",succallback);    
    },
    getTablesByTabletChunkSync: function (alias,chunkId) {
        var exec = new CodeExecutor(this._url);
        return exec.runSync("rpc('" + alias + "',getTablesByTabletChunk,'" + chunkId + "')");    
    },
    getIsEnableHttps: function () {
        var exec = new CodeExecutor(this._url);
        return exec.runSync("isEnableHTTPS()");
    },
    createUser:function(userId){
        var exec = new CodeExecutor(this._url);
        return exec.runSync("createUser('" + userId + "')");
    },
    createGroup:function(groupId){

    },
    deleteUser:function(userId){

    },
    deleteGroup:function(groupId){

    },
    addGroupMember:function(groupId,userId){

    },
    deleteGroupMember:function(groupId,userId){

    },
    changeUserPwd:function(userId,pass){

    },
    getUserGrant:function(userId){

    },
    getUserList:function(callback){
        var exec = new CodeExecutor(this._url);
        exec.run("getAclUsers()",callback);
    },
    getUserAndGroupList:function(callback){
        var exec = new CodeExecutor(this._url);
        exec.run("getUserAndGroup()",callback);
    },
    isUserLogin:function(userId){

    },
}


