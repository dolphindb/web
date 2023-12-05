import { Tabs, Table, Button, Input, type TableColumnType, type TabsProps, Modal, Form, Select, TreeSelect, Collapse, Radio, Checkbox, Divider } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { t } from '../../i18n/index.js'

import { access, type Database } from './model.js'
import { model } from '../model.js'
import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled, MinusCircleOutlined, PlusCircleOutlined, PlusOutlined, QuestionCircleFilled, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/modal.js'

export function AccessView () {
    
    const { current, users, groups, } =  access.use(['current', 'users', 'groups'])
    
    const { role, name, view } = current
     
    const [tab_key, set_tab_key] = useState('database')
    
    const [refresher, set_refresher] = useState({ })
    
    useEffect(() => {
        model.execute(async () =>  { 
            access.set({ accesses: role === 'user' ? 
                (await access.get_user_access([name]))[0]
                    :
                (await access.get_group_access([name]))[0] }) 
        })
    }, [refresher, role, name])
    
    const tabs: TabsProps['items'] = useMemo(() => ([
        {
            key: 'database',
            label: t('分布式数据库'),
            children: view === 'preview' ? 
                        <AccessList category='database'/>
                            :
                        <AccessManage category='database'/>
        },
        {
            key: 'share_table',
            label: t('共享内存表'),
            children: view === 'preview' ? 
                        <AccessList category='shared'/>
                            :
                        <AccessManage category='shared'/>
            
        },
        {
            key: 'stream',
            label: t('流数据表'),
            children: view === 'preview' ? 
                        <AccessList category='stream'/>
                            :
                        <AccessManage category='stream'/>
            
        },
        {
            key: 'function_view',
            label: t('函数视图'),
            children: view === 'preview' ? 
                        <AccessList category='function_view'/>
                            :
                        <AccessManage category='function_view'/>
            
        }, {
            key: 'script',
            label: t('脚本权限'),
            children: view === 'preview' ? 
                        <AccessList category='script'/>
                            :
                        <AccessManage category='script'/>
            
        }
    ]), [view])
    
    const OperationsSlot: Record<'left' | 'right', React.ReactNode> = {
        left: <div className='switch-user'>
                {t('当前查看{{role}}:', { role: role === 'user' ? t('用户') : t('组') })}
                <Select 
                    value={name}
                    bordered={false}
                    options={(role === 'user' ? users : groups).map(t => ({
                            value: t,
                            label: t
                    }))} 
                    onSelect={item =>  { access.set({ current: { ...current, name: item } }) } }
                    />
            </div>,
        right: <Button
                    icon={<ReloadOutlined />}
                    onClick={() => { 
                        set_refresher({ })
                        model.message.success(t('刷新成功'))
                    }}
                >
                    {t('刷新')}
                </Button>
      }
    
    return <Tabs 
                type='card' 
                items={tabs} 
                accessKey={tab_key}
                onChange={set_tab_key}
                tabBarExtraContent={
                    OperationsSlot
                }/>
}


