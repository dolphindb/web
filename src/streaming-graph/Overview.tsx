import { Drawer, Tooltip, type TableColumnsType } from 'antd'

import { useCallback, useEffect, useState } from 'react'
import {
    ReactFlow, Background, Controls, type Node, type Edge, type NodeTypes, 
    MarkerType, Position, type NodeProps, useNodesState, useEdgesState, ReactFlowProvider,
    Handle, ConnectionLineType
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'

import { not_empty } from 'xshell/prototype.browser.js'

import { t } from '@i18n'

import { model, type DdbNode, type DdbNodeState } from '@model'

import { node_state_icons } from '@/overview/table.tsx'
import { DDBTable } from '@components/DDBTable/index.tsx'
import { engine_table_column_names } from '@/computing/model.ts'

import { type StreamGraph, type GraphNode, type GraphEdge } from './model.ts'
import { NodeDetails } from './NodeDetails.tsx'
import { get_publish_stats_fundef, get_subscription_stats_funcdef, sgraph, type SubscriptionStat } from './model.ts'


export function Overview () {
    // 选中的 action_name 状态
    const [selected_action_name, set_selected_action_name] = useState<string | null>(null)
    
    return <ReactFlowProvider>
        <StreamingGraphVisualization selected_action_name={selected_action_name} set_selected_action_name={set_selected_action_name} />
        
        <div className='stat-tables'>
            <SubscriptionStatsTable selected_action_name={selected_action_name} on_action_name_select={set_selected_action_name} />
            <PublishStatsTable />
            
            <EngineTableStatsTable engine />
            <EngineTableStatsTable engine={false} />
        </div>
    </ReactFlowProvider>
}


// 定义布局方向和节点间距
let dagre_graph = new dagre.graphlib.Graph()
dagre_graph.setDefaultEdgeLabel(() => ({ }))

// 设置布局方向为水平方向
function get_layouted_elements (nodes: Node<Record<string, any>>[], edges: Edge[]) {
    dagre_graph.setGraph({
        rankdir: 'LR',
        ranksep: 100, // 大幅增加排之间的距离 (从 100 增加到 250)
        nodesep: 100, // 增加同一排中节点之间的距离 (从 50 增加到 100)
        edgesep: 30 // 稍微增加边之间的最小距离 (从 20 增加到 30)
    })
    
    // 清除之前的布局
    dagre_graph.nodes().forEach(node => {
        dagre_graph.removeNode(node)
    })
    
    // 添加节点到布局引擎
    nodes.forEach(node => {
        dagre_graph.setNode(node.id, { width: node.data.width || 180, height: node.data.height || 100 })
    })
    
    // 添加边到布局引擎
    edges.forEach(edge => {
        dagre_graph.setEdge(edge.source, edge.target)
    })
    
    // 计算布局
    dagre.layout(dagre_graph)
    
    return {
        nodes: nodes.map(node => {
            const { x, y } = dagre_graph.node(node.id)
            
            return {
                ...node,
                position: {
                    x: x - (node.data.width || 180) / 2,
                    y: y - (node.data.height || 100) / 2
                }
            }
        }),
        
        edges
    }
}

interface ProcessedNode {
    id: string
    x: number
    y: number
    showId: string
    variableName: string
    initialName: string
    label: string
    subType: string
    taskId: number
    schema: string
    width: number
    height: number
    subgraphId: string
    logicalNode: string
    nodeState?: DdbNodeState
    metrics?: Record<string, any>
}

interface ProcessedEdge {
    id: string
    sourceId: string
    targetId: string
    actionName?: string
}


// 自定义矩形节点组件
function CustomNode ({ data, selected }: NodeProps<any>) {
    // 根据节点状态确定状态颜色
    const stateColors = {
        0: '#ff4d4f', // 停止 - 红色
        1: '#52c41a', // 运行 - 绿色
        2: '#faad14' // 启动中 - 橙色
    }
    
    const stateColor = data.nodeState !== undefined ? stateColors[Number(data.nodeState)] : '#999'
    
    return <div
            className={`react-flow-node node-type-${data.subType}`}
            style={{
                width: data.width,
                height: data.height,
                transform: selected ? 'scale(1.05)' : undefined,
                boxShadow: selected ? '0 4px 8px rgba(0,0,0,0.3)' : undefined,
                zIndex: selected ? 1000 : undefined,
                borderLeft: `4px solid ${stateColor}` // 添加状态颜色边框
            }}
        >
            <Handle type='target' position={Position.Left} style={{ background: '#555' }} isConnectable={false} />
            
            {/* 添加状态指示器 */}
            {data.nodeState !== undefined && (
                <div
                    style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        backgroundColor: stateColor,
                        color: 'white',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                    }}
                >
                    {node_state_icons[Number(data.nodeState)]}
                </div>
            )}
            
            <div className='node-header'>{data.subType}</div>
            <div className='node-label' title={data.label}>
                {data.label}
            </div>
            
            {/* 增强逻辑节点显示 */}
            {data.logicalNode && (
                <div
                    className='node-logical-enhanced'
                    title={data.logicalNode}
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <span>{t('节点')}: {data.logicalNode}</span>
                </div>
            )}
            
            <div className='node-task'>{t('任务 ID')}: {data.taskId}</div>
            {/* <div className='node-schema' 
        title={typeof data.schema === 'object' ? JSON.stringify(data.schema) : String(data.schema)}
      >
        {JSON.stringify(data.schema)}
      </div> */}
            <Handle type='source' position={Position.Right} style={{ background: '#555' }} isConnectable={false} />
        </div>
}

