import { Button, Checkbox, Divider, Modal, Radio, Select, Table, TreeSelect, type TableColumnType, Tooltip, Popconfirm } from 'antd'
import { useMemo, useState } from 'react'

import { use_modal } from 'react-object-model/hooks.js'
import { t } from '../../i18n/index.js'
import { model } from '../model.js'

import { AccessHeader } from './AccessHeader.js'
import { ACCESS_TYPE, access_options } from './constant.js'
import { access } from './model.js'

interface ACCESS {
    key: string
    access: string
    name?: string
}


export function AccessManage ({ 
    category 
}: {
    category: 'database' | 'shared' | 'stream' | 'function_view' | 'script'
}) {
    let creator = use_modal()
    let deletor = use_modal()
    
    const { 
            databases, 
            shared_tables, 
            stream_tables, 
            function_views, 
            current, 
            accesses 
        } = 
        access.use(['databases', 
                    'shared_tables', 
                    'stream_tables', 
                    'function_views', 
                    'current', 
                    'accesses'])
                
    
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_access, set_selected_access] = useState<ACCESS[]>([ ])
    
    const [add_rule_selected, set_add_rule_selected] = useState({ access: access_options[category][0], type: 'grant', obj: [ ] })
    
    const showed_aces_types = useMemo(() => (category === 'database' ? 
        ACCESS_TYPE.database.concat(ACCESS_TYPE.table)
                    :
        ACCESS_TYPE[category]).filter(ac => ac !== 'TABLE_WRITE'), 
    [category])
    
    const showed_aces_cols: TableColumnType<Record<string, any>>[] = useMemo(() => (
        [   {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            wdith: 100,
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
                title: '权限',
                dataIndex: 'access',
                key: 'access',
                wdith: 200,
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
            ...category !== 'script' ?  [{
                title: '范围',
                dataIndex: 'name',
                key: 'name',
                width: 600
            }] : [ ],
            
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
                title: '类型',
                dataIndex: 'type',
                key: 'type',
                wdith: 200,
            },
            {
                title: '权限',
                dataIndex: 'access',
                key: 'access',
                wdith: 300,
            },
            ...category !== 'script' ?  [{
                title: '范围',
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
                            action:   <Popconfirm
                                        title={t('删除用户')}
                                        description={t('确认 revoke 该权限吗？')}
                                        onConfirm={async () => 
                                            model.execute(async () => {
                                                await access.revoke(current.name, k)
                                                model.message.success('revoke 成功')
                                                access.set({ accesses: current.role === 'user' ? 
                                                                (await access.get_user_access([current.name]))[0]
                                                                                            :
                                                                (await access.get_group_access([current.name]))[0] }) 
                                            })
                                        }   
                                    
                                    >
                                        <Button type='link' danger>
                                            {t('Revoke')}
                                        </Button>
                                    </Popconfirm> 
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
                                action: 
                                <Popconfirm
                                    title={t('删除用户')}
                                    description={t('确认 revoke 该权限吗？')}
                                    onConfirm={async () => 
                                        model.execute(async () => {
                                            await access.revoke(current.name, k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied')), obj)
                                            model.message.success(t('revoke 成功'))
                                            access.set({ accesses: current.role === 'user' ? 
                                                            (await access.get_user_access([current.name]))[0]
                                                                                        :
                                                            (await access.get_group_access([current.name]))[0] }) 
                                        })
                                    }>
                                    <Button type='link' danger>
                                        {t('Revoke')}
                                    </Button>
                                </Popconfirm> 
                                
                                // <Button type='link' danger onClick={async () => 
                                //     model.execute(async () => {
                                //         await access.revoke(current.name, k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied')), obj)
                                //         model.message.success(t('revoke 成功'))
                                //         access.set({ accesses: current.role === 'user' ? 
                                //                         (await access.get_user_access([current.name]))[0]
                                //                                                     :
                                //                         (await access.get_group_access([current.name]))[0] }) 
                                //     })
                                // }>Revoke</Button>
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
                    set_add_access_rows([ ])
                    creator.close()
                }}
                onOk={async () => {
                    model.execute(async () => {
                        await Promise.all(add_access_rows.map(async rule => 
                                access[rule.type](current.name, rule.access,  rule.name)
                        ))
                        model.message.success(t('权限赋予成功'))
                        set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                        set_add_access_rows([ ])
                        creator.close()
                        access.set({ accesses: current.role === 'user' ? 
                                            (await access.get_user_access([current.name]))[0]
                                                                        :
                                            (await access.get_group_access([current.name]))[0] })
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
                    <Select 
                        className='access-select'
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
                                const rows = category !== 'script' ? obj.map(oj => ({
                                    key: access + type + oj,
                                    access,
                                    type,
                                    name: oj
                                })) : [{
                                    key: access + type,
                                    access,
                                    type,
                                }]
                                set_add_access_rows([...add_access_rows, ...rows])
                                set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                                
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
            <Modal
                className='delete-user-modal'
                open={deletor.visible}
                onCancel={deletor.close}
                onOk={async () => model.execute(async () => {
                    console.log(selected_access)
                    await Promise.all(
                        selected_access.map(async ac => 
                            category === 'script' ? 
                                access.revoke(current.name, ac.access) 
                                    : 
                                access.revoke(current.name, ac.access, ac.name)))
                    model.message.success(t('Revoke 成功'))
                    set_selected_access([ ])
                    deletor.close()
                    access.set({ accesses: current.role === 'user' ? 
                    (await access.get_user_access([current.name]))[0]
                                                :
                    (await access.get_group_access([current.name]))[0] }) 
                })
                }
                title={<Tooltip>
                            {t('确认 revoke 选中的 {{num}} 条权限吗？', { num: selected_access.length })}
                    </Tooltip>}
            />
            <Table
                rowSelection={{
                    selectedRowKeys: selected_access.map(ac => ac.key),
                    onChange: (_, selectedRows: any[], info) => {
                        if (info.type === 'all')
                            return
                        set_selected_access(selectedRows)
                    },
                    onSelectAll () {
                        const all_access = access_rules.filter(row => 
                            row[category === 'script' ? 'access' : 'name'].toLowerCase().includes(search_key.toLowerCase())
                        )
                        if (selected_access.length < all_access.length)
                            set_selected_access(all_access)
                        else
                            set_selected_access([ ])
                    },
                    
                }}
                
                title={() => 
                    <AccessHeader 
                        category={category} 
                        preview={false}
                        search_key={search_key}
                        set_search_key={set_search_key}
                        add_open={creator.open}
                        delete_open={deletor.open}/>
                }
                columns={showed_aces_cols}
                dataSource={access_rules.filter(row => 
                    row[category === 'script' ? 'access' : 'name'].toLowerCase().includes(search_key.toLowerCase())
                )}
                />
        </>
}
