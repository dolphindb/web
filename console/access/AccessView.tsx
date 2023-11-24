import { Tabs, Table, Button, Input, type TableColumnType, type TabsProps, Modal, Form, Select, TreeSelect, Collapse } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { t } from '../../i18n/index.js'

import { access, type Database } from './model.js'
import { model } from '../model.js'
import { CheckCircleFilled, CloseCircleFilled, DeleteOutlined, MinusCircleOutlined, PlusCircleOutlined, PlusOutlined, QuestionCircleFilled, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/modal.js'

export function AccessView ({ 
    role, 
    name,
}: {
    role: 'user' | 'group'
    name: string
}) {
    
    const { current } =  access.use(['current'])
     
    const [tab_key, set_tab_key] = useState('database')
    
    const [refresher, set_refresher] = useState({ })
    
    useEffect(() => {
        (async () => {
            try {
                access.set({ accesses: role === 'user' ? 
                                        (await access.get_user_access([name]))[0]
                                                    :
                                        (await access.get_group_access([name]))[0] })
            } catch (error) {
                model.show_error({ error })
            }
        })()
    }, [refresher])
    
    const tabs: TabsProps['items'] = useMemo(() => ([
        {
            key: 'database',
            label: t('分布式数据库'),
            // children:  <AccessList accesses={accesses} category='database'/>
            children: current.preview ? 
                        <AccessList category='database'/>
                            :
                        <AccessManage category='database'/>
        },
        {
            key: 'stream',
            label: t('流数据表'),
            // children: <AccessList accesses={accesses} category='stream'/>
            children: current.preview ? 
                        <AccessList category='stream'/>
                            :
                        <AccessManage category='stream'/>
            
        },
        {
            key: 'function_view',
            label: t('函数视图'),
            // children: <AccessList accesses={accesses} category='function_view'/>
            children: current.preview ? 
                        <AccessList category='function_view'/>
                            :
                        <AccessManage category='function_view'/>
            
        }, {
            key: 'script',
            label: t('脚本权限'),
            // children: <AccessList accesses={accesses} category='script'/>
            children: current.preview ? 
                        <AccessList category='script'/>
                            :
                        <AccessManage category='script'/>
            
        }
    ]), [current.preview])
    
    return <Tabs 
                type='card' 
                items={tabs} 
                accessKey={tab_key}
                onChange={set_tab_key}
                tabBarExtraContent={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => { set_refresher({ }) }}
                    >
                        {t('刷新')}
                    </Button>
                }/>
}


const ACCESS_TYPE = {
    database: [ 'DB_MANAGE', 'DBOBJ_CREATE', 'DBOBJ_DELETE', 'DB_INSERT', 'DB_UPDATE', 'DB_DELETE', 'DB_READ'],
    table: [ 'TABLE_WRITE', 'TABLE_READ', 'TABLE_INSERT', 'TABLE_UPDATE', 'TABLE_DELETE'],
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
    none: <QuestionCircleFilled className='gray'/>
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
    category: 'database' | 'stream' | 'function_view' | 'script'
}) {
    
    const [showed_accesses, set_showed_accesses] = useState<Record<string, any>>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const { databases, stream_tables, function_views, accesses, current } = access.use(['databases', 'stream_tables', 'function_views', 'accesses', 'current'])
    
    
    useEffect(() => {
        if (!accesses)
            return
        (async () => {
            try {
                let items: string[] | Database[] = [ ]
                let tmp_tb_access = [ ]
                
                switch (category) {
                    case 'database':
                        items = databases
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
                        { access: Object.fromEntries(ACCESS_TYPE[category].map(type => {
                                return handle_access(accesses, type, name)
                            })) 
                        },
                        ... typeof item !== 'string' ?
                            {
                                tables: item.tables.map(table => (
                                    {
                                        name: table,
                                        access: Object.fromEntries(ACCESS_TYPE.table.map(type => {
                                            return handle_access(accesses, type, table)
                                        })),
                                    }
                                ))
                            }
                                                    :   { }
                    }
                    tmp_tb_access.push(tb_ob)
                }
                set_showed_accesses(tmp_tb_access)
            } catch (error) {
                model.show_error({ error })
                throw error
            }
        })()
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
    
    
    const rows = useMemo(() => (
        showed_accesses.filter(({ name }) =>
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
        }))
    ), [showed_accesses, search_key])
    
    
    return <Table 
            columns={cols}
            dataSource={rows}
            title={() => <div className='actions'>
                <h4>{t(`当前 {{role}} : ${current.name}`, { role: current.role })}</h4>
                
                <Button  
                        onClick={() => { access.set({ current: null }) }}>
                    {t('返回列表')}
                </Button>
                
                <Button  onClick={() => { access.set({ current: { ...access.current, preview: false } }) }}>
                    {t('权限管理')}
                </Button>
                <Input  
                    className='search'
                    value={search_key}
                    prefix={<SearchOutlined />}
                    onChange={e => { set_search_key(e.target.value) }} 
                    placeholder={t('请输入想要搜索的{{category}}', { category: TABLE_NAMES[category] })} 
                />
                
            </div>
            }
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
                    />
            } : { } }
   />
}

