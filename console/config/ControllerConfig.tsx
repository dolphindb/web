import { CloseCircleOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Button, Input, Popconfirm } from 'antd'

import { useCallback, useMemo, useRef, useState } from 'react'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'
import { config } from './model.js'

import { type Config } from './type.js'
import { configs_2_strs, strs_2_configs } from './utils.js'

const { Search } = Input

export function ControllerConfig () {
    const [configs, set_configs] = useState<Config[]>([ ])
    
    const [refresher, set_refresher] = useState(0)
    
    const [search_key, set_search_key] = useState('')
    
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([ ])
   
    const actionRef = useRef<ActionType>()
    
    const cols: ProColumns<Config>[] = useMemo(() => ([
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
                () => ({
                    async validator (rule, value) {
                        console.log('mode', configs.findIndex(cfg => cfg.name === value))
                        if (configs.findIndex(cfg => cfg.name === value) !== -1) 
                            return Promise.reject(t('该配置项已存在！'))
                        
                    },
                }),
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
                    console.log('edit config', record)
                    action?.startEditable?.(record.id)
                }}
              >
                {t('编辑')}
              </Button>,
              <Popconfirm 
                title={t('确认删除此配置项？')}
                key='delete'
                onConfirm={async () => delete_config(record.id as string)}>
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
    
    const delete_config = useCallback(async (config_id: string) => 
        model.execute(
            async () => {
                console.log('delete config', config_id, configs_2_strs(configs))
                const new_configs = configs_2_strs(configs).filter(cfg => cfg !== config_id)
                await config.save_controller_configs(new_configs)
                set_refresher(refresher + 1)
            }
        )
    , [configs])
    
    return <EditableProTable 
                rowKey='id'
                params={{ refresher }}
                actionRef={actionRef}
                columns={cols}
                request={async () => {
                    let value = [ ]
                    await model.execute(async () => {
                        value = (await config.load_controller_configs()).value as any[]
                        console.log('request configs', value)
                    })
                    const configs = strs_2_configs(value)
                    set_configs(configs)
                    return {
                        data: configs.filter(({ name }) => name.includes(search_key)),
                        success: true,
                        total: value.length
                    }
                }}
                recordCreatorProps={
                    {
                        position: 'top',
                        record: () => ({
                            id: String(Date.now()),
                            name: '',
                            value: ''
                        }),
                        creatorButtonText: t('新增控制节点配置'),
                        
                    }
                }
                toolBarRender={() => [
                    <Button
                        type='primary'
                        className='mr-btn'
                        icon={<ReloadOutlined />}
                        onClick={() => { set_refresher(refresher + 1) }}
                        >
                            {t('刷新')}
                    </Button>,
                    <Search
                        placeholder={t('请输入想要查找的配置项')}
                        value={search_key}
                        enterButton
                        onChange={e => { set_search_key(e.target.value) }}
                        onSearch={() => { set_refresher(refresher + 1) }}
                    />
                ]
                }
                editable={{
                    type: 'single',
                    editableKeys,
                    onSave: async (rowKey, data, row) => {
                        await config.save_controller_configs([ data.name + '=' + data.value, ...configs_2_strs(configs)])
                        set_refresher(refresher + 1)
                    },
                    onChange: setEditableRowKeys,
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
                tableLayout='fixed'
            />
}

