import { CloseCircleOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Button, Input } from 'antd'
import { useMemo, useRef, useState } from 'react'

import { t } from '../../i18n/index.js'
import { model } from '../model.js'
import { config } from './model.js'

type ControllerConfigType = {
    id: React.Key
    name: string
    value: string
}

export function ControllerConfig () {
    const [configs, set_configs] = useState<string[]>([ ])
    
    const [refresher, set_refresher] = useState(0)
    
    const [search_key, set_search_key] = useState('')
    
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([ ])
   
    const actionRef = useRef<ActionType>()
    
    const cols: ProColumns<ControllerConfigType>[] = useMemo(() => ([
        {
            title: t('Name'),
            dataIndex: 'name',
            key: 'name',
            fieldProps: {
                placeholder: t('请输入配置名'),
            }
        },
        {
            title: t('Value'),
            dataIndex: 'value',
            key: 'value',
            fieldProps: {
                placeholder: t('请输入配置值'),
            }
        },
        {
            title: t('Actions'),
            valueType: 'option',
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
              <Button
                type='link'
                key='delete'
                danger
                icon={<DeleteOutlined />}
                onClick={async () => model.execute(
                    async () => {
                        const new_configs = configs.filter(cfg => cfg !== record.id)
                        await config.save_controller_configs(new_configs)
                        set_refresher(refresher + 1)
                    }
                )}
              >
                {t('删除')}
              </Button>,
            ],
          },
    ]), [configs])
    return <EditableProTable 
                rowKey='id'
                params={{ refresher }}
                actionRef={actionRef}
                columns={cols}
                request={async () => {
                    let value = [ ]
                    await model.execute(async () => {
                        value = (await config.load_controller_configs()).value as any[]
                        set_configs(value)
                        console.log('request configs', value)
                    })
                    return {
                        data: value.map(cfg => {
                            const [name, value] = cfg.split('=')
                            return {
                                id: cfg,
                                name,
                                value,
                                
                            }
                        }).filter(({ name }) => name.includes(search_key)),
                        success: true,
                        total: value.length
                    }
                }}
                recordCreatorProps={
                    {
                        position: 'top',
                        record: () => ({ id: (Math.random() * 1000000).toFixed(0), name: '', value: '' }),
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
                    <Input
                        placeholder={t('请输入想要查找的配置项')}
                        prefix={<SearchOutlined/>}
                        value={search_key}
                        onChange={e => { set_search_key(e.target.value) }}
                        onBlur={() => { set_refresher(refresher + 1) }}
                    />
                ]
                }
                editable={{
                    type: 'single',
                    editableKeys,
                    onSave: async (rowKey, data, row) => {
                        console.log(rowKey, data, row, configs, [...configs, data.name + '=' + data.value])
                        await config.save_controller_configs([ data.name + '=' + data.value, ...configs])
                        set_refresher(refresher + 1)
                    },
                    onChange: setEditableRowKeys,
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
