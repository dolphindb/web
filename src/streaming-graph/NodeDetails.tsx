import { useEffect } from 'react'
import { Tabs, Descriptions, Table, Empty, Tooltip } from 'antd'
import type { Node } from '@xyflow/react'

import { not_empty } from 'xshell/prototype.browser.js'
import { genid } from 'xshell/utils.browser.js'

import { get_type_name } from 'dolphindb/browser.js'

import { t } from '@i18n'

import { engine_table_column_names } from '@/computing/model.ts'

import { subscription_columns } from './Overview.tsx'
import { sgraph, type StreamGraphStatus } from './model.ts'


export function NodeDetails ({ node, status }: { node: Node<Record<string, any>> | null, status: StreamGraphStatus }) {
    const { label: name, showId, subType, variableName, initialName, taskId, logicalNode, schema, metrics } = node?.data || { }
    
    // 只有这两种引擎有状态指标
    const is_state_engine = subType === 'TIME_SERIES_ENGINE' || subType === 'REACTIVE_STATE_ENGINE'
    
    const is_table = subType === 'TABLE'
    
    let { engine_stats, subscription_stats } = sgraph.use(['engine_stats', 'subscription_stats'])
    
    useEffect(() => {
        if (!name)
            return
        
        if (is_state_engine && status === 'running')
            sgraph.get_engine_stats(name)
    }, [name])
    
    
    if (!node)
        return null
    
    return <Tabs
        defaultActiveKey='1'
        items={[
            {
                key: '1',
                label: t('节点详情'),
                children: <Descriptions
                    bordered
                    column={2}
                    styles={{ label: { whiteSpace: 'nowrap' } }}
                    size='small'
                    items={[
                        { label: 'ID', children: showId },
                        { label: t('类型'), children: subType },
                        { label: t('名称'), children: variableName },
                        { label: t('初始名称'), children: initialName },
                        { label: t('任务 ID'), children: taskId },
                        { label: t('节点'), children: logicalNode },
                        ... schema?.names.length ? [{
                            className: 'no-padding',
                            label: t('结构', { context: 'title' }),
                            span: 2,
                            children: <Schema schema={schema} />
                        }] : [ ],
                        ... metrics ? [{
                            className: 'no-padding',
                            label: t('指标'),
                            span: 2,
                            children: <Metrics metrics={metrics} />
                        }] : [ ],
                    ]}
                />
            },
            
            ... is_table ? [
                {
                    key: '2',
                    label: t('子图指标'),
                    children: (() => {
                        if (!subscription_stats)
                            return null
                        
                        if (!subscription_stats.length)
                            return <Empty description={t('无可用子图指标')} />
                        
                        // Filter data related to the current node's subGraph
                        const stats = subscription_stats.filter(item => 
                            item.taskId && Number(item.taskId) === Number(taskId))
                        
                        if (!stats.length)
                            return <Empty description={t('无 worker {{task_id}} 的可用子图指标', { task_id: taskId })} />
                        
                        return <Table
                            dataSource={stats}
                            columns={subscription_columns}
                            rowKey='topic'
                            pagination={false}
                            size='small'
                            scroll={{ x: 'max-content' }}
                        />
                    })()
                },
            ] : [ ],
            
            ... is_state_engine && status === 'running' ? [{
                key: '3',
                label: t('引擎指标'),
                children: (() => {
                    if (!engine_stats)
                        return null
                    
                    const { columns, types, data } = engine_stats
                    
                    return <Table
                        dataSource={data}
                        rowKey={() => genid()}
                        pagination={false} // 单行数据不需要分页
                        size='small'
                        scroll={{ x: 'max-content' }} // 允许横向滚动
                        bordered
                        columns={
                            columns.map((key, index) => ({
                                title: <Tooltip title={get_type_name(types[index])}>{key}</Tooltip>,
                                dataIndex: key,
                                key: key,
                                render: column_render
                            }))
                        }
                    />
                })()
            }] : [ ],
        ]}
    />
}


function column_render (text: any) {
    // 如果值是对象，转换为字符串显示
    if (typeof text === 'object')
        text = JSON.stringify(text)
    
    return <Tooltip placement='top' title={text}>
        <span className='engine-metrics-cell'>{text}</span>
    </Tooltip>
}


function Schema ({ schema }: { schema: any }) {
    return <Descriptions
        className='cell-descriptions schema'
        size='small'
        column={1}
        bordered
        items={schema.names.map((name: string, index: number) => ({
            key: name,
            label: name,
            children: <span style={{ color: get_type_color(schema.types[index]) }}>
                    {schema.types[index]}
                </span>
        }))}
    />
}


function Metrics ({ metrics }: { metrics: Record<string, any> }) {
    return <Descriptions
        className='cell-descriptions'
        size='small'
        column={1}
        bordered
        items={
            Object.entries(metrics)
                .filter(([key, value]) => key !== 'name' && not_empty(value) && value !== '')
                .map(([key, value]) => ({
                    label: engine_table_column_names[key] || key.to_space_case(),
                    children: String(value)
                }))
        }
    />
}


const type_colors = {
    DOUBLE: '#52c41a',
    SYMBOL: '#1890ff',
    TIMESTAMP: '#faad14'
}


function get_type_color (type: string) {
    return type_colors[type] || '#666666'
}
