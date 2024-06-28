import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Button, Checkbox, Divider, Input, Modal, Radio, Select, Table, type TableColumnType, TreeSelect } from 'antd'

import { useCallback, useMemo, useState } from 'react'

import { consume_stream } from 'xshell'

import {  t } from '../../../../i18n/index.js'
import { access } from '../../model.js'
import { ACCESS_TYPE, NeedInputAccess, access_options } from '../../constants.js'
import { model } from '../../../model.js'
import { filter_access_options } from '../../utils/filter-access-options.js'

import { AccessObjSelect } from './AccessObjSelect.js'

export interface Access {
    key: string
    access: string
    name?: string
}

export interface AccessRule {
    access: string
    type: string
    obj: any[]
}

export type AccessCategory = 'database' | 'shared' | 'stream' | 'function_view' | 'script'


export const AccessAddModal = NiceModal.create(({ category }: { category: AccessCategory }) => {
    const { current, accesses } = access.use(['current', 'accesses'])
    
    const [add_rule_selected, set_add_rule_selected] = useState<AccessRule>({ access: access_options[category][0], type: 'grant', obj: [ ] })
    
    const add_access_cols: TableColumnType<Record<string, any>>[] = useMemo(
        () => [
            {
                title: t('类型'),
                dataIndex: 'type',
                key: 'type',
                wdith: 200
            },
            {
                title: t('权限'),
                dataIndex: 'access',
                key: 'access',
                wdith: 300
            },
            {
                title: category === 'script' ? t('上限值') : t('范围'),
                dataIndex: 'name',
                key: 'name'
            },
            {
                title: t('动作'),
                dataIndex: 'remove',
                key: 'remove',
                wdith: 100
            }
        ],
        [ category]
    )
    
    const [add_access_rows, set_add_access_rows] = useState([ ])
    
    const modal = useModal()
    
    return <Modal
            className='add-rule-modal'
            open={modal.visible}
            afterClose={modal.remove}
            onCancel={() => {
                set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                set_add_access_rows([ ])
                modal.hide()
            }}
            onOk={async () => {
                await Promise.all(add_access_rows.
                    map(async rule =>
                        access[rule.type](
                            current.name,
                            rule.access,
                            rule.access ===
                                'QUERY_RESULT_MEM_LIMIT' || rule.access === 'TASK_GROUP_MEM_LIMIT'
                                    ?
                                Number(rule.name)
                                    :
                                rule.name)))
                model.message.success(t('权限赋予成功'))
                set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                set_add_access_rows([ ])
                modal.hide()
                access.set({
                    accesses:
                        current.role === 'user'
                                ? 
                            (await access.get_user_access([current.name]))[0]
                                : 
                            (await access.get_group_access([current.name]))[0]
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
                <div className='add-rule-header'>
                    <Radio.Group
                        options={['grant', 'deny'].map(tp => ({
                            label: tp,
                            value: tp
                        }))}
                        value={add_rule_selected.type}
                        onChange={e => {
                            const selected = {
                                type: e.target.value,
                                access: filter_access_options(category, current.role, accesses.is_admin, e.target.value)?.[0],
                                obj: [ ]
                            }
                            set_add_rule_selected(selected)
                        }}
                        optionType='button'
                        buttonStyle='solid'
                    />
                    <Select
                        className='access-select'
                        options={filter_access_options(
                                        category, 
                                        current.role, 
                                        accesses.is_admin, 
                                        add_rule_selected.type).
                                            map(ac => ({
                                                label: ac,
                                                value: ac
                                            }))}
                        value={add_rule_selected.access}
                        onChange={value => {
                            const selected = { ...add_rule_selected }
                            selected.access = value
                            selected.obj = [ ]
                            set_add_rule_selected(selected)
                        }}
                    />
                    <AccessObjSelect 
                        category={category} 
                        add_rule_selected={add_rule_selected} 
                        set_add_rule_selected={set_add_rule_selected} 
                    />
                        
                    <Button
                        type='primary'
                        onClick={() => {
                            const { access, type, obj } = add_rule_selected
                            const rows =
                                category !== 'script' || NeedInputAccess.includes(access)
                                    ? obj.map(oj => ({
                                        key: access + type + oj,
                                        access,
                                        type,
                                        name: oj
                                    }))
                                    : [
                                        {
                                            key: access + type,
                                            access,
                                            type
                                        }
                                    ]
                            const total_rows = [...add_access_rows, ...rows]
                            let set = new Set()
                            const unique_rows = total_rows.filter(obj => !set.has(obj.key) && set.add(obj.key))
                            set_add_access_rows(unique_rows)
                            set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [ ] })
                        }}
                    >
                        {t('预添加')}
                    </Button>
                </div>
                <Table
                    columns={add_access_cols}
                    dataSource={add_access_rows.map(row => ({
                        ...row,
                        remove: (
                            <Button
                                type='text'
                                danger
                                onClick={() => {
                                    const new_rows = add_access_rows.filter(({ key }) => key !== row.key)
                                    set_add_access_rows(new_rows)
                                }}
                            >
                                {t('移除')}
                            </Button>
                        )
                    }))}
                />
            </div>
        </Modal>
})
