import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { AutoComplete, Button, Popconfirm } from 'antd'

import { useCallback, useMemo, useRef, useState } from 'react'

import { genid, delay, unique } from 'xshell/utils.browser.js'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { config } from './model.js'

import type { ControllerConfig } from './type.js'
import { _2_strs, strs_2_controller_configs, filter_config } from './utils.ts'



export function ControllerConfig () {
    const [configs, set_configs] = useState<ControllerConfig[]>([ ])
    
    const [search_key, set_search_key] = useState('')
    const [search_value, set_search_value] = useState('')
    
    const actionRef = useRef<ActionType>()
    
    const cols: ProColumns<ControllerConfig>[] = useMemo(() => ([
        {
            title: t('配置项'),
            dataIndex: 'name',
            key: 'name',
            width: 400,
            fieldProps: {
                placeholder: t('请输入配置项'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入配置项！')
                },
                ]
            },
            renderFormItem: () =>  
                <AutoComplete<{ label: string, value: string }>
                    showSearch
                    optionFilterProp='label'
                    filterOption={filter_config}
                    options={config.get_controller_config().map(config => ({
                        label: config,
                        value: config
                    }))} 
                />
        },
        {
            title: t('值'),
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
                        action?.startEditable?.(record.id)
                    }}
                >
                    {t('编辑')}
                </Button>,
                <Popconfirm
                    title={t('确认删除此配置项？')}
                    key='delete'
                    onConfirm={async () => delete_config(record.id as string)}>
                    <Button type='link'>
                        {t('删除')}
                    </Button>
                </Popconfirm>
            ],
        },
    ]), [configs])
    
    const delete_config = useCallback(async (config_id: string) => {
        const new_configs = _2_strs(configs).filter(cfg => cfg !== config_id)
        await config.save_controller_configs(new_configs)
        actionRef.current.reload()
    }, [configs])
    
    return <EditableProTable
        rowKey='id'
        actionRef={actionRef}
        columns={cols}
        params={{ search_value }}
        request={async () => {
            const value = unique(await config.load_controller_configs())
            const configs = strs_2_controller_configs(value)
            set_configs(configs)
            return {
                data: configs.filter(({ name }) => name.toLowerCase().includes(search_value.toLowerCase())),
                success: true,
                total: value.length
            }
        }}
        scroll={{ y: 'calc(100vh - 250px)' }}
        recordCreatorProps={
            {
                position: 'bottom',
                record: () => ({
                    id: String(genid()),
                    name: '',
                    value: ''
                }),
                creatorButtonText: t('新增控制节点配置'),
                onClick () {
                    (async () => {
                        let $tbody = document.querySelector('.ant-table-body')
                        await delay(0)
                        $tbody.scrollTop = $tbody.scrollHeight
                    })()
                }
            }
        }
        toolBarRender={() => [
            <Button
                icon={<ReloadOutlined />}
                onClick={async () => {
                    await actionRef.current.reload()
                    set_search_key('')
                    set_search_value('')
                    model.message.success(t('刷新成功'))
                }}
            >
                {t('刷新')}
            </Button>,
            <div className='auto-search'>
                <AutoComplete<string>
                    showSearch
                    placeholder={t('请输入想要查找的配置项')}
                    optionFilterProp='label'
                    value={search_key}
                    onChange={value => {
                        set_search_key(value)
                    }}
                    filterOption={filter_config}
                    onKeyDown={e => {
                        if (e.key === 'Enter') 
                            set_search_value(search_key)
                    }}
                    options={config.get_controller_config().map(config => ({
                        label: config,
                        value: config
                        }))
                        
                } />
                <Button icon={<SearchOutlined />} onClick={() => { set_search_value(search_key) }}/>
            </div>
        ]}
        editable={{
            type: 'single',
            onSave: async (rowKey, data, row) => {
                try {
                    const config_strs = _2_strs(configs)
                    let idx = config_strs.indexOf(rowKey as string)
                    if (idx === -1)
                        await config.save_controller_configs([data.name + '=' + data.value, ...config_strs])
                    else
                        await config.save_controller_configs(config_strs.toSpliced(idx, 1, data.name + '=' + data.value))
                    actionRef.current.reload()
                    model.message.success(t('保存成功，重启集群生效'))
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
            },
            onDelete: async (key, row) => {
                try {
                    await delete_config(row.id)
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
            },
            deletePopconfirmMessage: t('确认删除此配置项？'),
            saveText:
                <Button
                    type='link'
                    key='editable'
                    className='mr-btn'
                >
                    {t('保存')}
                </Button>,
            deleteText:
                <Button
                    type='link'
                    key='delete'
                    className='mr-btn'
                >
                    {t('删除')}
                </Button>,
            cancelText:
                <Button
                    type='link'
                    key='cancel'
                >
                    {t('取消')}
                </Button>,
        }}
        tableLayout='fixed'
    />
}

