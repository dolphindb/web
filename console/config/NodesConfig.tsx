import { CloseCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Button, Collapse, Input, Popconfirm, type CollapseProps } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../i18n/index.js'
import { model } from '../model.js'
import { config } from './model.js'
import { CONFIG_CLASSIFICATION, type NodesConfig, type ControllerConfig } from './type.js'
import { _2_strs, strs_2_nodes_config } from './utils.js'
import NiceModal from '@ebay/nice-modal-react'
import { NodesConfigAddModal } from './NodesConfigAddModal.js'

const { Search } = Input

export function NodesConfig () {
    
    const [configs, set_configs] = useState<NodesConfig[]>([ ])
    
    const [active_key, set_active_key] = useState<string | string[]>('thread')
    
    const [search_key, set_search_key] = useState('')
    
    const [refresher, set_refresher] = useState({ })
    
    const cols: ProColumns<ControllerConfig>[] = useMemo(() => ([
        {
            title: t('Qualifier'),
            dataIndex: 'qualifier',
            key: 'qualifier',
            fieldProps: {
                placeholder: t('请输入选择器'),
            },
            formItemProps: {
                rules: [{
                    required: false,
                },
            ]
            }
        },
        {
            title: t('Name'),
            dataIndex: 'name',
            key: 'name',
            fieldProps: {
                placeholder: t('请输入配置名'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入配置名！')
                },
            ]
            }
        },
        {
            title: t('Value'),
            dataIndex: 'value',
            key: 'value',
            fieldProps: {
                placeholder: t('请输入配置值'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入配置值！')
                }]
            }
        },
        {
            title: t('Actions'),
            valueType: 'option',
            key: 'actions',
            width: 240,
            render: (text, record, _, action) => [
              <Button
                type='link'
                key='editable'
                className='mr-btn'
                icon={<EditOutlined />}
                onClick={() => {
                    console.log('edit config:', record)
                    action?.startEditable?.(record.id)
                }}
              >
                {t('编辑')}
              </Button>,
              <Popconfirm 
                title={t('确认删除此配置项？')}
                key='delete'
                onConfirm={async () => delete_config(record.id as string)}
                >
                <Button
                    type='link'
                    danger
                    icon={<DeleteOutlined />}
                >
                    {t('删除')}
                </Button>
              </Popconfirm>
            ],
          },
    ]), [configs ])
    
    useEffect(() => {
        model.execute(async () => {
            let value = (await config.load_nodes_config()).value as string[]
            set_configs(strs_2_nodes_config(value))
        })
    }, [refresher])
    
    const delete_config = useCallback(async (config_id: string) =>
        model.execute(
            async () => {
                console.log('delete config:', config_id, _2_strs(configs))
                const new_configs = _2_strs(configs).filter(cfg => cfg !== config_id)
                await config.save_nodes_config(new_configs)
                set_refresher({ })
                model.message.success(t('删除成功'))
            }
        )
    , [configs])
    
    const items: CollapseProps['items'] = useMemo(() => {
        let clsed_config = Object.fromEntries([...Object.keys(CONFIG_CLASSIFICATION), 'others'].map(cfg => [cfg, [ ]]))
        for (let config of configs) {
            const { category } = config
            clsed_config[category].push(config)
        }
        
        return Object.entries(clsed_config).map(([key, configs]) => ({
            key,
            label: <div className='collapse-title'>{key}</div>,
            children: <EditableProTable
                        className='nodes-config-table' 
                        rowKey='id'
                        columns={cols}
                        value={configs}
                        recordCreatorProps={false}
                        tableLayout='fixed'
                        editable={{
                            type: 'single',
                            onSave: async (rowKey, data, row) => {
                                model.execute(async () => {
                                    console.log(data)
                                    const config_strs = _2_strs(configs)
                                    await config.save_nodes_config(
                                        config_strs.toSpliced(
                                            config_strs.indexOf(rowKey as string), 1, 
                                                (data.qualifier ? data.qualifier + '.' : '') + data.name + '=' + data.value))
                                })
                                set_refresher({ })
                                model.message.success(t('保存成功'))
                            },
                            onDelete: async (key, row) => delete_config(row.id as string),
                            deletePopconfirmMessage: t('确认删除此配置项？'),
                            saveText: 
                                <Button
                                    type='link'
                                    key='editable'
                                    className='mr-btn'
                                    icon={<SaveOutlined />}
                                >
                                    {t('保存')}
                                </Button>,
                            deleteText: 
                                <Button
                                    type='link'
                                    key='delete'
                                    className='mr-btn'
                                    danger
                                    icon={<DeleteOutlined />}
                                >
                                    {t('删除')}
                                </Button>,
                            cancelText:
                                <Button
                                    type='link'
                                    key='delete'
                                    icon={<CloseCircleOutlined />}
                                >
                                    {t('取消')}
                                </Button>,
                        }}
                        
    />,
    })) }, [configs ])
    
    return <div className='nodes-config-container'>
            <div className='toolbar'>
                
                <Button
                    type='primary'
                    className='mr-btn'
                    icon={<ReloadOutlined />}
                    onClick={() => { 
                        set_refresher({ }) 
                        model.message.success(t('刷新成功'))
                    }}
                    >
                        {t('刷新')}
                </Button>
                
                <Button
                    type='primary'
                    className='mr-btn'
                    icon={<PlusOutlined/>}
                    onClick={async () => NiceModal.show(NodesConfigAddModal, { configs: _2_strs(configs) }) }
                    >
                        {t('新增配置')}
                </Button>
                   
                <Search
                    placeholder={t('请输入想要查找的配置项')}
                    value={search_key}
                    enterButton
                    onChange={e => { set_search_key(e.target.value) }}
                    onSearch={async () => {
                        let keys = [ ]
                        for (let config of configs) {
                            const { category, name } = config
                            if (name.toLowerCase().includes(search_key.toLowerCase()))
                                keys.push(category)
                        }
                        set_active_key(keys)
                    }}
                />
            </div>
            <Collapse 
                items={items} 
                bordered={false}
                activeKey={active_key}
                onChange={key => { set_active_key(key) }}/>
        </div>
        
}
