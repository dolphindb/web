import { Input, Table, type TableColumnType } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { t } from '@i18n'

import { model } from '@model'

import { DDBTable } from '@/components/DDBTable/index.tsx'

import { type Catalog, type Database } from './model.ts'
import { ACCESS_TYPE, DATABASES_WITHOUT_CATALOG, NEED_INPUT_ACCESS, STAT_ICONS, TABLE_NAMES } from './constants.tsx'
import { generate_access_cols } from './utils/handle-access.ts'
import type { AccessCategory, AccessRole, TABLE_ACCESS } from './types.ts'
import { use_access } from './hooks/use-access.ts'
import { use_access_objs } from './hooks/use-access-objs.ts'

export function AccessList ({ role, name, category }: { role: AccessRole, name: string, category: AccessCategory }) {
    const [showed_accesses, set_showed_accesses] = useState<Record<string, any>>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const { data: access_objs = [ ] } = use_access_objs(role, category)
    
    const [input_value, set_input_value] = useState(search_key)
    
    const { v3 } = model
    
    const { data: accesses } = use_access(role, name, true)
    
    useEffect(() => {
        (async () => {
            let tmp_tb_access = [ ]
            
            if (!access_objs || !accesses) 
                return
            
        
            for (let item of access_objs) {
                const name = typeof item === 'string' ? item : item.name
                const tb_ob: TABLE_ACCESS = {
                    name,
                    ...(category === 'script'
                            ? 
                        { stat: accesses[name] }
                            : 
                        { access: generate_access_cols(accesses, category === 'database' ? v3 ? 'catalog' : 'database' : category, name) }),
                    ...(typeof item !== 'string'
                            ? 
                        {
                           ...v3 ? {
                                schemas: (item as Catalog).schemas.map(schema => ({
                                    name: schema.schema,
                                    access: generate_access_cols(accesses, 'database', schema.dbUrl),
                                    tables: schema.tables.map(table => ({
                                        name: table,
                                        access: generate_access_cols(accesses, 'table', table)
                                    }))
                                }))
                           } : { 
                                tables: (item as Database).tables.map(table => ({
                                    name: table,
                                    access: generate_access_cols(accesses, 'table', table)
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
    }, [accesses, access_objs, role, name, category, v3])
    
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
        [category, access_objs]
    )
    if (!access_objs)
        return null
    
    return <DDBTable
                columns={cols}
                dataSource={showed_accesses
                    .filter(({ name, schemas, tables }) =>
                        includes_searck_key(name, search_key) ||
                            (v3 ? schemas?.some((schema: TABLE_ACCESS) => 
                                includes_searck_key(schema.name, search_key) ||
                                schema.tables.some(table => includes_searck_key(table.name, search_key))
                            ) : tables?.some((table: TABLE_ACCESS) => includes_searck_key(table.name, search_key)))
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
                filter_form={<Input.Search
                    value={input_value}
                    onChange={e => {
                        set_input_value(e.target.value)
                    }}
                    onPressEnter={() => { set_search_key(input_value) }}
                    placeholder={t('请输入想要搜索的{{category}}', { category: category === 'database' && v3 ? `${TABLE_NAMES.catalog} / ${TABLE_NAMES.database} / ${TABLE_NAMES.table}` : TABLE_NAMES[category] })}
                />}
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
