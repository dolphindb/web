import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { EditableProTable, type ProColumns } from '@ant-design/pro-components'
import NiceModal from '@ebay/nice-modal-react'
import { Button, Collapse, Input, Popconfirm, type CollapseProps } from 'antd'
import { useCallback, useMemo, useState } from 'react'

import { t } from '../../i18n/index.js'
import { model } from '../model.js'

import { NodesConfigAddModal } from './NodesConfigAddModal.js'
import { config } from './model.js'
import { CONFIG_CLASSIFICATION, type ControllerConfig, type NodesConfig } from './type.js'
import { _2_strs } from './utils.js'

const { Search } = Input

export function NodesConfig () {
    const { nodes_configs } = config.use(['nodes_configs'])
    
    const [active_key, set_active_key] = useState<string | string[]>('thread')
    
    const [search_key, set_search_key] = useState('')
    
    const cols: ProColumns<ControllerConfig>[] = useMemo(
        () => [
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
                }
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
                            action?.startEditable?.(record.name)
                        }}
                    >
                        {t('编辑')}
                    </Button>,
                    <Popconfirm title={t('确认删除此配置项？')} key='delete' onConfirm={async () => delete_config(record.name as string)}>
                        <Button type='link'>{t('删除')}</Button>
                    </Popconfirm>
                ]
            }
        ],
        [nodes_configs]
    )
    
    const delete_config = useCallback(
        async (config_name: string) => {
            await config.save_nodes_config([config_name], true)
            model.message.success(t('删除成功'))
        },
        [nodes_configs]
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
    
    const items: CollapseProps['items'] = useMemo(() => {
        let clsed_configs = Object.fromEntries([...Object.keys(CONFIG_CLASSIFICATION), t('其它')].map(cfg => [cfg, [ ]]))
        
        Array.from(nodes_configs).forEach(([key, nodes_config]) => {
            const { category } = nodes_config
            clsed_configs[category].push(nodes_config)
        })
        
        return Object.entries(clsed_configs).map(([key, clsed_config]) => ({
            key,
            label: <div className='collapse-title'>{key}</div>,
            children: (
                <EditableProTable
                    className='nodes-config-table'
                    rowKey='name'
                    columns={cols}
                    value={clsed_config}
                    recordCreatorProps={false}
                    tableLayout='fixed'
                    rowClassName={search_row}
                    editable={{
                        type: 'single',
                        onSave: async (rowKey, data, row) => {
                            const { name, qualifier, value } = data
                            const config_name = (qualifier ? qualifier + '.' : '') + name
                            await config.save_nodes_config([[config_name, { ...nodes_configs.get(config_name), value }]], false)
                            model.message.success(t('保存成功'))
                        },
                        onDelete: async (key, row) => delete_config(row.name as string),
                        deletePopconfirmMessage: t('确认删除此配置项？'),
                        saveText: (
                            <Button type='link' key='editable' className='mr-btn'>
                                {t('保存')}
                            </Button>
                        ),
                        deleteText: (
                            <Button type='link' key='delete' className='mr-btn'>
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
                <Button
                    icon={<ReloadOutlined />}
                    onClick={async () => {
                        await config.load_nodes_config()
                        model.message.success(t('刷新成功'))
                    }}
                >
                    {t('刷新')}
                </Button>
                
                <Button
                    icon={<PlusOutlined />}
                    onClick={async () =>
                        NiceModal.show(NodesConfigAddModal)
                    }
                >
                    {t('新增配置')}
                </Button>
                
                <Search
                    placeholder={t('请输入想要查找的配置项')}
                    value={search_key}
                    onChange={e => {
                        set_search_key(e.target.value)
                    }}
                    onSearch={async () => {
                        let keys = [ ]
                        Array.from(nodes_configs).forEach(([key, config]) => {
                            const { category, name } = config
                            if (name.toLowerCase().includes(search_key.toLowerCase()))
                                keys.push(category)
                        })
                        set_active_key(keys)
                    }}
                />
            </div>
            <Collapse
                items={items}
                bordered={false}
                activeKey={active_key}
                onChange={key => {
                    set_active_key(key)
                }}
            />
        </div>
}