const ACCESS_TYPE = {
    database: [ 'DB_MANAGE', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE', 'DB_READ'],
    table: [ 'TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    shared: [ 'TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    stream: ['TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
    function_view: ['VIEW_EXEC'],
    script: ['SCRIPT_EXEC', 'TEST_EXEC']
}

const TABLE_NAMES = {
    database: t('数据库'),
    stream: t('流表'),
    function_view: t('函数视图'),
    script: t('脚本权限')
}


type table_access = {
    name: string
    access?: object
    stat?: string
}


const STAT_ICONS = {
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


function AccessList ({ 
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
        
        let items: string[] | Database[] = [ ]
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


const access_options = {
    database: ACCESS_TYPE.database.concat(ACCESS_TYPE.table),
    shared: ['TABLE_WRITE', 'TABLE_READ'],
    stream: ['TABLE_WRITE', 'TABLE_READ'],
    function_view: ACCESS_TYPE.function_view,
    script: ACCESS_TYPE.script
}

function AccessManage ({ 
    category 
}: {
    category: 'database' | 'shared' | 'stream' | 'function_view' | 'script'
}) {
    let creator = use_modal()
    
    const { databases, 
        shared_tables, 
        stream_tables, 
        function_views, 
        current, 
        accesses } = 
        access.use(['databases', 
                    'shared_tables', 
                    'stream_tables', 
                    'function_views', 
                    'current', 
                    'accesses'])
                
    
    
    const [search_key, set_search_key] = useState('')
    
    const [add_rule_selected, set_add_rule_selected] = useState({ access: access_options[category][0], type: 'grant', obj: [ ] })
    
    const showed_aces_types = useMemo(() => (category === 'database' ? 
        ACCESS_TYPE.database.concat(ACCESS_TYPE.table)
                    :
        ACCESS_TYPE[category]).filter(ac => ac !== 'TABLE_WRITE'), 
    [category])
    
    const showed_aces_cols: TableColumnType<Record<string, any>>[] = useMemo(() => (
        [
            ...category !== 'script' ?  [{
                title: '对象',
                dataIndex: 'name',
                key: 'name',
            }] : [ ],
            {
                title: '权限',
                dataIndex: 'access',
                key: 'access',
                wdith: 300,
                ...['function_view', 'script'].includes(category) ? { } :
                { 
                    filters: showed_aces_types.map(at => ({
                        text: at,
                        value: at
                    })),
                    filterMultiple: true,
                    onFilter: (value, record) => record.access === value
                }
            },
            {
                title: '类型',
                dataIndex: 'type',
                key: 'type',
                wdith: 200,
                ...category === 'script' ? { } :
                {
                    filters: ['grant', 'deny'].map(at => ({
                        text: at,
                        value: at
                    })),
                    filterMultiple: false,
                    onFilter: (value, record) => record.type === value
                }
            },
            {
                title: t('操作'),
                dataIndex: 'action',
                key: 'action',
                wdith: 100
            }
        ]
    ), [ ])
    
    const add_access_cols: TableColumnType<Record<string, any>>[] = useMemo(() => (
        [
            {
                title: '权限',
                dataIndex: 'access',
                key: 'access',
                wdith: 300,
            },
            {
                title: '类型',
                dataIndex: 'type',
                key: 'type',
                wdith: 200,
            },
            ...category !== 'script' ?  [{
                title: '对象',
                dataIndex: 'name',
                key: 'name',
            }] : [ ],
            {
                title: t('动作'),
                dataIndex: 'remove',
                key: 'remove',
                wdith: 100
            }
        ]
    ), [ ])
    
    const [add_access_rows, set_add_access_rows] = useState([ ])
    
 
    const access_rules = useMemo(() => {
        if (!accesses)
            return [ ]
        let tb_rows = [ ]
        
        for (let [k, v] of Object.entries(accesses as Record<string, any>))
            if (v && v !== 'none')
                if (category === 'script' && showed_aces_types.includes(k))
                    tb_rows.push({
                            key: k,
                            access: k,
                            type: v,
                            action: <Button type='link' danger onClick={async () => 
                                        model.execute(async () => {
                                            await access.revoke(current.name, k)
                                            model.message.success('revoke 成功')
                                            access.set({ accesses: current.role === 'user' ? 
                                                            (await access.get_user_access([current.name]))[0]
                                                                                        :
                                                            (await access.get_group_access([current.name]))[0] }) 
                                        })
                                    }>Revoke</Button>
                })
                else if (showed_aces_types.map(aces => aces + '_allowed').includes(k) || showed_aces_types.map(aces =>  aces + '_denied').includes(k)) {
                    let objs = v.split(',')
                    if (category === 'database')
                        objs = objs.filter((obj: string) =>  obj.startsWith('dfs:'))
                    if (category === 'shared')
                        objs = objs.filter((obj: string) =>  shared_tables.includes(obj))
                    if (category === 'stream')
                        objs = objs.filter((obj: string) =>  !obj.startsWith('dfs:') && !shared_tables.includes(obj))
                    const allowed = showed_aces_types.map(aces => aces + '_allowed').includes(k)
                    for (let obj of objs)
                        tb_rows.push({
                                key: obj + k,
                                name: obj,
                                access: k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied')),
                                type: allowed ? 'grant' : 'deny',
                                action: <Button type='link' danger onClick={async () => 
                                    model.execute(async () => {
                                        await access.revoke(current.name, k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied')), obj)
                                        model.message.success(t('revoke 成功'))
                                        access.set({ accesses: current.role === 'user' ? 
                                                        (await access.get_user_access([current.name]))[0]
                                                                                    :
                                                        (await access.get_group_access([current.name]))[0] }) 
                                    })
                                }>Revoke</Button>
                    })
                }
        return tb_rows
    }, [ accesses, category])
    
    let obj_options = [ ]
    switch (category) {
        case 'database':
            obj_options = databases.map(db => db.name)
            break
        case 'shared':
            obj_options = shared_tables
            break
        case 'stream':
            obj_options = stream_tables
            break
        case 'function_view':
            obj_options = function_views
            break
        default:
            break
    }
    
    return <>
            <Modal 
                className='add-rule-modal'
                open={creator.visible}
                onCancel={() => { 
                    set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                    creator.close()
                }}
                onOk={async () => {
                    model.execute(async () => {
                        console.log(current.name, add_access_rows.map(rule => rule))
                        await Promise.all(add_access_rows.map(async rule => 
                                access[rule.type](current.name, rule.access,  rule.name)
                        ))
                        model.message.success(t('权限赋予成功'))
                        set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                        creator.close()
                        access.set({ accesses: current.role === 'user' ? 
                                            (await access.get_user_access([current.name]))[0]
                                                                        :
                                            (await access.get_group_access([current.name]))[0] })
                        set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                    })
                }}
                destroyOnClose
                okText={t('确认添加')}
                okButtonProps={{
                    disabled: !add_access_rows.length
                }}
                title={t('添加权限')}
            >   
             <div className='add-rule-container'>
                <div className='add-rule-header' >
                    <Radio.Group 
                        options={['grant', 'deny'].map(tp => ({
                            label: tp,
                            value: tp
                        }))}
                        value={add_rule_selected.type}
                        onChange={e => {
                            const selected = { ...add_rule_selected }
                            selected.type = e.target.value
                            set_add_rule_selected(selected)
                        }}
                        optionType='button'
                        buttonStyle='solid'
                    />
                    <Select className='access-select'
                            options={access_options[category].map(ac => ({
                                label: ac,
                                value: ac
                            }))}
                            value={add_rule_selected.access}
                            onChange={value => {
                                const selected = { ...add_rule_selected }
                                selected.access = value
                                selected.obj = [ ]
                                set_add_rule_selected(selected)
                            }}/>
                    {
                        category === 'database' && 
                            ACCESS_TYPE.table.includes(add_rule_selected.access) ? 
                                <TreeSelect
                                    className='table-select'
                                    multiple
                                    maxTagCount='responsive'
                                    placeholder={t('请选择权限应用范围')}
                                    treeDefaultExpandAll
                                    value={add_rule_selected.obj}
                                    onChange={vals => {
                                        const selected = { ...add_rule_selected }
                                        selected.obj = vals
                                        set_add_rule_selected(selected)
                                    }}
                                    dropdownRender={originNode =>
                                        <div>
                                            <Checkbox 
                                                className='check-all'
                                                checked={add_rule_selected.obj.length === databases.reduce((count, db) => count + db.tables.length, 0)}
                                                indeterminate={add_rule_selected.obj.length > 0 
                                                    && add_rule_selected.obj.length < databases.reduce((count, db) => count + db.tables.length, 0)}
                                                onChange={e => {
                                                    if (e.target.checked) 
                                                        set_add_rule_selected({ ...add_rule_selected, obj: databases.map(db => [...db.tables]).flat() })
                                                     else 
                                                        set_add_rule_selected({ ...add_rule_selected, obj: [ ] })
                                                    
                                                }}
                                            >
                                                {t('全选')}
                                            </Checkbox>
                                            <Divider className='divider'/>
                                            {originNode}
                                        </div>
                                    }
                                    treeData={databases.map(db => (
                                        {
                                            title: db.name,
                                            value: db.name,
                                            selectable: false,
                                            children: db.tables.map(tb => ({
                                                title: tb,
                                                value: tb
                                            }))
                                        }
                                    ))}
                                /> 
                                    :
                                <Select
                                    className='table-select' 
                                    mode='multiple'
                                    maxTagCount='responsive'
                                    disabled={category === 'script'}
                                    placeholder={category === 'script' ? t('脚本权限应用范围为全局') : t('请选择权限应用范围')}
                                    value={add_rule_selected.obj}
                                    dropdownRender={originNode =>
                                        <div>
                                            <Checkbox 
                                                className='check-all'
                                                checked={add_rule_selected.obj.length === obj_options.length}
                                                indeterminate={add_rule_selected.obj.length > 0 
                                                    && add_rule_selected.obj.length < obj_options.length}
                                                onChange={e => {
                                                    if (e.target.checked) 
                                                        set_add_rule_selected({ ...add_rule_selected, obj: obj_options })
                                                     else 
                                                        set_add_rule_selected({ ...add_rule_selected, obj: [ ] })
                                                    
                                                }}
                                            >
                                                {t('全选')}
                                            </Checkbox>
                                            <Divider className='divider'/>
                                            {originNode}
                                        </div>
                                    }
                                    onChange={vals => {
                                        const selected = { ...add_rule_selected }
                                        selected.obj = vals
                                        set_add_rule_selected(selected)
                                    }}
                                    options={obj_options.map(obj => ({
                                        key: obj,
                                        label: obj,
                                        value: obj
                                    }))}
                            />
                    }
                    
                    <Button type='primary' 
                            onClick={() => {
                                const { access, type, obj } = add_rule_selected
                                const rows = obj.map(oj => ({
                                    key: access + type + oj,
                                    access,
                                    type,
                                    ...category !== 'script' ? { name: oj } : { },
                                }))
                                set_add_access_rows([...add_access_rows, ...rows])
                    }}>
                         {t('预添加')}
                    </Button>
                </div>
                <Table 
                    columns={add_access_cols}
                    dataSource={add_access_rows.map(row => ({
                        ...row,
                        remove: 
                        <Button
                            type='text' 
                            danger
                            onClick={() => { 
                            const new_rows = add_access_rows.filter(({ key }) => key !== row.key)
                            set_add_access_rows(new_rows)
                         }}>
                            {t('移除')}
                        </Button>
                    }))}
                    />
             </div>
        
            </Modal>
            <Table
                title={() => 
                    <AccessHeader 
                        category={category} 
                        preview={false}
                        search_key={search_key}
                        set_search_key={set_search_key}
                        open={creator.open}/>
                }
                columns={showed_aces_cols}
                dataSource={access_rules.filter(row => 
                    row[category === 'script' ? 'access' : 'name'].toLowerCase().includes(search_key.toLowerCase())
                )}
                tableLayout='fixed'
                scroll={{ x: '80%' }}
                />
        </>
}

function AccessHeader ({
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
