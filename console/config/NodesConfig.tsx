import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Button, Collapse, Input, Popconfirm, type CollapseProps } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../i18n/index.js'
import { model } from '../model.js'
import { config } from './model.js'
import { CONFIG_CLASSIFICATION, type NodesConfig, type ControllerConfig } from './type.js'
import { strs_2_nodes_config } from './utils.js'
import NiceModal from '@ebay/nice-modal-react'
import { NodesConfigAddModal } from './NodesConfigAddModal.js'

const { Search } = Input

export function NodesConfig () {
    
    const [configs, set_configs] = useState<NodesConfig[]>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const actionRef = useRef<ActionType>()
    
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
                    required: true,
                    message: t('请输入选择器！')
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
                // onConfirm={async () => delete_config(record.id as string)}
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
            const value = (await config.load_nodes_config()).value as string[]
            set_configs(strs_2_nodes_config(value))
        })
    }, [ ])
    
    
    const items: CollapseProps['items'] = useMemo(() => {
        let cfg_clses = Object.keys(CONFIG_CLASSIFICATION)
        let clsed_config = Object.fromEntries([...cfg_clses, 'others'].map(cfg => [cfg, [ ]]))
        let handled_configs = new Set()
        for (let config of configs) {
            if (handled_configs.has(config.id))
                break
            let is_others = true
            for (let cls of cfg_clses) 
                if (CONFIG_CLASSIFICATION[cls].has(config.name)) {
                    clsed_config[cls].push(config)
                    is_others = false
                    break
                }
            if (is_others)
                clsed_config.others.push(config)
            handled_configs.add(config.id)
        } 
              
         
                
            
        console.log('clsed', clsed_config)
        
        
        return Object.entries(CONFIG_CLASSIFICATION).map(([key, configs]) => ({
            key,
            label: key,
            children: <EditableProTable
                        className='nodes-config-table' 
                        rowKey='id'
                        actionRef={actionRef}
                        columns={cols}
                        request={async () => {
                            let value = [ ]
                            await model.execute(async () => {
                                value = (await config.load_controller_configs()).value as string[]
                                console.log('request configs:', value)
                            })
                            const configs = strs_2_nodes_config(value)
                            set_configs(configs)
                            return {
                                data: configs.filter(({ name }) => name.includes(search_key)),
                                success: true,
                                total: value.length
                            }
                        }}
                        recordCreatorProps={false}
                        tableLayout='fixed'
    />,
    })) }, [configs ])
    
    return <div className='nodes-config-container'>
            <div className='toolbar'>
                
                <Button
                    type='primary'
                    className='mr-btn'
                    icon={<ReloadOutlined />}
                    onClick={async () => actionRef.current.reload()}
                    >
                        {t('刷新')}
                </Button>
                
                <Button
                    type='primary'
                    className='mr-btn'
                    icon={<PlusOutlined/>}
                    onClick={async () => NiceModal.show(NodesConfigAddModal) }
                    >
                        {t('新增配置')}
                </Button>
                   
                <Search
                    placeholder={t('请输入想要查找的配置项')}
                    value={search_key}
                    enterButton
                    onChange={e => { set_search_key(e.target.value) }}
                    onSearch={async () => actionRef.current.reload()}
                />
            </div>
            <Collapse items={items} />
            </div>
        
}
