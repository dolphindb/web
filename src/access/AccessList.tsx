import { Table, type TableColumnType } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { access, type Catalog, type Database } from './model.js'
import { ACCESS_TYPE, DATABASES_WITHOUT_CATALOG, NEED_INPUT_ACCESS, STAT_ICONS, TABLE_NAMES } from './constants.js'
import { AccessHeader } from './AccessHeader.js'
import { generate_access_cols } from './utils/handle-access.js'
import type { AccessCategory, TABLE_ACCESS } from './types.js'


export function AccessList ({ category }: { category: AccessCategory }) {
    const [showed_accesses, set_showed_accesses] = useState<Record<string, any>>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const { catalogs, databases, current, shared_tables, stream_tables, function_views, accesses } = access.use([
        'catalogs',
        'databases',
        'current',
        'shared_tables',
        'stream_tables',
        'function_views',
        'accesses'
    ])
    
    const { v3 } = model.use(['v3'])
    
    useEffect(() => {
        (async () => {
            let final_accesses = accesses            // 用户权限列表需要单独获取最终权限去展示
            if (current.role === 'user')
                final_accesses = (await access.get_user_access([current.name], true))[0]
                
            if (!final_accesses)
                return
            let items: Array<string | Catalog | Database> = [ ]
            let tmp_tb_access = [ ]
            
            switch (category) {
                case 'database':
                    items = v3 ?  catalogs : databases
                    break
                case 'shared':
                    items = shared_tables
                    break
                case 'function_view':
                    items = function_views
                    break
                case 'stream':
                    items = stream_tables
                    break
                case 'script':
                    items = current.role === 'group' ? ACCESS_TYPE.script.filter(ac => !NEED_INPUT_ACCESS.includes(ac)) : ACCESS_TYPE.script
                    break
                    
                default:
                    break
            }
            for (let item of items) {
                const name = typeof item === 'string' ? item : item.name
                const tb_ob: TABLE_ACCESS = {
                    name,
                    ...(category === 'script'
                            ? 
                        { stat: final_accesses[name] }
                            : 
                        { access: generate_access_cols(final_accesses, category === 'database' ? v3 ? 'catalog' : 'database' : category, name) }),
                    ...(typeof item !== 'string'
                            ? 
                        {
                           ...v3 ? {
                                schemas: (item as Catalog).schemas.map(schema => ({
                                    name: schema.schema,
                                    access: generate_access_cols(final_accesses, 'database', schema.dbUrl),
                                    tables: schema.tables.map(table => ({
                                        name: table,
                                        access: generate_access_cols(final_accesses, 'table', table)
                                    }))
                                }))
                           } : { 
                                tables: (item as Database).tables.map(table => ({
                                    name: table,
                                    access: generate_access_cols(final_accesses, 'table', table)
                                }))
                           }
                        }
                            : 
                        { })
                }
                tmp_tb_access.push(tb_ob)
            }
            set_showed_accesses(tmp_tb_access)
        })()
    }, [accesses, current, category, v3])
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(
        () => [
            {
                title: v3 && category === 'database' ?  TABLE_NAMES.catalog : TABLE_NAMES[category],
                dataIndex: 'name',
                key: 'name',
                width: 200
            },
            ...(category !== 'script'
                ? (category === 'database' 
                        ? 
                    v3 ? ACCESS_TYPE.catalog : ACCESS_TYPE.database 
                        : 
                    // getUserAccess 并不会返回 TABLE_WRITE 、TABLE_WRITE 以及所有 SCHEMA 权限,展示时去掉
                    ACCESS_TYPE[category].filter(t => t !== 'TABLE_WRITE' && t !== 'TABLE_WRITE'))
                    .map(type => ({
                        title: type,
                        dataIndex: type,
                        key: type,
                        width: 160,
                        align: 'center' as const
                    }))
                : [
                    {
                        title: 'stat',
                        dataIndex: 'stat',
                        key: 'stat',
                        align: 'center' as const
                    }
                ])
        ],
        [ category ]
    )
    
    return <Table
                columns={cols}
                dataSource={showed_accesses
                    .filter(({ name, schemas, tables }) =>
                        includes_searck_key(name, search_key) ||
                            v3 ? schemas?.some((schema: TABLE_ACCESS) => 
                                includes_searck_key(schema.name, search_key) ||
                                schema.tables.some(table => includes_searck_key(table.name, search_key))
                            ) : tables?.some((table: TABLE_ACCESS) => includes_searck_key(table.name, search_key))
                    )
                    .map((tb_access: TABLE_ACCESS) => ({
                        key: tb_access.name,
                        name: tb_access.name,  
                        ...(category === 'database' ? 
                            v3 ? {
                                // 如果父级名称匹配，显示所有schemas；否则进行过滤
                                schemas: includes_searck_key(tb_access.name, search_key) 
                                    ? tb_access.schemas 
                                    : tb_access.schemas.filter(schema =>
                                        includes_searck_key(schema.name, search_key) ||
                                            schema.tables.some(table => includes_searck_key(table.name, search_key))
                                    )
                            } : {
                                // 如果父级名称匹配，显示所有tables；否则进行过滤
                                tables: includes_searck_key(tb_access.name, search_key)
                                    ? tb_access.tables
                                    : tb_access.tables.filter(table => 
                                        includes_searck_key(table.name, search_key)
                                    ) 
                            } 
                        : { }),
                        ...(category !== 'script'
                                ? 
                            Object.fromEntries(Object.entries(tb_access.access).map(([key, value]) => [key, STAT_ICONS[value as string]]))
                                : 
                            { stat: NEED_INPUT_ACCESS.includes(tb_access.name) ? tb_access.stat : STAT_ICONS[tb_access.stat] })
                    }))}
                title={() => <AccessHeader category={category} preview search_key={search_key} set_search_key={set_search_key} />}
                tableLayout='fixed'
                expandable={
                    category === 'database'
                        ? {
                            defaultExpandedRowKeys: v3 ? [DATABASES_WITHOUT_CATALOG] : [ ],
                            rowExpandable: cl =>  Boolean( v3 ? cl.schemas.length : cl.tables.length),
                            expandedRowRender: (cl: TABLE_ACCESS) => 
                                <Table
                                    columns={[
                                        {
                                            title: v3 ? TABLE_NAMES.database : TABLE_NAMES.table,
                                            dataIndex: 'table_name',
                                            key: 'table_name'
                                        },
                                        ...(v3 ? ACCESS_TYPE.database : ACCESS_TYPE.table.filter(t => t !== 'TABLE_WRITE'))
                                            .map(type => ({
                                                title: type,
                                                dataIndex: type,
                                                key: type
                                            }))
                                    ]}
                                    dataSource={v3 ? 
                                        cl.schemas.map(schema => ({
                                            key: schema.name,
                                            table_name: schema.name,
                                            // 过滤 schema 下的 tables
                                            tables: schema.tables.filter(table =>
                                                includes_searck_key(table.name, search_key.toLowerCase())
                                            ),
                                            ...Object.fromEntries(Object.entries(schema.access).map(([key, value]) => [key, STAT_ICONS[value as string]]))
                                        })) : 
                                        cl.tables.map(table => ({
                                            key: table.name,
                                            table_name: table.name,
                                            ...Object.fromEntries(Object.entries(table.access).map(([key, value]) => [key, STAT_ICONS[value as string]]))
                                        }))}
                                    pagination={false}
                                    tableLayout='fixed'
                                    expandable={
                                        v3 ? 
                                            {
                                                rowExpandable: (db: { key: string, table_name: string, tables: TABLE_ACCESS[] }) => Boolean(db.tables.length),
                                                expandedRowRender: (db: { key: string, table_name: string, tables: TABLE_ACCESS[] }) => 
                                                    <Table
                                                        columns={[
                                                            {
                                                                title: t('DFS 表'),
                                                                dataIndex: 'table_name',
                                                                key: 'table_name'
                                                            },
                                                            ...ACCESS_TYPE.table
                                                                .filter(t => t !== 'TABLE_WRITE')
                                                                .map(type => ({
                                                                    title: type,
                                                                    dataIndex: type,
                                                                    key: type
                                                                }))
                                                        ]}
                                                        dataSource={db.tables.map(table => ({
                                                            key: table.name,
                                                            table_name: table.name,
                                                            ...Object.fromEntries(Object.entries(table.access).map(([key, value]) => [key, STAT_ICONS[value as string]]))
                                                        }))}
                                                        pagination={false}
                                                        tableLayout='fixed'
                                                    />
                                            } : { }
                                }
                            />
                        }
                        : { }
            }
        />
}


function includes_searck_key (text: string, search: string) {
    return text.toLowerCase().includes(search.toLowerCase())
}
