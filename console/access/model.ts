import { Model } from 'react-object-model'
import { model } from '../model.js'
import { DdbBool, DdbInt, DdbVectorString, DdbVoid } from 'dolphindb/browser.js'

export interface User {
    userId: string
    password: string
    groupIds?: string[]
    isAdmin?: boolean
}

export interface Database {
    name: string
    tables: string[]
}

const ACCESS_NUM = {
    TABLE_READ: 0,
    TABLE_WRITE: 1,
    DBOBJ_CREATE: 2,
    DBOBJ_DELETE: 3,
    DB_MANAGE: 4,
    VIEW_EXEC: 5,
    SCRIPT_EXEC: 6,
    TEST_EXEC: 7,
    TABLE_INSERT: 13,
    TABLE_UPDATE: 14,
    TABLE_DELETE: 15,
    DB_READ: 16,
    DB_INSERT: 18,
    DB_UPDATE: 19,
    DB_DELETE: 20
}

class AccessModel extends Model<AccessModel> {
    
    users: string[] = [ ]
    
    groups: string[] = [ ]
    
    databases: Database[] = [ ]
    
    shared_tables: string[] = [ ]
    
    stream_tables: string[] = [ ]
    
    function_views: string[] = [ ]
    
    inited = false
    
    current = null
    
    accesses = null
    
    async init () {
        this.get_user_list()
        this.get_group_list()
        this.get_databases_with_tables()
        this.get_share_tables()
        this.get_stream_tables()
        this.get_function_views()
        this.set({ inited: true })
    }
    
    
    async get_databases_with_tables () {
        const databases = await this.get_databases()
        const dbs = [ ]
        for (let db of databases) {
            let tables = await this.get_tables(db)
            dbs.push({
                name: db,
                tables
            })
        } 
        this.set({ databases: dbs })
    }
    
    
    async get_user_list () {
        this.set({ users: (await model.ddb.call('getUserList', [ ], { urgent: true })).value as string[] })
    }
    
    
    async get_user_access (users: string[]) {
        return (await model.ddb.call('getUserAccess', [new DdbVectorString(users)], { urgent: true })).to_rows()
    }
    
    
    async get_group_list () {
        this.set({ groups: (await model.ddb.call('getGroupList', [ ], { urgent: true })).value as string[] })
    }
    
    
    async get_group_access (groups: string[]) {
        return (await model.ddb.call('getGroupAccess', [new DdbVectorString(groups)], { urgent: true })).to_rows()
    }
    
    
    async create_user (user: User) {
        const { userId, password, groupIds = [ ], isAdmin = false } = user
        await model.ddb.call('createUser', [userId, password, new DdbVectorString(groupIds), isAdmin], { urgent: true })
    }
    
    
    async delete_user (user: string) {
        await model.ddb.call('deleteUser', [user], { urgent: true })
    }
    
    
    async reset_password (user: string, password: string) {
        await model.ddb.call('resetPwd', [user, password], { urgent: true })
    }
    
    // user_names 和 group_names 不能同时为数组
    async add_group_member (users: string[] | string, groups: string[] | string) {
        if (!users || !groups || !users.length || !groups.length)
            return
        await model.ddb.call('addGroupMember', 
                            [ 
                                Array.isArray(users) ? new DdbVectorString(users) : users,
                                Array.isArray(groups) ? new DdbVectorString(groups) : groups
                            ],
                            { urgent: true }
                )
    }
    
    
    async create_group (group: string, users: string[]) {
        await model.ddb.call('createGroup', [group, new DdbVectorString(users)], { urgent: true })
    }
    
    
    async delete_group (group: string) {
        await model.ddb.call('deleteGroup', [group], { urgent: true })
    }
    
    
    async get_users_by_group (group: string) {
        return (await model.ddb.call('getUsersByGroupId', [group], { urgent: true })).value as string[]
    }
    
    
    // user_names 和 group_names 不能同时为数组
    async delete_group_member (users: string[] | string, groups: string[] | string) {
        if (!users || !groups || !users.length || !groups.length)
            return
        await model.ddb.call('deleteGroupMember', 
                            [ 
                                Array.isArray(users) ? new DdbVectorString(users) : users,
                                Array.isArray(groups) ? new DdbVectorString(groups) : groups
                            ],
                            { urgent: true }
                )
    }
    
    
    async get_databases (): Promise<string[]> {
        return (await (model.ddb.call('getClusterDFSDatabases', [ ], { urgent: true }))).value as string[]
    }
    
    
    async get_tables (database: string): Promise<string[]> {
        return (await model.ddb.call('getDFSTablesByDatabase', [database], { urgent: true })).value as string[]
    }
    
    
    async get_share_tables () {
        const tables =  (await model.ddb.call('objs', [new DdbBool(true)], { urgent: true })).to_rows()
        this.set({ shared_tables: tables.filter(table => table.shared && table.type === 'BASIC' && table.form === 'TABLE').map(table => table.name) })
    }
    
    
    async get_stream_tables () {
        this.set({ stream_tables: (await model.ddb.call('getStreamTables', [new DdbInt(0)], { urgent: true })).to_rows().map(tb => tb.name) })
    }
    
    
    async get_function_views () {
        this.set({ function_views: (await model.ddb.call('getFunctionViews', [ ], { urgent: true })).to_rows().map(fv => fv.name) })
    }
    
    
    async grant (user: string, aces: string, obj?: string) {
        console.log(user, aces, obj)
        await model.ddb.call('grant', obj ? [ user, new DdbInt(ACCESS_NUM[aces]), obj ] : [user, new DdbInt(ACCESS_NUM[aces])], { urgent: true })
    }
    
    
    async deny (user: string, aces: string, obj?: string) {
        await model.ddb.call('deny', obj ? [user, new DdbInt(ACCESS_NUM[aces]), obj ] :  [user, new DdbInt(ACCESS_NUM[aces])], { urgent: true })
    }
    
    
    async revoke (user: string, aces: string, obj?: string) {
        await model.ddb.call('revoke', obj ? [user, new DdbInt(ACCESS_NUM[aces]), obj ] : [user, new DdbInt(ACCESS_NUM[aces])], { urgent: true })
    }
    
}


export let access = new AccessModel()