function AccessManage ({ 
    category 
}: {
    category: 'database' | 'table' | 'stream' | 'function_view' | 'script'
}) {
    let creator = use_modal()
    
    const [add_access_form] = Form.useForm()
    
    const [rule_category, set_rule_category] = useState(category)
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(() => (
        [
            ...category !== 'script' ?  [{
                title: '对象',
                dataIndex: 'name',
                key: 'name',
                width: 400
            }] : [ ],
            {
                title: '权限',
                dataIndex: 'access',
                key: 'access',
            },
            {
                title: '类型',
                dataIndex: 'type',
                key: 'type',
                width: 300
              
            },
            {
                title: t('操作'),
                dataIndex: 'action',
                key: 'action',
                width: 300
            }
        ]
    ), [ ])
    
    const { databases, stream_tables, function_views, current, accesses } = access.use(['databases', 'stream_tables', 'function_views', 'current', 'accesses'])
    
    const get_accesses = useCallback(() => {
        let tb_rows = [ ]
        const aces_types = category === 'database' ? 
                                ACCESS_TYPE.database.concat(ACCESS_TYPE.table)
                                            :
                                ACCESS_TYPE[category]
        for (let [k, v] of Object.entries(accesses as Record<string, any>))
            if (v && v !== 'none')
                if (category === 'script') {
                    if (aces_types.includes(k))
                        tb_rows.push({
                            key: k,
                            access: k,
                            type: v,
                            action: <Button type='link' danger onClick={async () => {
                                        try {
                                            await access.revoke(current.name, k)
                                            model.message.success('revoke 成功')
                                            access.set({ accesses: current.role === 'user' ? 
                                                            (await access.get_user_access([current.name]))[0]
                                                                                        :
                                                            (await access.get_group_access([current.name]))[0] }) 
                                        } catch (error) {
                                            model.show_error({ error })
                                        }
                                    }}>Revoke</Button>
                })
                }
                else if (aces_types.map(aces => aces + '_allowed').includes(k) || aces_types.map(aces =>  aces + '_denied').includes(k)) {
                        let objs = v.split(',')
                        if (category === 'database')
                            objs = objs.filter((obj: string) =>  obj.startsWith('dfs:'))
                        if (category === 'stream')
                            objs =  objs.filter((obj: string) =>  !obj.startsWith('dfs:'))
                        const allowed = aces_types.map(aces => aces + '_allowed').includes(k)
                        for (let obj of objs)
                            tb_rows.push({
                                    key: obj + k,
                                    name: obj,
                                    access: k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied')),
                                    type: allowed ? 'grant' : 'deny',
                                    action: <Button type='link' danger onClick={async () => {
                                        try {
                                            await access.revoke(current.name, k.slice(0, k.indexOf('_allowed')), obj)
                                            model.message.success(t('revoke 成功'))
                                            access.set({ accesses: current.role === 'user' ? 
                                                            (await access.get_user_access([current.name]))[0]
                                                                                        :
                                                            (await access.get_group_access([current.name]))[0] }) 
                                        } catch (error) {
                                            model.show_error({ error })
                                        }
                                    }}>Revoke</Button>
                            })
                    }
                   
        return tb_rows
    }, [ accesses, category])
    
    
    const rows = useMemo(() => {
        if (!accesses)
            return
        return get_accesses()
    }, [accesses, category])
    
    return <>
            <Modal 
                className='add-rule-modal'
                open={creator.visible}
                onCancel={() => { 
                    add_access_form.resetFields()
                    creator.close()
                }}
                onOk={async () => {
                    try {
                        await add_access_form.validateFields()
                        const accesses = await add_access_form.getFieldValue('add-rules')
                        await Promise.all(accesses.map(async aces => {
                            if (aces.type === 'grant')
                                 
                                if (category !== 'script')
                                    return access.grant(current.name, aces.access, aces.obj)
                                else
                                    return access.grant(current.name, aces.obj)
                                
                            else if (aces.type === 'deny')
                                 
                                if (category !== 'script')
                                    return access.deny(current.name, aces.access, aces.obj)
                                else
                                    return access.deny(current.name, aces.obj)
                                
                        }))
                        model.message.success(t('权限赋予成功'))
                        creator.close()
                        access.set({ accesses: current.role === 'user' ? 
                                            (await access.get_user_access([current.name]))[0]
                                                                        :
                                            (await access.get_group_access([current.name]))[0] }) 
                        add_access_form.resetFields()
                    } catch (error) {
                        model.show_error({ error })
                    }
                }}
                destroyOnClose
                title={t('新增规则')}
            >   
            <Form form={add_access_form}>
                <Form.List name='add-rules'>
                    {
                        (fields, { add, remove }) => {
                            return <>
                            {
                                fields.map((field, idx) => 
                                <div key={field.key} className='rule-select'>
                                    <Form.Item name={[field.name, 'obj']} rules={[{ required: true, message: t('请选择{{category}}', { category: TABLE_NAMES[category] }) }]}>
                                        {category === 'database' ? 
                                        <TreeSelect
                                            style={{ width: '300px' }}
                                            treeData={databases.filter(({ name }) => name.startsWith('dfs:')).map(db => (
                                                {
                                                    title: db.name,
                                                    value: db.name,
                                                    children: db.tables.map(tb => ({
                                                        title: tb,
                                                        value: tb
                                                    }))
                                                }
                                            ))}
                                            placeholder={t('请选择 dfs 数据库/表')}
                                            // defaultValue={database_tree[0]?.title}
                                            onChange={val => {
                                                if (val.split('/').length === 4) {
                                                    set_rule_category('table')
                                                    const value = add_access_form.getFieldValue('add-rules')
                                                    value[idx].access = ACCESS_TYPE.table[0]
                                                    add_access_form.setFieldValue('add-rule', value)
                                                }
                                                else {
                                                    set_rule_category('database')
                                                    const value = add_access_form.getFieldValue('add-rules')
                                                    value[idx].access = ACCESS_TYPE.database[0]
                                                    add_access_form.setFieldValue('add-rule', value)
                                                }
                                            }}
                                        /> : 
                                        <Select
                                            style={{ width: '300px' }}
                                            placeholder={t('请选择{{category}}', { category: TABLE_NAMES[category] })}
                                            // disabled={!!category}
                                            options={(category === 'script' ? 
                                                            ACCESS_TYPE.script
                                                                        :   
                                                    category === 'function_view' ? 
                                                                        function_views 
                                                                                : 
                                                                        stream_tables).map(opt => ({
                                                        title: opt,
                                                        value: opt
                                                    }))}
                                        />
                                        }
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'access']} rules={category !== 'script' ? [{ required: true, message: t('请选择权限') }] : [ ]}>
                                         <Select
                                            style={{ width: '200px' }}
                                            placeholder={t('请选择权限')}
                                            disabled={category === 'script'}
                                            options={ (category !== 'stream' ? ACCESS_TYPE[rule_category] : ['TABLE_WRITE', 'TABLE_READ']).map(db => ({
                                                title: db,
                                                value: db
                                            }))}
                                            />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'type']} rules={[{ required: true, message: t('请选择权限类型') }]}>
                                        <Select
                                            style={{ width: '200px' }}
                                            placeholder={t('请选择权限类型')}
                                            options={[ {
                                                title: 'grant',
                                                value: 'grant'
                                            },
                                            {
                                                title: 'deny',
                                                value: 'deny'
                                            }
                                            ]}
                                            />
                                    </Form.Item>
                                    {fields.length > 1 && (
                                        <MinusCircleOutlined
                                            className='dynamic-delete-button'
                                            onClick={() => { remove(field.name) }}
                                        />
                                        )}
                                     
                                    </div>)
                            }
                            
                            <Form.Item>
                                <Button
                                    type='dashed'
                                    onClick={() => { add() }}
                                    style={{ width: '60%' }}
                                    icon={<PlusOutlined />}
                                >
                                    {t('增加')}
                                </Button>
                                
                            </Form.Item>
                            </>
                        }
                        
                       
                    }
                    
                </Form.List>
            </Form>
        
            </Modal>
            <Table
                title={() => <><div className='actions'>
                    <h4>{t(`当前 {{role}} : ${current.name}`, { role: current.role })}</h4>
                    
                    <Button onClick={() => { access.set({ current: null }) }}>
                    {t('返回列表')}
                    </Button>
                    
                    <Button onClick={creator.open}>
                        {t('新增权限')}
                    </Button>
                    <Button onClick={() => { access.set({ current: { ...current, preview: true } }) }}>
                        {t('权限查看')}
                    </Button>
                    
                </div>
                </>
                }
                columns={cols}
                dataSource={rows}/>
        </>
}
