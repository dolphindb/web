import { CloseCircleOutlined, DeleteOutlined, EditOutlined, PlusCircleOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Button, Input, Popconfirm } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'

import { t } from '../../i18n/index.js'
import { model } from '../model.js'
import { config } from './model.js'
import { type ClusterNode } from './type.js'
import { _2_strs, strs_2_nodes } from './utils.js'


const { Search } = Input

export function NodesManagement () {
    
    const [nodes, set_nodes] = useState<ClusterNode[]>([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const actionRef = useRef<ActionType>()
    
    const cols: ProColumns<ClusterNode>[] = useMemo(() => ([
        {
            title: t('Host'),
            dataIndex: 'host',
            key: 'host',
            fieldProps: {
                placeholder: t('请输入 host'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入 host')
                }, {
                    pattern: /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/,
                    message: t('请输入正确的 host')
                }
            ]
            }
        },
        {
            title: t('Port'),
            dataIndex: 'port',
            key: 'port',
            fieldProps: {
                placeholder: t('请输入 port'),
                type: 'number',
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入 port')
                }]
            }
        },
        {
            title: t('Alias'),
            dataIndex: 'alias',
            key: 'alias',
            fieldProps: {
                placeholder: t('请输入 alias'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入 alias')
                }]
            }
        },
        {
            title: t('Mode'),
            dataIndex: 'mode',
            key: 'mode',
            valueType: 'select',
            valueEnum: {
                data: {
                    text: 'data',
                },
                agent: {
                    text: 'agent',
                },
                controller: {
                    text: 'controller',
                },
                computing: {
                    text: 'computing',
                },
            },
            fieldProps: {
                placeholder: t('请选择 mode'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请选择 mode')
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
                title={t('确认删除此节点？')}
                key='delete'
                onConfirm={async () => delete_nodes(record.id as string)}>
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
    ]), [ nodes ])
    
    const delete_nodes = useCallback(async (node_id: string) => 
        model.execute(
            async () => {
                const new_nodes = _2_strs(nodes).filter(nod => nod !== node_id)
                await config.save_cluster_nodes(new_nodes)
                actionRef.current.reload()
            }
        )
    , [nodes])
   
    console.log(model.nodes)
    
    return <EditableProTable
                rowKey='id'
                columns={cols}
                actionRef={actionRef}
                recordCreatorProps={
                    {
                        position: 'top',
                        record: () => ({
                            id: String(Date.now()),
                            host: '',
                            port: '',
                            alias: '',
                            mode: ''
                        }),
                        creatorButtonText: t('新增节点'),
                    }
                }
                request={async () => {
                    let value = [ ]
                    await model.execute(async () => {
                        value = (await config.get_cluster_nodes()).value as any[]
                        console.log('request nodes', value)
                    })
                    const nodes = strs_2_nodes(value)
                    set_nodes(nodes)
                    return {
                        data: nodes.filter(({ alias }) => alias.toLowerCase().includes(search_key.toLowerCase())),
                        success: true,
                        total: value.length
                    }
                }}
                toolBarRender={() => [
                    <Button
                        type='primary'
                        className='mr-btn'
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                                await actionRef.current.reload()
                                model.message.success(t('刷新成功'))
                            }}
                        >
                            {t('刷新')}
                    </Button>,
                    <Search
                        placeholder={t('请输入想要查找的节点别名')}
                        value={search_key}
                        enterButton
                        onChange={e => { set_search_key(e.target.value) }}
                        onSearch={async () => actionRef.current.reload()}
                    />
                ]
                }
                editable={
                    {
                        type: 'single',
                        
                        onSave: async (rowKey, data, row) => {
                           model.execute(async () => {
                                const node_strs = _2_strs(nodes)
                                let idx = node_strs.indexOf(rowKey as string)
                                if (idx === -1) 
                                    await config.save_cluster_nodes([ data.host + ':' + data.port + ':' + data.alias + ',' + data.mode, ...node_strs])
                                else 
                                    await config.save_cluster_nodes(node_strs.toSpliced(idx, 1, data.host + ':' + data.port + ':' + data.alias + ',' + data.mode))
                           })
                           actionRef.current.reload()
                           model.message.success(t('保存成功'))
                        },
                        onDelete: async (key, row) => delete_nodes(row.id),
                        deletePopconfirmMessage: t('确认删除此节点？'),
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
                    }
                }
            />
}
