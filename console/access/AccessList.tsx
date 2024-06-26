import { Table, type TableColumnType } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { t } from '../../i18n/index.js'

import { access } from './model.js'
import { ACCESS_TYPE, NeedInputAccess, STAT_ICONS, TABLE_NAMES, type TABLE_ACCESS } from './constants.js'
import { AccessHeader } from './AccessHeader.js'


function handle_access (accesses: Record<string, any>, type: string, name: string) {
    // DB_OWNER 单独处理
    if (type === 'DB_OWNER') 
        if (accesses.DB_OWNER === 'allow') 
            if (!accesses.DB_OWNER_allowed) 
                return [type, 'allow']
             else {
                let objs = accesses.DB_OWNER_allowed.split(',')
                for (let obj of objs) {
                    // dfs://test* 变成 dfs://test.*
                    let reg = new RegExp(obj.replace('*', '.*'))
                    console.log(obj, name, reg.test(name))
                    if (reg.test(name)) 
                        return [type, 'allow']
                    
                }
                return [type, 'none']
            }
         else if (accesses.DB_OWNER === 'deny')
             return [type, 'deny']
         else
             return [type, 'none']
        
     else 
        if (accesses[type + '_allowed'] && accesses[type + '_allowed'].split(',').includes(name))
            return [type, 'allow']
        else if (accesses[type + '_denied'] && accesses[type + '_denied'].split(',').includes(name))
            return [type, 'deny']
        else
            return [type, 'none']
    
    
}


export function AccessList ({ category }: { category: 'database' | 'shared' | 'stream' | 'function_view' | 'script' }) {
    const [showed_accesses, set_showed_accesses] = useState<Record<string, any>>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const { current, databases, shared_tables, stream_tables, function_views, accesses } = access.use([
        'current',
        'databases',
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
            let items = [ ]
            let tmp_tb_access = [ ]
            
            switch (category) {
                case 'database':
                    items = databases
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
                const name = typeof item === 'string' ? item : item.name
                const tb_ob: TABLE_ACCESS = {
                    name,
                    ...(category === 'script'
                        ? { stat: final_accesses[name] }
                        : { access: Object.fromEntries(ACCESS_TYPE[category].map(type => handle_access(final_accesses, type, name))) }),
                    ...(typeof item !== 'string'
                        ? {
                            tables: item.tables.map(table => ({
                                name: table,
                                access: Object.fromEntries(ACCESS_TYPE.table.map(type => handle_access(final_accesses, type, table)))
                            }))
                        }
                        : { })
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
                ? ACCESS_TYPE[category]
                    // getUserAccess 并不会返回这两类权限
                    .filter(t => t !== 'TABLE_WRITE' && t !== 'DB_WRITE')
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
        [ ]
    )
    
    return <Table
            columns={cols}
            dataSource={showed_accesses
                .filter(({ name }) => name.toLowerCase().includes(search_key.toLowerCase()))
                .map((tb_access: TABLE_ACCESS) => ({
                    key: tb_access.name,
                    name: tb_access.name,
                    ...(category === 'database' ? { tables: tb_access.tables } : { }),
                    ...(category !== 'script'
                        ? Object.fromEntries(Object.entries(tb_access.access).map(([key, value]) => [key, STAT_ICONS[value as string]]))
                        : { stat: NeedInputAccess.includes(tb_access.name) ? tb_access.stat : STAT_ICONS[tb_access.stat] })
                }))}
            title={() => <AccessHeader category={category} preview search_key={search_key} set_search_key={set_search_key} />}
            tableLayout='fixed'
            expandable={
                category === 'database'
                    ? {
                        expandedRowRender: db => <Table
                            columns={[
                                {
                                    title: t('DFS 表名'),
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
                    : { }
            }
        />
}
