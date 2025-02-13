import { Model } from 'react-object-model'

import { DdbInt, DdbVectorString } from 'dolphindb/browser.js'

import { DdbNodeState, model, NodeType } from '@/model.ts'

import { DATABASES_WITHOUT_CATALOG } from './constants.tsx'


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
    tables: string[] = [ ]
    
    
    async get_catelog_with_schemas () {
        this.tables = await this.get_tables()
        const catelog_names = await model.ddb.invoke<string[]>('getAllCatalogs')
        const catalogs = await Promise.all(catelog_names.map(async name => ({ name, schemas: await this.get_schemas_by_catelog(name) })))
        return [...catalogs, await this.get_databases_with_tables(true)]
    }
    
    async get_catelog_with_schemas_v2 () {
        return [{ 
            name: DATABASES_WITHOUT_CATALOG, 
            schemas: ((await this.get_databases_with_tables()) as Database[]).
                        map(db => ({ schema: db, dbUrl: db, tables: [ ] })) 
        }]
    }
    
    async get_databases_with_tables (has_schema: boolean = false) {
        let databases = await this.get_databases()
        if (has_schema) {
            let schema_set = new Set<string>()
            const catelog_names = await model.ddb.invoke<string[]>('getAllCatalogs')
            const schemas = (await Promise.all(catelog_names.map(async name => (await model.ddb.invoke('getSchemaByCatalog', [name])).data))).flat(2)
            schemas.forEach(({ dbUrl }) => schema_set.add(dbUrl))
            databases = databases.filter(db => !schema_set.has(db))
        }
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
        if (has_schema) 
            return {
                name: DATABASES_WITHOUT_CATALOG,
                schemas: databases.map(db => ({
                    schema: db,
                    dbUrl: db,
                    tables: dbs_map.get(db) || [ ]
                }))
            }   
        return databases.map(db => ({
            name: db,
            tables: dbs_map.get(db) ?? [ ]
        }))
    }
    
    
    async get_schemas_by_catelog (catelog: string) {
        const schemas = (await model.ddb.invoke('getSchemaByCatalog', [catelog]))
            .data
        const schemas_with_tables = await Promise.all(
                schemas.map(
                    async (schema: Schema) => ({ ...schema, tables: this.tables.filter(tb => tb.startsWith(`${schema.dbUrl}/`)) }))
                )
        return schemas_with_tables
    }
    
    
    async get_user_list () {
        return model.ddb.invoke<string[]>('getUserList')
    }
    
    // final 属性代表是否获取用户最终权限，只有在用户查看权限界面需要 final = true
    async get_user_access (users: string[], final: boolean = false) {
        if (!users?.length)
            return [ ]
        return (await model.ddb.invoke('getUserAccess', [...final ? [users, true] : [users]]))
            .data
    }
    
    
    async get_group_list () {
        return model.ddb.invoke('getGroupList')
    }
    
    
    async get_group_access (groups: string[]) {
        if (!groups?.length)
            return [ ]
        return (await model.ddb.invoke('getGroupAccess', [ groups ])).data
    }
    
    
    async create_user (user: User) {
        const { userId, password, groupIds = [ ], isAdmin = false } = user
        await model.ddb.invoke('createUser', [userId, password, new DdbVectorString(groupIds), isAdmin])
    }
    
    
    async delete_user (user: string) {
        await model.ddb.invoke('deleteUser', [user])
    }
    
    
    async reset_password (user: string, password: string) {
        await model.ddb.invoke('resetPwd', [user, password])
    }
    
    // user_names 和 group_names 不能同时为数组
    async add_group_member (users: string[] | string, groups: string[] | string) {
        if (!users || !groups || !users.length || !groups.length)
            return
        await model.ddb.invoke(
            'addGroupMember',
            [ users, groups ]
        )
    }
    
    
    async create_group (group: string, users: string[]) {
        await model.ddb.invoke('createGroup', [group, users])
    }
    
    
    async delete_group (group: string) {
        await model.ddb.invoke('deleteGroup', [group])
    }
    
    
    async get_users_by_group (group: string) {
        return (await model.ddb.invoke('getUsersByGroupId', [group])).data
    }
    
    
    // user_names 和 group_names 不能同时为数组
    async delete_group_member (users: string[] | string, groups: string[] | string) {
        if (!users || !groups || !users.length || !groups.length)
            return
        await model.ddb.invoke(
            'deleteGroupMember',
            [ users, groups ]
        )
    }
    
    
    async get_databases (): Promise<string[]> {
        return (model.ddb.invoke<string[]>('getClusterDFSDatabases'))
    }
    
    
    async get_tables () {
        return model.ddb.invoke<string[]>('getClusterDFSTables')
    }
    
    
    async get_share_tables () {
        return (await model.ddb.invoke('objs', 
                    [true], 
                    { nodes: model.nodes
                        .filter(node => node.mode !== NodeType.agent && node.state === DdbNodeState.online)
                        .map(node => node.name) 
                    }
                )).data
                .filter(table => table.shared && table.type === 'BASIC' && table.form === 'TABLE')
                .map(table => `${table.node}:${table.name}`)
    }
    
    
    async get_stream_tables () {
        return (await model.ddb.invoke('getStreamTables', [new DdbInt(0)])).data    
            .filter(table => table.shared)
            .map(tb => tb.name)
            .map(table => `${model.node.name}:${table}`)
    }
    
    
    async get_function_views () {
        return (await model.ddb.invoke('getFunctionViews')).data.map(fv => fv.name)
    }
    
    
    async grant (user: string, access: string, obj?: string | number) {
        await model.ddb.invoke('grant', obj ? [user, new DdbInt(Access[access]), obj] : [user, new DdbInt(Access[access])])
    }
    
    
    async deny (user: string, access: string, obj?: string) {
        await model.ddb.invoke('deny', obj ? [user, new DdbInt(Access[access]), obj] : [user, new DdbInt(Access[access])])
    }
    
    
    async revoke (user: string, access: string, obj?: string) {
        await model.ddb.invoke('revoke', obj ? [user, new DdbInt(Access[access]), obj] : [user, new DdbInt(Access[access])])
    }
    
}


export let access = new AccessModel()
