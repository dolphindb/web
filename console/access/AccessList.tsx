import { Table, type TableColumnType } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { t } from '../../i18n/index.js'

import { access, type Catalog } from './model.js'
import { ACCESS_TYPE, NeedInputAccess, STAT_ICONS, TABLE_NAMES, type TABLE_ACCESS } from './constants.js'
import { AccessHeader } from './AccessHeader.js'
import { generate_access_cols, handle_access } from './utils/handle-access.js'


export function AccessList ({ category }: { category: 'database' | 'shared' | 'stream' | 'function_view' | 'script' }) {
    const [showed_accesses, set_showed_accesses] = useState<Record<string, any>>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const { catalogs, current, shared_tables, stream_tables, function_views, accesses } = access.use([
        'catalogs',
        'current',
        'shared_tables',
        'stream_tables',
        'function_views',
        'accesses'
    ])
    
    useEffect(() => {
        (async () => {
            let final_accesses = accesses            // 用户权限列表需要单独获取最终权限去展示
            if (current.role === 'user')
                final_accesses = (await access.get_user_access([current.name], true))[0]
                
            if (!final_accesses)
                return
            let items: Array<string | Catalog> = [ ]
            let tmp_tb_access = [ ]
            
            switch (category) {
                case 'database':
                    items = catalogs
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
                    items = ACCESS_TYPE.script
                    break
                    
                default:
                    break
            }
            for (let item of items) {
                const name = typeof item === 'string' ? item : item.catalog_name
                const tb_ob: TABLE_ACCESS = {
                    name,
                    ...(category === 'script'
                            ? 
                        { stat: final_accesses[name] }
                            : 
                        { access: generate_access_cols(final_accesses, category === 'database' ? 'catalog' : category, name) }),
                    ...(typeof item !== 'string'
                            ? 
                        {
                            schemas: item.schemas.map(schema => ({
                                name: schema.schema,
                                access: generate_access_cols(final_accesses, 'database', schema.dbUrl),
                                tables: schema.tables.map(table => ({
                                    name: table,
                                    access: generate_access_cols(final_accesses, 'table', table)
                                }))
                            }))
                        }
                            : 
                        { })
                }
                tmp_tb_access.push(tb_ob)
            }
            set_showed_accesses(tmp_tb_access)
        })()
    }, [accesses, current, category])
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(
        () => [
            {
                title: TABLE_NAMES[category],
                dataIndex: 'name',
                key: 'name',
                width: 200
            },
            ...(category !== 'script'
                ? (category === 'database' 
                        ? 
                    ACCESS_TYPE.catalog 
                        : 
                    // getUserAccess 并不会 TABLE_WRITE 、TABLE_WRITE 以及所有 SCHEMA 权限,展示时去掉
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
                .filter(({ name }) => name.toLowerCase().includes(search_key.toLowerCase()))
                .map((tb_access: TABLE_ACCESS) => ({
                    key: tb_access.name,
                    name: tb_access.name,
                    ...(category === 'database' ? { schemas: tb_access.schemas } : { }),
                    ...(category !== 'script'
                        ? Object.fromEntries(Object.entries(tb_access.access).map(([key, value]) => [key, STAT_ICONS[value as string]]))
                        : { stat: NeedInputAccess.includes(tb_access.name) ? tb_access.stat : STAT_ICONS[tb_access.stat] })
                }))}
            title={() => <AccessHeader category={category} preview search_key={search_key} set_search_key={set_search_key} />}
            tableLayout='fixed'
            expandable={
                category === 'database'
                    ? {
                        rowExpandable: cl => Boolean(cl.schemas.length),
                        expandedRowRender: (cl: TABLE_ACCESS) => <Table
                            columns={[
                                {
                                    title: t('DFS 数据库'),
                                    dataIndex: 'table_name',
                                    key: 'table_name'
                                },
                                ...ACCESS_TYPE.database
                                    .map(type => ({
                                        title: type,
                                        dataIndex: type,
                                        key: type
                                    }))
                            ]}
                            dataSource={cl.schemas.map(schema => ({
                                key: schema.name,
                                table_name: schema.name,
                                tables: schema.tables,
                                ...Object.fromEntries(Object.entries(schema.access).map(([key, value]) => [key, STAT_ICONS[value as string]]))
                            }))}
                            pagination={false}
                            tableLayout='fixed'
                            expandable={
                                {
                                    rowExpandable: db => Boolean(db.tables.length),
                                    expandedRowRender: db => <Table
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
                                }
                            }
                        />
                    }
                    : { }
            }
        />
}
