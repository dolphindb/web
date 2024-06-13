import { Button, Checkbox, Divider, Modal, Radio, Select, Table, TreeSelect, type TableColumnType, Tooltip, Popconfirm } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { use_modal } from 'react-object-model/hooks.js'

import { t } from '../../i18n/index.js'
import { model } from '../model.js'

import { AccessHeader } from './AccessHeader.js'
import { ACCESS_TYPE, access_options } from './constant.js'
import { access } from './model.js'

import { AccessAddModal } from './components/access/AccessAddModal.js'
import NiceModal from '@ebay/nice-modal-react'
import { AccessRevokeModal } from './components/access/AccessRevokeModal.js'

interface ACCESS {
    key: string
    access: string
    name?: string
}

export function AccessManage ({ category }: { category: 'database' | 'shared' | 'stream' | 'function_view' | 'script' }) {
    
    const { databases, shared_tables, stream_tables, function_views, current, accesses } = access.use([
        'databases',
        'shared_tables',
        'stream_tables',
        'function_views',
        'current',
        'accesses'
    ])
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_access, set_selected_access] = useState<ACCESS[]>([ ])
    
    const reset_selected = useCallback(()=>set_selected_access([]),[])
    
    const showed_aces_types = useMemo(
        () => (category === 'database' ? ACCESS_TYPE.database.concat(ACCESS_TYPE.table) : ACCESS_TYPE[category]).filter(ac => ac !== 'TABLE_WRITE'),
        [category]
    )
    
    useEffect(reset_selected, [current])
    
    const showed_aces_cols: TableColumnType<Record<string, any>>[] = useMemo(
        () => [
            {
                title: t('类型'),
                dataIndex: 'type',
                key: 'type',
                wdith: 100,
                ...(category === 'script'
                    ? { }
                    : {
                          filters: ['grant', 'deny'].map(at => ({
                              text: at,
                              value: at
                          })),
                          filterMultiple: false,
                          onFilter: (value, record) => record.type === value
                      })
            },
            
            {
                title: t('权限'),
                dataIndex: 'access',
                key: 'access',
                wdith: 200,
                ...(['function_view', 'script'].includes(category)
                    ? { }
                    : {
                          filters: showed_aces_types.map(at => ({
                              text: at,
                              value: at
                          })),
                          filterMultiple: true,
                          onFilter: (value, record) => record.access === value
                      })
            },
            ...(category !== 'script'
                ? [
                      {
                          title: t('范围'),
                          dataIndex: 'name',
                          key: 'name',
                          width: 600
                      }
                  ]
                : [ ]),
                
            {
                title: t('操作'),
                dataIndex: 'action',
                key: 'action',
                wdith: 100
            }
        ],
        [ ]
    )
    
  
    
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
                        type: v === 'allow' ? 'grant' : v,
                        action: (
                            <Popconfirm
                                title={t('撤销权限')}
                                description={t('确认撤销该权限吗？')}
                                onConfirm={async () => {
                                    await access.revoke(current.name, k)
                                    model.message.success(t('撤销成功'))
                                    access.set({
                                        accesses:
                                            current.role === 'user'
                                                ? (await access.get_user_access([current.name]))[0]
                                                : (await access.get_group_access([current.name]))[0]
                                    })
                                }}
                            >
                                <Button type='link' danger>
                                    {t('撤销')}
                                </Button>
                            </Popconfirm>
                        )
                    })
                else if (
                    showed_aces_types.map(aces => aces + '_allowed').includes(k) ||
                    showed_aces_types.map(aces => aces + '_denied').includes(k)
                ) {
                    let objs = v.split(',')
                    if (category === 'database')
                        objs = objs.filter((obj: string) => obj.startsWith('dfs:'))
                    if (category === 'shared')
                        objs = objs.filter((obj: string) => shared_tables.includes(obj))
                    if (category === 'stream')
                        objs = objs.filter((obj: string) => !obj.startsWith('dfs:') && !shared_tables.includes(obj))
                    const allowed = showed_aces_types.map(aces => aces + '_allowed').includes(k)
                    for (let obj of objs)
                        tb_rows.push({
                            key: obj + k,
                            name: obj,
                            access: k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied')),
                            type: allowed ? 'grant' : 'deny',
                            action: (
                                <Popconfirm
                                    title={t('撤销权限')}
                                    description={t('确认撤销该权限吗？')}
                                    onConfirm={async () => {
                                        await access.revoke(current.name, k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied')), obj)
                                        model.message.success(t('撤销成功'))
                                        access.set({
                                            accesses:
                                                current.role === 'user'
                                                    ? (await access.get_user_access([current.name]))[0]
                                                    : (await access.get_group_access([current.name]))[0]
                                        })
                                    }}
                                >
                                    <Button type='link' danger>
                                        {t('撤销')}
                                    </Button>
                                </Popconfirm>
                            )
                        })
                }
        return tb_rows
    }, [accesses, category])
    
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
    
    return ( <Table
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
                    }
                }}
                title={() => <AccessHeader
                        category={category}
                        preview={false}
                        search_key={search_key}
                        set_search_key={set_search_key}
                        add_open={async ()=>  await NiceModal.show(AccessAddModal, { category })}
                        delete_open={async ()=>  await NiceModal.show(AccessRevokeModal, { category,selected_access,reset_selected })}
                        selected_length={selected_access.length}
                    />}
                columns={showed_aces_cols}
                dataSource={access_rules.filter(row =>
                    row[category === 'script' ? 'access' : 'name'].toLowerCase().includes(search_key.toLowerCase())
                )}
            />
    )
}
