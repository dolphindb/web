import { Model } from 'react-object-model'

import { DdbInt, DdbVectorString, type DdbVectorStringObj } from 'dolphindb/browser.js'

import { model } from '../model.js'


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


enum Access {
    TABLE_READ = 0,
    TABLE_WRITE = 1,
    DBOBJ_CREATE = 2,
    DBOBJ_DELETE = 3,
    DB_MANAGE = 4,
    VIEW_EXEC = 5,
    SCRIPT_EXEC = 6,
    TEST_EXEC = 7,
    DB_OWNER = 10,
    QUERY_RESULT_MEM_LIMIT = 11,
    TASK_GROUP_MEM_LIMIT = 12,
    TABLE_INSERT = 13,
    TABLE_UPDATE = 14,
    TABLE_DELETE = 15,
    DB_READ = 16,
    DB_WRITE = 17,
    DB_INSERT = 18,
    DB_UPDATE = 19,
    DB_DELETE = 20,
    VIEW_OWNER = 23
}

class AccessModel extends Model<AccessModel> {
    users: string[] = [ ]
    
    groups: string[] = [ ]
    
    databases: Database[] = [ ]
    
    shared_tables: string[] = [ ]
    
    stream_tables: string[] = [ ]
    
    function_views: string[] = [ ]
    
    inited = false
    
    current: {
        role?: 'user' | 'group'
        name?: string
        view?: string
    } = null
    
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
        const tables = await this.get_tables()
        const databases_sort = [...databases].sort((a, b) => b.length - a.length)
        const dbs_map = new Map<string, string[]>()
        tables.forEach(tb => {
            for (let db of databases_sort) 
                if (tb.startsWith(db)) {
                    if (!dbs_map.has(db))
                        dbs_map.set(db, [ ])
                    let tbs = dbs_map.get(db)
                    tbs.push(tb)
                    break
                }
            
        })
        this.set({
            databases: databases.map(db => ({
                name: db,
                tables: dbs_map.get(db) ?? [ ]
            }))
        })
    }
    
    
    async get_user_list () {
        this.set({ users: (await model.ddb.call<DdbVectorStringObj>('getUserList', [ ])).value })
    }
    
    // final 属性代表是否获取用户最终权限，只有在用户查看权限界面需要 final = true
    async get_user_access (users: string[], final: boolean = false) {
        return (await model.ddb.call('getUserAccess', [...final ? [new DdbVectorString(users), true] : [new DdbVectorString(users)]])).to_rows()
    }
    
    
    async get_group_list () {
        this.set({ groups: (await model.ddb.call('getGroupList', [ ])).value as string[] })
    }
    
    
    async get_group_access (groups: string[]) {
        return (await model.ddb.call('getGroupAccess', [new DdbVectorString(groups)])).to_rows()
    }
    
    
    async create_user (user: User) {
        const { userId, password, groupIds = [ ], isAdmin = false } = user
        await model.ddb.call('createUser', [userId, password, new DdbVectorString(groupIds), isAdmin])
    }
    
    
    async delete_user (user: string) {
        await model.ddb.call('deleteUser', [user])
    }
    
    
    async reset_password (user: string, password: string) {
        await model.ddb.call('resetPwd', [user, password])
    }
    
    // user_names 和 group_names 不能同时为数组
    async add_group_member (users: string[] | string, groups: string[] | string) {
        if (!users || !groups || !users.length || !groups.length)
            return
        await model.ddb.call(
            'addGroupMember',
            [Array.isArray(users) ? new DdbVectorString(users) : users, Array.isArray(groups) ? new DdbVectorString(groups) : groups]
        )
    }
    
    
    async create_group (group: string, users: string[]) {
        await model.ddb.call('createGroup', [group, new DdbVectorString(users)])
    }
    
    
    async delete_group (group: string) {
        await model.ddb.call('deleteGroup', [group])
    }
    
    
    async get_users_by_group (group: string) {
        return (await model.ddb.call<DdbVectorStringObj>('getUsersByGroupId', [group])).value
    }
    
    
    // user_names 和 group_names 不能同时为数组
    async delete_group_member (users: string[] | string, groups: string[] | string) {
        if (!users || !groups || !users.length || !groups.length)
            return
        await model.ddb.call(
            'deleteGroupMember',
            [
                Array.isArray(users) ? new DdbVectorString(users) : users,
                Array.isArray(groups) ? new DdbVectorString(groups) : groups
            ]
        )
    }
    
    
    async get_databases (): Promise<string[]> {
        return (await (model.ddb.call<DdbVectorStringObj>('getClusterDFSDatabases', [ ]))).value
    }
    
    
    async get_tables (): Promise<string[]> {
        return (await model.ddb.call<DdbVectorStringObj>('getDFSTablesByDatabase', ['dfs://'])).value
    }
    
    
    async get_share_tables () {
        const tables = (await model.ddb.call('objs', [true])).to_rows()
        this.set({
            shared_tables: tables.filter(table => table.shared && table.type === 'BASIC' && table.form === 'TABLE')
                .map(table => table.name)
        })
    }
    
    
    async get_stream_tables () {
        this.set({
            stream_tables: (await model.ddb.call('getStreamTables', [new DdbInt(0)]))
                .to_rows()
                .filter(table => table.shared)
                .map(tb => tb.name)
        })
    }
    
    
    async get_function_views () {
        this.set({ function_views: (await model.ddb.call('getFunctionViews', [ ])).to_rows().map(fv => fv.name) })
    }
    
    
    async grant (user: string, access: string, obj?: string | number) {
        await model.ddb.call('grant', obj ? [user, new DdbInt(Access[access]), typeof obj === 'number' ? new DdbInt(obj) : obj] : [user, new DdbInt(Access[access])])
    }
    
    
    async deny (user: string, access: string, obj?: string) {
        await model.ddb.call('deny', obj ? [user, new DdbInt(Access[access]), obj] : [user, new DdbInt(Access[access])])
    }
    
    
    async revoke (user: string, access: string, obj?: string) {
        await model.ddb.call('revoke', obj ? [user, new DdbInt(Access[access]), obj] : [user, new DdbInt(Access[access])])
    }
    
    // async handle_validate_error (func: Function) {
    //     try {
    //         await func()
    //     } catch (error) {
    //         if (error instanceof DdbDatabaseError) {
    //             model.show_error({ error })
    //             return
    //         }
    //         const { errorFields } = error
    //         error = errorFields.reduce((error_msg, curent_err) => 
    //             error_msg += curent_err.errors
    //         , '')
    //         model.show_error({ content: error })
    //     }
    // }
}


export let access = new AccessModel()
