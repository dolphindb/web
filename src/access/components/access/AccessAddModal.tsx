import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Button, Modal, Radio, Select, Table, type TableColumnType } from 'antd'

import { useMemo, useState } from 'react'

import { t } from '@i18n'

import { model } from '@model'

import { access } from '@/access/model.ts'
import { NEED_INPUT_ACCESS, ACCESS_OPTIONS } from '@/access/constants.tsx'

import { filter_access_options } from '@/access/utils/filter-access-options.ts'

import type { AccessCategory, AccessRole, AccessRule } from '@/access/types.ts'

import { use_access } from '@/access/hooks/use-access.ts'

import { AccessObjSelect } from './AccessObjSelect.tsx'


export const AccessAddModal = NiceModal.create(({ category, role, name }: { category: AccessCategory, role: AccessRole, name: string }) => {
    const { data: accesses, mutate: update_accesses } = use_access(role, name)
    
    const { v3 } = model.use(['v3'])
    
    category = v3 && category === 'database' ? 'catalog' : category
    
    const [add_rule_selected, set_add_rule_selected] = useState<AccessRule>({ access: ACCESS_OPTIONS[category][0], type: 'grant', obj: [ ] })
    
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
        [category]
    )
    
    const [add_access_rows, set_add_access_rows] = useState([ ])
    
    const modal = useModal()
    
    if (!accesses)
        return null
    
    return <Modal
            className='add-rule-modal'
            open={modal.visible}
            afterClose={modal.remove}
            onCancel={() => {
                set_add_rule_selected({ access: ACCESS_OPTIONS[category][0], type: 'grant', obj: [ ] })
                set_add_access_rows([ ])
                modal.hide()
            }}
            onOk={async () => {
                await Promise.all(
                    add_access_rows.map(async rule =>
                        access[rule.type](
                            name,
                            rule.access,
                            rule.access ===
                                'QUERY_RESULT_MEM_LIMIT' || rule.access === 'TASK_GROUP_MEM_LIMIT'
                                ? Number(rule.name)
                                : rule.name)))
                model.message.success(t('权限赋予成功'))
                set_add_rule_selected({ access: ACCESS_OPTIONS[category][0], type: 'grant', obj: [ ] })
                set_add_access_rows([ ])
                modal.hide()
                await update_accesses()
            }}
            destroyOnHidden
            okText={t('确认添加')}
            okButtonProps={{
                disabled: !add_access_rows.length
            }}
            title={t('添加权限')}
        >
            <div className='add-rule-container'>
                <div className='add-rule-header'>
                    <Radio.Group
                        options={['grant', 'deny'].map(x => ({
                            label: x,
                            value: x
                        }))}
                        value={add_rule_selected.type}
                        onChange={e => {
                            const selected = {
                                type: e.target.value,
                                access: filter_access_options(category, role, accesses.is_admin, e.target.value)?.[0],
                                obj: [ ]
                            }
                            set_add_rule_selected(selected)
                        }}
                        optionType='button'
                        buttonStyle='solid'
                    />
                    
                    <Select
                        className='access-select'
                        options={
                            filter_access_options(
                                category, 
                                role, 
                                accesses.is_admin, 
                                add_rule_selected.type
                            ).map(x => ({ label: x, value: x }))
                        }
                        value={add_rule_selected.access}
                        onChange={value => {
                            const selected = { ...add_rule_selected }
                            selected.access = value
                            selected.obj = [ ]
                            set_add_rule_selected(selected)
                        }}
                    />
                    
                    <AccessObjSelect
                        role={role}
                        category={category} 
                        add_rule_selected={add_rule_selected} 
                        set_add_rule_selected={set_add_rule_selected} 
                    />
                        
                    <Button
                        type='primary'
                        onClick={() => {
                            const { access, type, obj } = add_rule_selected
                            const rows =
                                category !== 'script' || NEED_INPUT_ACCESS.includes(access)
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
                            set_add_rule_selected({ access: ACCESS_OPTIONS[category][0], type: 'grant', obj: [ ] })
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
