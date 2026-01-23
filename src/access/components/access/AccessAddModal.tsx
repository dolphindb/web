import { default as NiceModal, useModal } from '@ebay/nice-modal-react'
import { Button, Modal, Radio, Select, Table } from 'antd'

import { useState } from 'react'

import { unique } from 'xshell/utils.browser.js'

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
    
    if (model.v3 && category === 'database')
        category = 'catalog'
    
    const [add_rule_selected, set_add_rule_selected] = useState<AccessRule>({
        access: ACCESS_OPTIONS[category][0],
        type: 'grant',
        obj: [ ]
    })
    
    const [add_access_rows, set_add_access_rows] = useState([ ])
    
    const modal = useModal()
    
    function reset_and_close () {
        set_add_rule_selected({ access: ACCESS_OPTIONS[category][0], type: 'grant', obj: [ ] })
        set_add_access_rows([ ])
        modal.hide()
    }
    
    if (!accesses)
        return null
    
    return <Modal
        className='add-rule-modal'
        title={t('添加权限')}
        open={modal.visible}
        onCancel={reset_and_close}
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
            
            await update_accesses()
            
            reset_and_close()
        }}
        okText={t('确认添加')}
        okButtonProps={{
            disabled: !add_access_rows.length
        }}
    >
        <div className='add-rule-container'>
            <div className='add-rule-header'>
                <Radio.Group
                    options={['grant', 'deny']}
                    value={add_rule_selected.type}
                    onChange={({ target: { value: type } }) => {
                        set_add_rule_selected({
                            type,
                            access: filter_access_options(category, role, accesses.is_admin, type)?.[0],
                            obj: [ ]
                        })
                    }}
                    optionType='button'
                    buttonStyle='solid'
                />
                
                <Select
                    className='access-select'
                    options={
                        filter_access_options(category, role, accesses.is_admin, add_rule_selected.type)
                            .map(x => ({ label: x, value: x }))
                    }
                    value={add_rule_selected.access}
                    onChange={access => {
                        set_add_rule_selected({
                            ...add_rule_selected,
                            access,
                            obj: [ ]
                        })
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
                            category !== 'script' || NEED_INPUT_ACCESS.has(access)
                                ? obj.map(o => ({
                                    key: access + type + o,
                                    access,
                                    type,
                                    name: o
                                }))
                                : [
                                    {
                                        key: access + type,
                                        access,
                                        type
                                    }
                                ]
                        
                        set_add_access_rows(unique([...rows, ...add_access_rows], 'key'))
                        set_add_rule_selected({ access: ACCESS_OPTIONS[category][0], type: 'grant', obj: [ ] })
                    }}
                >
                    {t('预添加')}
                </Button>
            </div>
            
            <Table
                dataSource={add_access_rows}
                pagination={{ hideOnSinglePage: true }}
                columns={[
                    {
                        title: t('类型'),
                        dataIndex: 'type',
                        key: 'type',
                    },
                    {
                        title: t('权限'),
                        dataIndex: 'access',
                        key: 'access',
                    },
                    {
                        title: category === 'script' ? t('上限值') : t('范围'),
                        dataIndex: 'name',
                        key: 'name'
                    },
                    {
                        title: t('动作'),
                        key: 'remove',
                        render: (_, row) => 
                            <Button
                                type='text'
                                danger
                                onClick={() => {
                                    set_add_access_rows(
                                        add_access_rows.filter(({ key }) => key !== row.key))
                                }}
                            >
                                {t('移除')}
                            </Button>
                    }
                ]}
            />
        </div>
    </Modal>
})
