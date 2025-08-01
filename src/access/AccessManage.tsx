import { Button, Input, Table, type TableColumnType } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '@i18n'

import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

import { model } from '@model'

import { DDBTable } from '@/components/DDBTable/index.tsx'

import { ACCESS_OPTIONS, ACCESS_TYPE, NEED_INPUT_ACCESS, TABLE_NAMES } from './constants.tsx'
import { access } from './model.ts'

import { AccessAddModal } from './components/access/AccessAddModal.tsx'
import { AccessRevokeModal } from './components/access/AccessRevokeModal.tsx'
import { RevokeConfirm } from './components/RevokeConfirm.tsx'
import type { AccessCategory, AccessRole } from './types.ts'
import { use_access } from './hooks/use-access.ts'
import { use_access_objs } from './hooks/use-access-objs.ts'

interface ACCESS {
    key: string
    access: string
    name?: string
}

export function AccessManage ({ role, name, category }: { role: AccessRole, name: string, category: AccessCategory }) {
    
    const { data: accesses, mutate: update_accesses } = use_access(role, name)
    
    const { data: shared_tables } = use_access_objs(role, 'shared')
    
    const { data: stream_tables } = use_access_objs(role, 'stream')
    
    const { v3 } = model
    
    const [search_key, set_search_key] = useState('')
    
    const [input_value, set_input_value] = useState(search_key)
    
    const [selected_access, set_selected_access] = useState<ACCESS[]>([ ])
    
    const reset_selected = useCallback(() => { set_selected_access([ ]) }, [ ])
    
    const showed_aces_types = useMemo(
        () => {
            switch (category) {
                case 'database':
                    return v3 ? ACCESS_OPTIONS.catalog :  ACCESS_OPTIONS.database
                default:
                    return ACCESS_TYPE[category].filter(ac => ac !== 'TABLE_WRITE')
            }
        },
        [category]
    )
    useEffect(reset_selected, [role, name])
    
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
            {
                title: category === 'script' ? t('上限值') : t('范围'),
                dataIndex: 'name',
                key: 'name',
                width: 600
            },
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
        if (!accesses || !shared_tables || !stream_tables)
            return [ ]
        let tb_rows = [ ]
        for (let [k, v] of Object.entries(accesses as Record<string, any>))
            if (v && v !== 'none')
                if (category === 'script' && showed_aces_types.includes(k))
                    tb_rows.push({
                        key: k,
                        access: k,
                        name: NEED_INPUT_ACCESS.has(k) ? v : '',
                        type: v === 'deny' ? 'deny' : 'grant',
                        action: (
                            <RevokeConfirm on_confirm={async () => {
                                await access.revoke(name, k)
                                model.message.success(t('撤销成功'))
                                await update_accesses()
                            }} />
                        )
                    })
                else if (
                    // DB_OWNER 单独处理
                    showed_aces_types.filter(item => item !== 'DB_OWNER').map(aces => aces + '_allowed').includes(k) ||
                    showed_aces_types.map(aces => aces + '_denied').includes(k)
                ) {
                    let objs = v.split(',')
                    
                    if (category === 'database')
                        objs = objs.filter((obj: string) => !shared_tables.includes(obj) && !stream_tables.includes(obj))
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
                            action: 
                                <RevokeConfirm on_confirm={async () => {
                                    let access_type = k.slice(0, k.indexOf(allowed ? '_allowed' : '_denied'))
                                    // 对于 shared 和 stream，撤销权限时需要将 TABLE_INSERT 、TABLE_UPDATE 、TABLE_DELETE 转换为 TABLE_WRITE
                                    if (category === 'shared' || category === 'stream')
                                        access_type = access_type === 'TABLE_READ' ? 'TABLE_READ' : 'TABLE_WRITE'
                                    await access.revoke(name, access_type, obj)
                                    model.message.success(t('撤销成功'))
                                    await update_accesses()
                                }} />
                        })
                } else if (k === 'DB_OWNER' && category === 'database') {
                    // 对于 DB_OWNER，如果为 allow 并且 DB_OWNER_allowed 为空，则为全部数据库生效，即 *
                    // 如果是 deny，则必定为 *
                    let objs = accesses.DB_OWNER_allowed && v === 'allow' ? accesses.DB_OWNER_allowed.split(',') : ['*']
                    for (let obj of objs)
                        tb_rows.push({
                            key: obj + k,
                            name: obj,
                            access: 'DB_OWNER',
                            type: v === 'allow' ? 'grant' : 'deny',
                            action: <RevokeConfirm on_confirm={async () => {
                                await access.revoke(name, k, obj)
                                model.message.success(t('撤销成功'))
                                await update_accesses()
                            }} />
                        })
                }
         
            
        return tb_rows
    }, [accesses, category, shared_tables, stream_tables])
    
    const filtered_rules = useMemo(() => access_rules.filter(row =>
        row[category === 'script' ? 'access' : 'name'].toLowerCase().includes(search_key.toLowerCase())
    ), [search_key, access_rules])
    
    return <DDBTable
            rowSelection={{
                selectedRowKeys: selected_access.map(ac => ac.key),
                onChange: (_, selectedRows: any[], info) => {
                    if (info.type === 'all')
                        return
                    set_selected_access(selectedRows)
                },
                onSelectAll () {
                    const all_access = filtered_rules
                    if (selected_access.length < all_access.length)
                        set_selected_access(all_access)
                    else
                        set_selected_access([ ])
                }
            }}
            // buttons={<AccessHeader
            //     role={role}
            //     name={name}
            //     category={category}
            //     preview={false}
            //     search_key={search_key}
            //     set_search_key={set_search_key}
            //     add_open={async () => NiceModal.show(AccessAddModal, { category, role, name })}
            //     delete_open={async () => NiceModal.show(AccessRevokeModal, { category, selected_access, reset_selected, name, update_accesses })}
            //     selected_length={selected_access.length}
            // />}
            buttons={ <>
                <Button 
                    type='primary' 
                    icon={<PlusOutlined />} 
                    onClick={async () => NiceModal.show(AccessAddModal, { category, role, name })}>
                    {t('新增权限')}
                </Button>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selected_access.length === 0}
                    onClick={() => {
                        if (selected_access.length)
                            NiceModal.show(AccessRevokeModal, { category, selected_access, reset_selected, name, update_accesses })
                    }}
                >
                    {t('批量撤销')}
                </Button>
            </>}
            filter_form={<Input.Search
                value={input_value}
                onChange={e => {
                    set_input_value(e.target.value)
                }}
                onSearch={() => { set_search_key(input_value) }}
                placeholder={t('请输入想要搜索的{{category}}', { category: category === 'database' && v3 ? `${TABLE_NAMES.catalog} / ${TABLE_NAMES.database} / ${TABLE_NAMES.table}` : TABLE_NAMES[category] })}
            />}
            columns={showed_aces_cols}
            dataSource={filtered_rules}
        />
}