// 添加自定义子图容器组件
function SubgraphContainer ({ data }: NodeProps<any>) {
    return <div
        style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            pointerEvents: 'none'
        }}
    >
        <div
            style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                
                fontSize: '16px',
                fontWeight: 800,
                zIndex: 10
            }}
        >
            {data.label}
        </div>
    </div>
}

// 流图组件
function StreamingGraphVisualization ({
    selected_action_name,
    set_selected_action_name
}: {
    selected_action_name: string | null
    set_selected_action_name: (actionName: string | null) => void
}) {
    const { name, graph } = sgraph.use(['name', 'graph'])
    
    const [node_map, set_node_map] = useState<Map<number, DdbNode>>()
    
    useEffect(() => {
        set_node_map(
            new Map(graph.meta.tasks.map(task => 
                [task.id, model.nodes.find(({ name }) => name === task.node)]))
        )
    }, [name, graph])
    
    const [nodes, set_nodes] = useNodesState([ ])
    const [edges, set_edges] = useEdgesState([ ])
    const [selected, set_selected] = useState<Node | null>(null)
    const [drawer_visible, set_drawer_visible] = useState(false)
    
    // 节点类型注册
    const node_types: NodeTypes = {
        customNode: CustomNode,
        subgraphContainer: SubgraphContainer
    }
    
    // 从原始数据转换为 ProcessedNode 和 ProcessedEdge
    const process_graph_data = useCallback(
        (graph_data: StreamGraph) => {
            if (!graph_data)
                return { nodes: [ ], edges: [ ] }
            
            return {
                nodes: graph_data.nodes.map((node: GraphNode) => {
                    const { type, id, variableName, initialName, name, schema, metrics } = node.properties || { }
                    
                    // 获取逻辑节点对象和名称
                    const logical_node = node_map?.get(node.taskId)
                    
                    return {
                        id: String(node.id),
                        x: 0,
                        y: 0,
                        showId: id,
                        variableName,
                        initialName,
                        label: name || initialName || variableName || `${t('节点')} ${node.id}`,
                        subType: type || 'DEFAULT',
                        taskId: node.taskId,
                        
                        logicalNode: logical_node?.name || '',
                        
                        // 添加节点状态
                        nodeState: logical_node?.state,
                        
                        schema: schema || '',
                        width: 180,
                        height: 100,
                        subgraphId: String(node.subgraphId),
                        
                        metrics
                    } as ProcessedNode
                }),
                
                edges: graph_data.edges.map((edge: GraphEdge) => {
                    // 从 subscription 中提取 actionName
                    const actionName = edge.subscription?.actionName || null
                    
                    return {
                        id: edge.id.toString(),
                        sourceId: edge.inNodeId.toString(),
                        targetId: edge.outNodeId.toString(),
                        actionName: actionName
                    } as ProcessedEdge
                })
            }
        },
        [node_map]
    )
    
    // 将 ProcessedNode 和 ProcessedEdge 转换为 ReactFlow 格式
    const convert_to_react_flow_format = useCallback(
        (processed_nodes: ProcessedNode[], processed_edges: ProcessedEdge[]) => {
            // 转换节点
            const react_flow_nodes: Node[] = processed_nodes.map(node => ({
                id: node.id,
                position: { x: node.x, y: node.y },
                data: {
                    showId: node.showId,
                    label: node.label,
                    variableName: node.variableName,
                    initialName: node.initialName,
                    logicalNode: node.logicalNode,
                    nodeState: node.nodeState,
                    subType: node.subType,
                    taskId: node.taskId,
                    schema: node.schema,
                    width: node.width,
                    height: node.height,
                    subgraphId: node.subgraphId,
                    metrics: node.metrics
                },
                type: 'customNode',
                width: node.width,
                height: node.height
            }))
            
            // 创建节点ID到节点数据的映射，用于快速查找
            const nodes = new Map(processed_nodes.map(node => [node.id, node]))
            
            // 处理边 - 根据源节点状态和选中状态设置边的样式
            const react_flow_edges: Edge[] = processed_edges.map(edge => {
                const { nodeState } = nodes.get(edge.sourceId) || { }
                
                const { color, animated } = edge_styles[
                    // node state
                    nodeState !== undefined ? Number(nodeState) : 1
                ] || edge_styles[1]
                
                // 检查边是否与选中的 actionName 相关
                const isSelected = selected_action_name && edge.actionName === selected_action_name
                
                return {
                    id: edge.id,
                    source: edge.sourceId,
                    target: edge.targetId,
                    type: ConnectionLineType.SmoothStep,
                    animated: animated,
                    data: {
                        actionName: edge.actionName
                    },
                    style: {
                        stroke: isSelected ? '#1890ff' : color, // 选中时使用蓝色
                        strokeWidth: isSelected ? 4 : 2, // 选中时加粗
                        strokeDasharray: '5, 5',
                        filter: isSelected ? 'drop-shadow(0 0 5px #1890ff)' : undefined // 选中时添加发光效果
                    },
                    labelStyle: {
                        fill: isSelected ? '#1890ff' : color,
                        fontSize: 12,
                        fontWeight: isSelected ? 'bold' : 'normal'
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 15,
                        height: 15,
                        color: isSelected ? '#1890ff' : color
                    }
                }
            })
            
            // 应用 dagre 布局
            const { nodes: layouted_nodes, edges: layouted_edges } = get_layouted_elements(react_flow_nodes, react_flow_edges)
            
            // Group nodes by subgraphId for subgraph containers
            const subgraph_groups = layouted_nodes.reduce((groups, node) => {
                const subgraphId = node.data.subgraphId
                groups[subgraphId] ||= [ ]
                
                groups[subgraphId].push(node)
                return groups
            }, { })
            
            // Create subgraph container nodes
            const subgraph_containers: Node[] = Object.entries(subgraph_groups).map(([subgraphId, groupNodes]: [string, Node[]]) => {
                // Find boundaries of the group
                const nodePositions = groupNodes.map(node => ({
                    left: node.position.x,
                    right: node.position.x + Number(node.width || 180),
                    top: node.position.y,
                    bottom: node.position.y + Number(node.height || 100)
                }))
                
                const padding = {
                    top: 40,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
                
                const left = Math.min(...nodePositions.map(pos => pos.left)) - padding.left
                const right = Math.max(...nodePositions.map(pos => pos.right)) + padding.right
                const top = Math.min(...nodePositions.map(pos => pos.top)) - padding.top
                const bottom = Math.max(...nodePositions.map(pos => pos.bottom)) + padding.bottom
                
                return {
                    id: `subgraph-${subgraphId}`,
                    type: 'subgraphContainer',
                    position: { x: left, y: top },
                    style: {
                        width: right - left,
                        height: bottom - top,
                        backgroundColor: `rgba(${(parseInt(subgraphId) * 50) % 255}, ${(parseInt(subgraphId) * 30) % 255}, ${(parseInt(subgraphId) * 70) % 255}, 0.1)`,
                        border: '1px dashed rgba(0,0,0,0.2)',
                        zIndex: -1
                    },
                    data: {
                        label: `${t('子图')} ${subgraphId}`,
                        subgraphId,
                        labelStyle: {
                            fontSize: '16px',
                            fontWeight: 800,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            padding: '6px 10px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }
                    }
                }
            })
            return {
                nodes: [...subgraph_containers, ...layouted_nodes],
                edges: layouted_edges
            }
        },
        [selected_action_name, node_map])
    
    // 数据加载后更新图
    useEffect(() => {
        if (!graph?.graph)
            return
        
        const graph_data = typeof graph.graph === 'string' ? JSON.parse(graph.graph) : graph.graph
        const { nodes: processed_nodes, edges: processed_edges } = process_graph_data(graph_data)
        const { nodes, edges } = convert_to_react_flow_format(processed_nodes, processed_edges)
        set_nodes(nodes)
        set_edges(edges)
    }, [graph, process_graph_data, convert_to_react_flow_format, node_map])
    
    if (!graph)
        return null
    
    return <div className='streaming-graph-page'>
        <div className='react-flow-container'>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={(event, node) => {
                    // 只有当点击的是Node类型节点时才显示抽屉
                    if (node.type !== 'subgraphContainer') {
                        set_selected(node)
                        set_drawer_visible(true)
                    }
                }}
                onEdgeClick={(event, edge) => {
                    const current_action_name = edge?.data?.actionName
                    if (current_action_name)
                        set_selected_action_name(current_action_name)
                    if (selected_action_name === current_action_name)
                        set_selected_action_name('')
                }}
                nodeTypes={node_types}
                fitView
                attributionPosition='bottom-right'
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    style: {
                        stroke: '#1890ff',
                        strokeWidth: 2,
                        strokeDasharray: '5, 5'
                    }
                }}
                minZoom={0.1}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
            >
                <Background color='#f8f8f8' gap={16} />
                <Controls showInteractive={false} />
            </ReactFlow>
            
            {/* Node details drawer - contained within the flow container */}
            <Drawer
                className='node-details'
                title={t('详情')}
                placement='right'
                getContainer={false}
                width='50%'
                onClose={() => {
                    set_drawer_visible(false)
                }}
                open={drawer_visible}
            >
                <NodeDetails node={selected} status={graph.meta.status} />
            </Drawer>
        </div>
    </div>
}


