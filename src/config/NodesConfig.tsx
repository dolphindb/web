import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { EditableProTable } from '@ant-design/pro-components'
import NiceModal from '@ebay/nice-modal-react'
import { AutoComplete, Button, Collapse, Popconfirm, type CollapseProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { to_option } from 'xshell/utils.browser.js'

import { t } from '@i18n'
import { model } from '@model'

import { RefreshButton } from '@/components/RefreshButton/index.tsx'

import { NodesConfigAddModal } from './NodesConfigAddModal.tsx'
import { config, node_configs as all_node_configs, validate_config, validate_qualifier, node_configs_options } from './model.ts'
import type { NodesConfig } from './type.ts'
import { _2_strs, filter_config } from './utils.ts'


export function NodesConfig () {
    const { nodes_configs } = config.use(['nodes_configs'])
    
    const [active_key, set_active_key] = useState<string | string[]>('thread')
    
    const [search_key, set_search_key] = useState('')
    
    useEffect(() => {
        (async () => {
            await config.load_configs()
        })()
    }, [ ])
    
    const delete_config = useCallback(
        async (config_name: string) => {
            await config.delete_configs([config_name])
            model.message.success(t('删除成功'))
        },
        [ ]
    )
    
    const search_row = useCallback(
        (record, index) => {
            if (search_key === '')
                return ''
            // 根据 record 或 index 判断是否需要添加 highlight-row 类名
            const { name } = record
            return name.toLowerCase().includes(search_key.toLowerCase()) ? 'high-light-row' : ''
        },
        [search_key]
    )
    
    function on_search () {
        let keys = [ ]
        nodes_configs?.forEach(config => {
            const { category, name } = config
            if (name.toLowerCase().includes(search_key.toLowerCase()))
                keys.push(category)
        })
        set_active_key(keys)
    }
    
    const items: CollapseProps['items'] = useMemo(() => {
        let clsed_configs = Object.fromEntries(
            [...Object.keys(all_node_configs), t('其它')].map(category_name =>
                [category_name, [ ]]))
        
        nodes_configs?.forEach(nodes_config => {
            const { category } = nodes_config
            clsed_configs[category].push(nodes_config)
        })
        
        return Object.entries(clsed_configs).map(([key, clsed_config]) => ({
            key,
            label: <div className='collapse-title'>{key}</div>,
            children: (
                <EditableProTable
                    className='nodes-config-table'
                    rowKey='key'
                    columns={[
                        {
                            title: t('限定词'),
                            dataIndex: 'qualifier',
                            key: 'qualifier',
                            width: 300,
                            fieldProps: {
                                placeholder: t('请输入选择器')
                            },
                            formItemProps: {
                                rules: [
                                    {
                                        required: false
                                    }
                                ]
                            }
                        },
                        {
                            title: t('配置项'),
                            dataIndex: 'name',
                            key: 'name',
                            width: 400,
                            fieldProps: {
                                placeholder: t('请输入配置项')
                            },
                            formItemProps: {
                                rules: [
                                    {
                                        required: true,
                                        message: t('请输入配置项')
                                    }
                                ]
                            },
                            renderFormItem: () =>  
                                <AutoComplete<{ label: string, value: string }>
                                    showSearch
                                    optionFilterProp='label'
                                    options={(all_node_configs[key] || [ ]).map(to_option)} />
                        },
                        {
                            title: t('值'),
                            dataIndex: 'value',
                            key: 'value',
                            fieldProps: {
                                placeholder: t('请输入配置值')
                            },
                            formItemProps: {
                                rules: [
                                    {
                                        required: true,
                                        message: t('请输入配置值')
                                    }
                                ]
                            }
                        },
                        {
                            title: t('操作'),
                            valueType: 'option',
                            key: 'actions',
                            width: 240,
                            render: (text, record, _, action) => [
                                <Button
                                    type='link'
                                    key='editable'
                                    className='mr-btn'
                                    onClick={() => {
                                        action?.startEditable?.(record.key)
                                    }}
                                >
                                    {t('编辑')}
                                </Button>,
                                <Popconfirm 
                                    title={t('确认删除此配置项？')}
                                    key='delete'
                                    onConfirm={async () => delete_config(record.key as string)}
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button variant='link' color='danger'>{t('删除')}</Button>
                                </Popconfirm>
                            ]
                        }
                    ]}
                    value={clsed_config}
                    recordCreatorProps={false}
                    tableLayout='fixed'
                    rowClassName={search_row}
                    editable={{
                        type: 'single',
                        onSave: async (rowKey, data, row) => {
                            try {
                                const { name, qualifier, value } = data
                                await validate_config(name, value)
                                await validate_qualifier(name, qualifier)
                                const key = (qualifier ? qualifier + '.' : '') + name
                                if (rowKey !== key)
                                    config.nodes_configs.delete(rowKey as string)
                                await config.change_configs([[key, { name, qualifier, value, key }]])
                                model.message.success(t('保存成功，重启数据节点 / 计算节点生效'))
                            } catch (error) {
                                model.show_error({ error })
                                throw error
                            }
                        },
                        onDelete: async key => {
                            try {
                                await delete_config(key as string)
                            } catch (error) {
                                model.show_error({ error })
                                throw error
                            }
                        },
                        actionRender: (row, config, defaultDom) => [
                            defaultDom.save,
                            defaultDom.cancel
                        ],
                        deletePopconfirmMessage: t('确认删除此配置项？'),
                        saveText: (
                            <Button type='link' key='editable' className='mr-btn'>
                                {t('保存')}
                            </Button>
                        ),
                        deleteText: (
                            <Button variant='link' color='danger' key='delete' className='mr-btn'>
                                {t('删除')}
                            </Button>
                        ),
                        cancelText: (
                            <Button type='link' key='cancel'>
                                {t('取消')}
                            </Button>
                        )
                    }}
                />
            )
        }))
    }, [nodes_configs, search_key])
    
    return <div className='nodes-config-container'>
        <div className='toolbar'>
            <div className='auto-search'>
                <AutoComplete<string>
                    showSearch
                    placeholder={t('请输入想要查找的配置项')}
                    optionFilterProp='label'
                    value={search_key}
                    onChange={set_search_key}
                    filterOption={filter_config}
                    onKeyDown={e => {
                        if (e.key === 'Enter') 
                            on_search()
                    }}
                    options={node_configs_options} />
                    
                <Button icon={<SearchOutlined />} onClick={on_search}/>
            </div>
            <Button
                icon={<PlusOutlined />}
                type='primary'
                onClick={async () =>
                    NiceModal.show(NodesConfigAddModal)
                }
            >
                {t('新增配置')}
            </Button>
            <RefreshButton
                onClick={async () => {
                    await config.load_configs()
                    set_search_key('')
                    set_active_key('')
                    model.message.success(t('刷新成功'))
                }}
            />
        </div>
        <Collapse
            items={items}
            activeKey={active_key}
            onChange={key => {
                set_active_key(key)
            }}
        />
    </div>
}
