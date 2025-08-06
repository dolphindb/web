import { Tabs, Descriptions, Table, Typography, Empty, Card, Tooltip } from 'antd'
import useSWR from 'swr'
import type { Node } from 'reactflow'

import { t } from '@i18n'

import { def_get_task_sub_worker_stat, get_steam_engine_stat, get_task_sub_worker_stat } from './apis.ts'
import { task_status_columns } from './Overview.tsx'
import type { StreamGraphStatus } from './types.ts'

const { Text } = Typography

interface NodeDetailsComponentProps {
    node: Node | null
    id: string
    status: StreamGraphStatus
}

export function NodeDetails ({ node, id, status }: NodeDetailsComponentProps) {
    const is_engine = node && (node.data?.subType === 'REACTIVE_STATE_ENGINE' || node.data?.subType === 'TIME_SERIES_ENGINE')
    const is_table = node?.data?.subType === 'TABLE'
    
    const { data, error, isLoading } = useSWR(node ? ['getTaskSubWorkerStat', id] : null, async () => {
        await def_get_task_sub_worker_stat()
        return get_task_sub_worker_stat(id)
    })
    
    const {
        data: engine_data,
        error: engine_error,
        isLoading: engine_loading
    } = useSWR(
        is_engine && status === 'running' ? ['getSteamEngineStat', node] : null,
        async () =>
            get_steam_engine_stat(node.data.label)
    )
    
    if (!node)
        return null
    
    const { showId, subType, variableName, initialName, taskId, logicalNode, schema, metrics } = node.data
    
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
                        if (isLoading)
                            return <Card loading />
                        
                        if (error)
                            return <Text type='danger'>Failed to load metrics data: {error.message}</Text>
                        
                        if (!data || data.length === 0)
                            return <Empty description='No metrics data available' />
                        
                        // Filter data related to the current node's subGraph
                        const data_ = data.filter(item => 
                            item.taskId !== undefined && Number(item.taskId) === Number(taskId))
                        
                        if (!data_.length)
                            return <Empty description={`No metrics data found for worker ${taskId}`} />
                        
                        return <Table
                            dataSource={data_}
                            columns={task_status_columns}
                            rowKey={(record, index) => index}
                            pagination={false}
                            size='small'
                            scroll={{ x: 'max-content' }}
                        />
                    })()
                },
            ] : [ ],
            
            ... is_engine && status === 'running' ? [{
                key: '3',
                label: t('引擎指标'),
                children: (() => {
                    if (engine_loading)
                        return <Card loading />
                    
                    if (engine_error)
                        return <Text type='danger'>Failed to load engine metrics data: {engine_error.message}</Text>
                    
                    if (!engine_data)
                        return <Empty description='No engine metrics data available' />
                    
                    // 从数据中提取列
                    const columns = engine_data.columns.map(key => ({
                        title: key,
                        dataIndex: key,
                        key: key,
                        render: (text: any) => {
                            // 如果值是对象，转换为字符串显示
                            if (typeof text === 'object')
                                text = JSON.stringify(text)
                            
                            // 添加 Tooltip 显示完整内容
                            return <Tooltip placement='topLeft' title={text}>
                                    <span
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            display: 'block',
                                            maxWidth: 150 // 限制最大宽度
                                        }}
                                    >
                                        {text}
                                    </span>
                                </Tooltip>
                        }
                    }))
                    
                    return <Table
                        dataSource={engine_data.data}
                        columns={columns}
                        pagination={false} // 单行数据不需要分页
                        size='small'
                        scroll={{ x: 'max-content' }} // 允许横向滚动
                        bordered
                    />
                })()
            }] : [ ],
        ]}
    />
}


function Schema ({ schema }: { schema: any }) {
    return <Descriptions
        className='cell-descriptions.schema'
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
                .filter(([key, value]) => key !== 'name' && value !== '')
                .map(([key, value]) => ({
                    label: key.to_space_case(),
                    children: value
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
