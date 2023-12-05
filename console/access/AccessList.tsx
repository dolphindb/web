import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled, SearchOutlined } from '@ant-design/icons'
import { Button, Input, Table, type TableColumnType } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { t } from '../../i18n/index.js'
import { access } from './model.js'


export const ACCESS_TYPE = {
    database: [ 'DB_MANAGE', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE', 'DB_READ'],
    table: [ 'TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    shared: [ 'TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    stream: ['TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    function_view: ['VIEW_EXEC'],
    script: ['SCRIPT_EXEC', 'TEST_EXEC']
}

export const TABLE_NAMES = {
    database: t('数据库'),
    stream: t('流表'),
    function_view: t('函数视图'),
    script: t('脚本权限')
}


export type table_access = {
    name: string
    access?: object
    stat?: string
}


export const STAT_ICONS = {
    allow: <CheckCircleFilled className='green'/>,
    deny: <CloseCircleFilled className='red'/>,
    none: <MinusCircleFilled className='gray'/>
}

function handle_access (accesses: Record<string, any>, type: string, name: string) {
    if (accesses[type + '_allowed'] && accesses[type + '_allowed'].split(',').includes(name))
        return ([type, 'allow'])
    else if (accesses[type + '_denied'] && accesses[type + '_denied'].split(',').includes(name))
        return ([type, 'deny'])
    else
        return ([type, 'none'])
}


export function AccessList ({ 
    category 
}: {
    category: 'database' | 'shared' | 'stream' | 'function_view' | 'script'
}) {
    
    const [showed_accesses, set_showed_accesses] = useState<Record<string, any>>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const { databases, shared_tables, stream_tables, function_views, accesses } = access.use(['databases', 'shared_tables', 'stream_tables', 'function_views', 'accesses'])
    
    useEffect(() => {
        if (!accesses)
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
            const tb_ob: table_access  = {
                name,
                ...category === 'script' ? 
                                { stat: accesses[name] } 
                                        : 
                { access: Object.fromEntries(ACCESS_TYPE[category].map(type => 
                    handle_access(accesses, type, name)
                )) 
                },
                ... typeof item !== 'string' ?
                    {
                        tables: item.tables.map(table => (
                            {
                                name: table,
                                access: Object.fromEntries(ACCESS_TYPE.table.map(type => 
                                    handle_access(accesses, type, table)
                                )),
                            }
                        ))
                    }
                                            :   { }
            }
            tmp_tb_access.push(tb_ob)
        }
        set_showed_accesses(tmp_tb_access)
           
    }, [accesses, category, databases, stream_tables, function_views])
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(() => ([
        {
            title: TABLE_NAMES[category],
            dataIndex: 'name',
            key: 'name',
          
        },
        ... category !== 'script' ? ACCESS_TYPE[category].filter(t => t !== 'TABLE_WRITE').map(type => ({
            title: type,
            dataIndex: type,
            key: type,
            width: 200
        })) : [{ 
            title: 'stat',
            dataIndex: 'stat',
            key: 'stat',
        }]
    ]), [ ])
    
    
    return <Table 
            columns={cols}
            dataSource={showed_accesses.filter(({ name }) =>
                name.toLowerCase().includes(search_key.toLowerCase())).
                    map(tb_access => ({
                            key:  tb_access.name,
                            name: tb_access.name,
                            ...category === 'database' ? 
                                            { tables: tb_access.tables }
                                                    :
                                            { },
                            ...category !== 'script' ? 
                                Object.fromEntries(Object.entries(tb_access.access).map(
                                    ([key, value]) => [ key, STAT_ICONS[value as string] ])) : 
                                    { stat: STAT_ICONS[tb_access.stat] }
            }))}
            title={() => 
                <AccessHeader 
                    category={category} 
                    preview
                    search_key={search_key}
                    set_search_key={set_search_key}/>
            }
            tableLayout='fixed'
            expandable={ category === 'database' ? {
                expandedRowRender: db => 
                    <Table
                        columns={
                            [
                                {
                                    title: t('dfs 表名'),
                                    dataIndex: 'table_name',
                                    key: 'table_name',
                                    
                                },
                                ...ACCESS_TYPE.table.filter(t => t !== 'TABLE_WRITE').map(type => ({
                                    title: type,
                                    dataIndex: type,
                                    key: type,
                                }))
                            ]
                        }
                        dataSource={
                            db.tables.map(table => ({
                                key: table.name,
                                table_name: table.name,
                                ...Object.fromEntries(Object.entries(table.access).map(
                                    ([key, value]) => [key, STAT_ICONS[value as string]]))
                                        
                            }))
                        }
                        pagination={false}
                        tableLayout='fixed'
                    />
            } : { } }
   />
}

export function AccessHeader ({
    category,
    preview,
    search_key,
    set_search_key,
    open
}: {
    preview: boolean
    category: string
    search_key: string
    set_search_key: (str: string) => void
    open?: () => void
}) {
    const { current } = access.use(['current', 'users', 'groups'])
    
    return <div className='actions'>
            
            <Button  
                onClick={() => { access.set({ current: null }) }}>
                {t('返回{{role}}列表', { role: current.role === 'user' ? t('用户') : t('组') })}
            </Button>
            
            {preview ? 
            <Button  
                onClick={() => { access.set({ current: { ...access.current, view: 'manage' } }) }}>
                {t('权限管理')}
            </Button>  : 
            <>
                <Button onClick={open}>
                    {t('新增权限')}
                </Button>
                <Button onClick={() => { access.set({ current: { ...current, view: 'preview' } }) }}>
                    {t('权限查看')}
                </Button>
            </> 
            }
            <Input  
                className='search'
                value={search_key}
                prefix={<SearchOutlined />}
                onChange={e => { set_search_key(e.target.value) }} 
                placeholder={t('请输入想要搜索的{{category}}', { category: TABLE_NAMES[category] })} 
            />
        </div>
}
