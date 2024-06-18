import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Button, Checkbox, Divider, Input, Modal, Radio, Select, Table, TableColumnType, TreeSelect } from "antd";
import { t } from "../../../../i18n/index.js";
import { access } from "../../model.js";
import { ACCESS_TYPE, NeedInputAccess, access_options } from "../../constants.js";
import { useMemo, useState } from "react";
import { model } from "../../../model.js";
import { filterAccessOptions } from "../../utils/filter-access-options.js";

export interface ACCESS {
    key: string
    access: string
    name?: string
}


export const AccessAddModal = NiceModal.create(({ category }: { category: 'database' | 'shared' | 'stream' | 'function_view' | 'script' }) => {
    const { databases, shared_tables, stream_tables, function_views, current, accesses } = access.use([
        'databases',
        'shared_tables',
        'stream_tables',
        'function_views',
        'current',
        'accesses'
    ])

    const [add_rule_selected, set_add_rule_selected] = useState({ access: access_options[category][0], type: 'grant', obj: [] })



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
            ...(category !== 'script'
                ? [
                    {
                        title: t('范围'),
                        dataIndex: 'name',
                        key: 'name'
                    }
                ]
                : []),
            {
                title: t('动作'),
                dataIndex: 'remove',
                key: 'remove',
                wdith: 100
            }
        ],
        []
    )

    const [add_access_rows, set_add_access_rows] = useState([])

    let obj_options = []
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

    const modal = useModal()

    return (
        <Modal
            className='add-rule-modal'
            open={modal.visible}
            afterClose={modal.remove}
            onCancel={() => {
                set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [] })
                set_add_access_rows([])
                modal.hide()
            }}
            onOk={async () => {
                await Promise.all(add_access_rows.map(async rule => access[rule.type](current.name, rule.access, rule.name)))
                model.message.success(t('权限赋予成功'))
                set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [] })
                set_add_access_rows([])
                modal.hide()
                access.set({
                    accesses:
                        current.role === 'user'
                            ? (await access.get_user_access([current.name]))[0]
                            : (await access.get_group_access([current.name]))[0]
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
                            const selected = { ...add_rule_selected }
                            selected.type = e.target.value
                            set_add_rule_selected(selected)
                        }}
                        optionType='button'
                        buttonStyle='solid'
                    />
                    <Select
                        className='access-select'
                        // 对于当前用户是管理员，不能赋予 VIEW_OWNER 权限
                        options={filterAccessOptions(category, current.role, accesses.is_admin).map(ac => ({
                            label: ac,
                            value: ac
                        }))}
                        value={add_rule_selected.access}
                        onChange={value => {
                            const selected = { ...add_rule_selected }
                            selected.access = value
                            selected.obj = []
                            set_add_rule_selected(selected)
                        }}
                    />
                    {NeedInputAccess.includes(add_rule_selected.access) ? <Input className='table-select' /> : (category === 'database' && ACCESS_TYPE.table.includes(add_rule_selected.access) ? (
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
                            dropdownRender={originNode => <div>
                                <Checkbox
                                    className='check-all'
                                    checked={add_rule_selected.obj.length === databases.reduce((count, db) => count + db.tables.length, 0)}
                                    indeterminate={
                                        add_rule_selected.obj.length > 0 &&
                                        add_rule_selected.obj.length < databases.reduce((count, db) => count + db.tables.length, 0)
                                    }
                                    onChange={e => {
                                        if (e.target.checked)
                                            set_add_rule_selected({ ...add_rule_selected, obj: databases.map(db => [...db.tables]).flat() })
                                        else
                                            set_add_rule_selected({ ...add_rule_selected, obj: [] })
                                    }}
                                >
                                    {t('全选')}
                                </Checkbox>
                                <Divider className='divider' />
                                {originNode}
                            </div>}
                            treeData={databases.map(db => ({
                                title: db.name,
                                value: db.name,
                                selectable: false,
                                children: db.tables.map(tb => ({
                                    title: tb,
                                    value: tb
                                }))
                            }))}
                        />
                    ) : (
                        <Select
                            className='table-select'
                            mode='multiple'
                            maxTagCount='responsive'
                            disabled={category === 'script'}
                            placeholder={category === 'script' ? t('应用范围为全局') : t('请选择权限应用范围')}
                            value={add_rule_selected.obj}
                            dropdownRender={originNode => <div>
                                <Checkbox
                                    className='check-all'
                                    checked={add_rule_selected.obj.length === obj_options.length}
                                    indeterminate={add_rule_selected.obj.length > 0 && add_rule_selected.obj.length < obj_options.length}
                                    onChange={e => {
                                        if (e.target.checked)
                                            set_add_rule_selected({ ...add_rule_selected, obj: obj_options })
                                        else
                                            set_add_rule_selected({ ...add_rule_selected, obj: [] })
                                    }}
                                >
                                    {t('全选')}
                                </Checkbox>
                                <Divider className='divider' />
                                {originNode}
                            </div>}
                            onChange={vals => {
                                set_add_rule_selected({ ...add_rule_selected, obj: vals })
                            }}
                            options={obj_options.map(obj => ({
                                key: obj,
                                label: obj,
                                value: obj
                            }))}
                        />
                    ))}

                    <Button
                        type='primary'
                        onClick={() => {
                            const { access, type, obj } = add_rule_selected
                            const rows =
                                category !== 'script'
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
                            set_add_rule_selected({ access: access_options[category][0], type: 'grant', obj: [] })
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
        </Modal>)
})