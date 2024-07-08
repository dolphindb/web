import { ReloadOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { Button, Input, Popconfirm } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'

import useSWR from 'swr'

import { DdbDatabaseError } from 'dolphindb/browser.js'

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
    
    const { mutate } = useSWR('/get/nodes', async () => config.get_cluster_nodes(), {
        onSuccess: data => {
            const nodes = strs_2_nodes(data.value as any[])
            set_nodes(nodes)
        }
    })
    
    const cols: ProColumns<ClusterNode>[] = useMemo(() => ([
        {
            title: t('别名'),
            dataIndex: 'alias',
            key: 'alias',
            fieldProps: {
                placeholder: t('请输入别名'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入别名')
                }]
            }
        },
        {
            title: t('类型'),
            dataIndex: 'mode',
            key: 'mode',
            valueType: 'select',
            valueEnum: {
                datanode: {
                    text: t('数据节点'),
                    value: 'datanode'
                },
                computenode: {
                    text: t('计算节点'),
                    value: 'computenode'
                },
                controller: {
                    text: t('控制节点'),
                    value: 'controller',
                },
                agent: {
                    text: t('代理节点'),
                    value: 'agent',
                },
                
            },
            fieldProps: {
                placeholder: t('请选择节点类型'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请选择节点类型')
                }]
            }
        },
        {
            title: t('主机名 / IP 地址'),
            dataIndex: 'host',
            key: 'host',
            fieldProps: {
                placeholder: t('请输入主机名 / IP 地址'),
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入主机名 / IP 地址')
                }]
            }
        },
        {
            title: t('端口号'),
            dataIndex: 'port',
            key: 'port',
            fieldProps: {
                placeholder: t('请输入端口号'),
                type: 'number',
            },
            formItemProps: {
                rules: [{
                    required: true,
                    message: t('请输入端口号')
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
                    title={t('确认删除此节点？')}
                    key='delete'
                    onConfirm={async () => delete_nodes(record.id as string)}>
                    <Button
                        type='link'
                    >
                        {t('删除')}
                    </Button>
                </Popconfirm>
            ],
        },
    ]), [nodes])
    
    const delete_nodes = useCallback(async (node_id: string) => {
        const new_nodes = _2_strs(nodes).filter(nod => nod !== node_id)
        await config.save_cluster_nodes(new_nodes)
        await mutate()
    }, [nodes])
        
        
    return <EditableProTable
        rowKey='id'
        columns={cols as any}
        actionRef={actionRef}
        recordCreatorProps={
            {
                position: 'bottom',
                record: () => ({
                    id: String(Date.now()),
                    host: '',
                    port: '',
                    alias: '',
                    mode: ''
                }),
                creatorButtonText: t('新增节点'),
                onClick: () => {
                    const tbody = document.querySelector('.ant-table-body')
                    setTimeout(() => tbody.scrollTop = tbody.scrollHeight, 1)
                }
            }
        }
        scroll={{ y: 'calc(100vh - 250px)' }}
        value={search_key ? nodes.filter(({ alias }) => alias.toLocaleLowerCase().includes(search_key.toLocaleLowerCase())) : nodes}
        toolBarRender={() => [
            <Button
                icon={<ReloadOutlined />}
                onClick={async () => {
                    await mutate()
                    model.message.success(t('刷新成功'))
                }}
            >
                {t('刷新')}
            </Button>,
            <Search
                className='toolbar-search'
                placeholder={t('请输入想要查找的节点别名')}
                onSearch={set_search_key}
            />
        ]
        }
        editable={
            {
                type: 'single',
                
                onSave: async (rowKey, { host, port, alias, mode }) => {
                  try {
                    const node_strs = _2_strs(nodes)
                    let idx = node_strs.indexOf(rowKey as string)
                    // 代理节点先执行 addAgentToController 在线添加
                    if (mode === 'agent') 
                        await config.add_agent_to_controller(host, Number(port), alias)
                    if (idx === -1)
                        await config.save_cluster_nodes([`${host}:${port}:${alias},${mode}`, ...node_strs])
                    else
                        await config.save_cluster_nodes(node_strs.toSpliced(idx, 1, `${host}:${port}:${alias},${mode}`))
                    mutate()
                    model.message.success(t('保存成功，重启集群生效'))
                  } catch (error) {
                      // 数据校验不需要展示报错弹窗
                      if (error instanceof DdbDatabaseError)
                          // eslint-disable-next-line @typescript-eslint/no-throw-literal
                          throw error
                  }
                },
                onDelete: async (_, row) => delete_nodes(row.id),
                deletePopconfirmMessage: t('确认删除此节点？'),
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
                        key='cancal'
                    >
                        {t('取消')}
                    </Button>,
            }
        }
    />
}