const edge_styles = {
    0: { color: '#ff4d4f', animated: false },
    1: { color: '#52c41a', animated: true },
    2: { color: '#faad14', animated: false }
}


export const subscription_columns = [
    { title: t('任务 ID'), key: 'taskId' },
    { title: t('表名'), key: 'tableName' },
    { title: t('订阅任务名称'), key: 'actionName' },
    { title: t('线程 ID'), key: 'workerId' },
    { title: t('订阅主题'), key: 'topic' },
    { title: t('订阅方式'), key: 'type' },
    { title: t('队列深度上限'), key: 'queueDepthLimit' },
    { title: t('队列深度'), key: 'queueDepth' },
    { title: t('已处理消息数'), key: 'processedMsgCount' },
    { title: t('最近处理消息 ID'), key: 'lastMsgId' },
    { title: t('失败消息总数'), key: 'failedMsgCount' },
    { title: t('最近处理失败的消息 ID'), key: 'lastFailedMsgId' },
    { title: t('最近处理失败的时刻'), key: 'lastFailedTimestamp' },
    { title: t('最近错误信息'), key: 'lastErrMsg' },
    { title: t('消息是否为表'), key: 'msgAsTable' },
    { title: t('批次大小'), key: 'batchSize' },
    { title: t('等待间隔'), key: 'throttle' },
    { title: t('订阅 hash 值'), key: 'hash' },
    { title: t('过滤列'), key: 'filter' },
    { title: t('开启订阅偏移持久化'), key: 'persistOffset' },
    { title: t('强制按时间间隔触发'), key: 'timeTrigger' },
    { title: t('包含消息 ID'), key: 'handlerNeedMsgId' },
    { title: t('高可用组'), key: 'raftGroup' },
    { title: t('节点'), key: 'node' }
].map(({ title, key }) => ({
    title: title,
    dataIndex: key,
    key: key,
    render (value: any) {
        if (typeof value === 'object')
            value = JSON.stringify(value)
        
        return <Tooltip placement='topLeft' title={value}>
            <span style={{ overflow: 'hidden', maxWidth: 100, textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{not_empty(value) ? String(value) : ''}</span>
        </Tooltip>
    }
}))


export function SubscriptionStatsTable ({
    selected_action_name,
    on_action_name_select
}: {
    selected_action_name: string | null
    on_action_name_select: (actionName: string | null) => void
}) {
    const { name, subscription_stats } = sgraph.use(['name', 'subscription_stats'])
    
    useEffect(() => {
        sgraph.get_subscription_stats()
    }, [name])
    
    return <DDBTable<SubscriptionStat>
        title={t('流任务订阅')}
        help={helps.subscriptions}
        dataSource={subscription_stats}
        columns={subscription_columns}
        rowKey='topic'
        pagination={{
            defaultPageSize: 5,
            showSizeChanger: true,
            showQuickJumper: true,
            hideOnSinglePage: true
        }}
        scroll={{ x: 'max-content' }}
        size='small'
        onRow={record => ({
            onClick () {
                on_action_name_select(record.actionName === selected_action_name ? null : record.actionName)
            },
            style: {
                cursor: 'pointer'
            }
        })}
        rowClassName={record => (record.actionName === selected_action_name ? 'ant-table-row-selected' : '')}
    />
}


function PublishStatsTable () {
    let { name, publish_stats } = sgraph.use(['name', 'publish_stats'])
    
    useEffect(() => {
        sgraph.get_publish_stats()
    }, [name])
    
    return <DDBTable
        className='publish-stats-table'
        title={t('流任务发布')}
        help={helps.publish}
        dataSource={publish_stats}
        size='small'
        rowKey={({ table_name, client }) => `${table_name}-${client}`}
        scroll={{ x: 'max-content' }}
        columns={publish_stats_columns}
    />
}


const publish_stats_columns: TableColumnsType = [
    { title: t('表名'), dataIndex: 'table_name' },
    { title: t('客户端'), dataIndex: 'client' },
    { title: t('队列深度'), dataIndex: 'queue_depth' },
    { title: t('队列深度上限'), dataIndex: 'queue_depth_limit' }
]


/** 显示引擎或者流表的状态表 */
function EngineTableStatsTable ({ engine }: { engine: boolean }) {
    const { graph: { graph: { nodes } } } = sgraph.use(['graph'])
    
    // 过滤出引擎或者流表
    const filter = engine ? 
        ({ properties: { type, metrics } }: GraphNode) => metrics && type !== 'TABLE' && type !== 'CHANNEL'
    :
        ({ properties: { type, metrics } }: GraphNode) => metrics && type === 'TABLE'
    
    const metrics = nodes.filter(filter)
        .map(({ properties: { metrics } }) => metrics)
    
    // console.log(`流${engine ? '引擎' : '表'}:`, metrics)
    
    const metric = metrics[0]
    
    if (!metric)
        return null
    
    return <DDBTable
        className='publish-stats-table'
        title={engine ? t('流引擎') : t('流表')}
        help={helps.tables}
        dataSource={metrics}
        size='small'
        rowKey={engine ? 'name' : 'TableName'}
        scroll={{ x: 'max-content' }}
        columns={
            (engine ?
                Object.keys(metric)
            :
                ['TableName', ... Object.keys(metric).filter(key => key !== 'TableName')]
            )
                .map((key, index) => ({
                    key,
                    dataIndex: key,
                    title: <span title={key.to_space_case()}>{engine_table_column_names[key] || key.to_space_case()}</span>,
                    fixed: index === 0,
                    render: String
                }))}
    />
}


const engine_table_script = 'getStreamGraphInfo(fullname).graph.nodes.properties.metrics'

const helps = {
    subscriptions: t('监控订阅节点的工作线程状态，以及流图中所有流任务的订阅信息\n') +
        get_subscription_stats_funcdef,
    
    publish: t('监控流任务中所有订阅表对应的发布端连接状态\n') +
        get_publish_stats_fundef,
    
    engines: t('监控流图中所有流计算引擎的状态\n') +
        engine_table_script,
    
    tables: t('监控流图中所有流表的状态\n') +
        engine_table_script
}

