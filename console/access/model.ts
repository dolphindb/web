import { Model } from 'react-object-model'

import { DdbInt, DdbVectorString, type DdbVectorStringObj } from 'dolphindb/browser.js'

import { model } from '../model.js'

import { DATABASES_WITHOUT_CATALOG } from './constants.js'


export interface User {
    userId: string
    password: string
    groupIds?: string[]
    isAdmin?: boolean
}

/** 无 catelog 的 databse */
export interface Database {
    name: string
    tables: string[]
}

export interface Catalog {
    name: string
    schemas: Schema[]
}

/** 有 catelog 的 schema */
export interface Schema {
    schema: string
    dbUrl: string
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
    VIEW_OWNER = 23,
    CATALOG_MANAGE = 24,
    CATALOG_READ = 25,
    CATALOG_WRITE = 26,
    CATALOG_INSERT = 27,
    CATALOG_UPDATE = 28,
    CATALOG_DELETE = 29,
    SCHEMA_MANAGE = 30,
    SCHEMAOBJ_CREATE = 31,
    SCHEMAOBJ_DELETE = 32,
    SCHEMA_READ = 33,
    SCHEMA_WRITE = 34,
    SCHEMA_INSERT = 35,
    SCHEMA_UPDATE = 36,
    SCHEMA_DELETE = 37
}

class AccessModel extends Model<AccessModel> {
    users: string[] = [ ]
    
    groups: string[] = [ ]
    
    catalogs: Catalog[] = [ ]
    
    databases: Database[] = [ ]
    
    shared_tables: string[] = [ ]
    
    stream_tables: string[] = [ ]
    
    function_views: string[] = [ ]
    
    schema_set: Set<string> = new Set()
    
    inited = false
    
    current: {
        role?: 'user' | 'group'
        name?: string
        view?: string
    } = null
    
    accesses = null
    
    async init () {
        if (model.v3)
            await this.get_catelog_list()
        await this.get_user_list()
        await this.get_group_list()
        await this.get_databases_with_tables()
        await this.get_share_tables()
        await this.get_stream_tables()
        await this.get_function_views()
        this.set({ inited: true })
    }
    
    
    async get_databases_with_tables () {
        let databases = await this.get_databases()
        if (model.v3)
            databases = databases.filter(db => !this.schema_set.has(db))
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
        if (model.v3) {
            const databases_without_catalog: Catalog = {
                name: DATABASES_WITHOUT_CATALOG,
                schemas: databases.map(db => ({
                    schema: db,
                    dbUrl: db,
                    tables: dbs_map.get(db) || [ ]
                }))
            }   
            this.set({ catalogs: [...this.catalogs, databases_without_catalog] }) 
        }
        this.set({
            databases: databases.map(db => ({
                name: db,
                tables: dbs_map.get(db) ?? [ ]
            }))
        })
    }
    
    
    async get_catelog_list () {
        const catelog_names = (await model.ddb.invoke<string[]>('getAllCatalogs', [ ]))
        const catalogs = await Promise.all(catelog_names.map(async name => ({ name, schemas: await this.get_schemas_by_catelog(name) })))
        this.set({ catalogs })
    }
    
    
    async get_schemas_by_catelog (catelog: string) {
        const schemas = (await (model.ddb.invoke('getSchemaByCatalog', [catelog]))).data
        const new_schema_set = new Set(this.schema_set)
        schemas.forEach(({ dbUrl }) => new_schema_set.add(dbUrl))
        this.set({ schema_set: new_schema_set })
        const schemas_with_tables = await Promise.all(schemas.map(async (schema: Schema) => ({ ...schema, tables: await this.get_tables(schema.dbUrl) })))
        return schemas_with_tables
    }
    
    
    async get_user_list () {
        this.set({ users: (await model.ddb.invoke<string[]>('getUserList', [ ])) })
    }
    
    
    async update_current_access () {
        access.set({
            accesses:
                this.current.role === 'user'
                    ? (await access.get_user_access([this.current.name]))[0]
                    : (await access.get_group_access([this.current.name]))[0]
        })
    }
    
    // final 属性代表是否获取用户最终权限，只有在用户查看权限界面需要 final = true
    async get_user_access (users: string[], final: boolean = false) {
        return (await model.ddb.call('getUserAccess', [...final ? [new DdbVectorString(users), true] : [new DdbVectorString(users)]])).data().data
    }
    
    
    async get_group_list () {
        this.set({ groups: (await model.ddb.invoke<string[]>('getGroupList', [ ])) })
    }
    
    
    async get_group_access (groups: string[]) {
        return (await model.ddb.call('getGroupAccess', [new DdbVectorString(groups)])).data().data
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
    
    
    async get_tables (db_name?: string): Promise<string[]> {
        return (await model.ddb.call<DdbVectorStringObj>('getDFSTablesByDatabase', [db_name ?? 'dfs://'])).value
    }
    
    
    async get_share_tables () {
        const tables = (await model.ddb.call('objs', [true])).data().data
        this.set({
            shared_tables: tables.filter(table => table.shared && table.type === 'BASIC' && table.form === 'TABLE')
                .map(table => table.name)
        })
    }
    
    
    async get_stream_tables () {
        this.set({
            stream_tables: (await model.ddb.call('getStreamTables', [new DdbInt(0)]))
                .data().data
                .filter(table => table.shared)
                .map(tb => tb.name)
        })
    }
    
    
    async get_function_views () {
        this.set({ function_views: (await model.ddb.call('getFunctionViews', [ ])).data().data.map(fv => fv.name) })
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
