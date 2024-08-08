import { useEffect, useState, useRef } from 'react'

import { t } from '@i18n/index.js'

import { Button, Popconfirm } from 'antd'

import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'

import { config } from './model.js'

import { model } from '@/model.js'

import './index.sass'

export function ComputeGroupConfig () {

    const { nodes_configs: nodesConfigRaw } = config.use(['nodes_configs']) // 获取原始的 nodes_configs 字符串数组
    const { nodes, node_type, logined } = model.use(['nodes', 'node_type', 'logined'])
    const [current_compute_group, set_current_compute_group] = useState<string>('')
    
    // 将 nodes_configs 字符串数组转换为 NodesConfig 对象数组
    const nodes_configs = Array.from(nodesConfigRaw.values())
    
    const compute_groups = new Map()
    nodes.forEach(config => {
        if (config.computeGroup)
            if (!compute_groups.has(config.computeGroup))
                compute_groups.set(config.computeGroup, 1)
            else
                compute_groups.set(config.computeGroup, compute_groups.get(config.computeGroup) + 1)
                
    })
    
    const groups = Array.from(compute_groups.keys()) as unknown as string[]
    
    useEffect(() => {
        if (groups.length > 0 && current_compute_group === '')
            set_current_compute_group(groups[0])
            
    }, [JSON.stringify(groups)])
    
    const select_items = groups.map(group => {
        const count = compute_groups.get(group)
        return <div
            key={group}
            className={`select-item ${current_compute_group === group ? 'active' : ''}`}
            onClick={() => { set_current_compute_group(group) }}
        >
            <div className='title'>
                {group}
            </div>
            {count} {t('个节点')}
        </div>
    })
    
    
    // 筛选配置项
    const filtered_configs = nodes_configs.filter(config => {
        return config.qualifier.startsWith(`${current_compute_group}%`)
    })
    
    
    const actionRef = useRef<ActionType>()
    
    const columns: ProColumns<any>[] = [
        {
            title: t('配置项'),
            dataIndex: 'key',
            key: 'qualifier',
            width: 400,
        },
        {
            title: t('值'),
            dataIndex: 'value',
            key: 'value',
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
                    onConfirm={async () => {
                    }}
                >
                    <Button type='link'>
                        {t('删除')}
                    </Button>
                </Popconfirm>
            ],
        },
    ]
    
    return <div className='config compute-group'>
        <div className='select' >
            {select_items}
        </div>
        <EditableProTable
            rowKey='key'
            actionRef={actionRef}
            columns={columns}
            dataSource={filtered_configs}
            request={async () => {
                return {
                    data: filtered_configs,
                    success: true,
                    total: filtered_configs.length
                }
            }}
            editable={{
                type: 'single',
                onSave: async (rowKey, data, row) => {
                },
                onDelete: async (key, row) => {
                },
                deletePopconfirmMessage: t('确认删除此配置项？'),
            }}
        />
    </div>
}
