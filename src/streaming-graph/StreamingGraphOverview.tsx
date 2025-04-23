import { Card, Typography, Empty, Drawer, Descriptions, Table, Tooltip } from 'antd'
import useSWR from 'swr'
import { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Background, 
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  Position,
  type NodeProps,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  ConnectionLineType
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'

import './streaming-graph.sass'

import { t } from '@i18n'

import { model, type DdbNode, type DdbNodeState } from '@/model.ts'

import { node_state_icons } from '@/overview/table.tsx'

import { defGetTaskSubWorkerStat, getStreamGraphInfo, getTaskSubWorkerStat } from './apis.ts'
import { type StreamGraph, type GraphNode, type GraphEdge } from './types.ts'
import { NodeDetailsComponent } from './NodeDetailsComponent.tsx'

const { Text } = Typography

// 定义布局方向和节点间距
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({ }))

// 设置布局方向为水平方向
function getLayoutedElements (nodes: Node[], edges: Edge[]) {
  dagreGraph.setGraph({ 
    rankdir: 'LR',
    ranksep: 100,  // 大幅增加排之间的距离(从100增加到250)
    nodesep: 100,  // 增加同一排中节点之间的距离(从50增加到100)
    edgesep: 30    // 稍微增加边之间的最小距离(从20增加到30)
  })
  
  // 清除之前的布局
  dagreGraph.nodes().forEach(node => dagreGraph.removeNode(node))
  
  // 添加节点到布局引擎
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: node.data.width || 180, height: node.data.height || 100 })
  })
  
  // 添加边到布局引擎
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target)
  })
  
  // 计算布局
  dagre.layout(dagreGraph)
  
  // 应用布局结果到节点
  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id)
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.data.width || 180) / 2,
        y: nodeWithPosition.y - (node.data.height || 100) / 2
      }
    }
  })
  
  return { nodes: layoutedNodes, edges }
}

interface ProcessedNode {
  id: string
  x: number
  y: number
  label: string
  subType: string
  taskId: number
  schema: string
  width: number
  height: number
  subgraphId: string
  logicalNode: string
  nodeState?: DdbNodeState
}

interface ProcessedEdge {
  id: string
  sourceId: string
  targetId: string
}

interface StreamingGraphOverviewProps {
  id: string
}

// 自定义矩形节点组件
function CustomNode ({ data, id, selected }: NodeProps) {
  // 根据节点状态确定状态颜色
  const stateColors = {
    0: '#ff4d4f', // 停止 - 红色
    1: '#52c41a', // 运行 - 绿色
    2: '#faad14'  // 启动中 - 橙色
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
      <Handle
        type='target'
        position={Position.Left}
        style={{ background: '#555' }}
        isConnectable={false}
      />
      
      {/* 添加状态指示器 */}
      {data.nodeState !== undefined && (
        <div style={{
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
          fontSize: '10px',
        }}>
          {node_state_icons[Number(data.nodeState)]}
        </div>
      )}
      
      <div className='node-header'>{data.subType}</div>
      <div className='node-label' title={data.label}>{data.label}</div>
      
      {/* 增强逻辑节点显示 */}
      {data.logicalNode && (
        <div className='node-logical-enhanced' title={data.logicalNode} style={{
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '3px',
          fontSize: '11px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>Node: {data.logicalNode}</span>
        </div>
      )}
      
      <div className='node-task'>Task ID: {data.taskId}</div>
      {/* <div className='node-schema' 
        title={typeof data.schema === 'object' ? JSON.stringify(data.schema) : String(data.schema)}
      >
        {JSON.stringify(data.schema)}
      </div> */}
      <Handle
        type='source'
        position={Position.Right}
        style={{ background: '#555' }}
        isConnectable={false}
      />
    </div>
}

// 添加自定义子图容器组件
function SubgraphContainer ({ data, id }: NodeProps) {
  return <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      pointerEvents: 'none'
    }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        
        fontSize: '16px',
        fontWeight: 800,
        zIndex: 10
      }}>
        {data.label}
      </div>
    </div>
}

// 流图组件
function StreamingGraphVisualization ({ id }: { id: string }) {
  const [nodeMap, setNodeMap] = useState<Map<number, DdbNode>>()
  
  const { data, error, isLoading } = useSWR(
    ['getStreamGraphInfo', id], 
    async () => {
      const graphInfo = await getStreamGraphInfo(id)
      const nodes = await model.get_cluster_perf(true)
      
      const taskToNodeMap = new Map(
        graphInfo.meta.tasks.map(task => [task.id, nodes.find(({ name }) => name === task.node)])
      )
      setNodeMap(taskToNodeMap)
      return graphInfo
    },
    {
      refreshInterval: 500
    }
  )
  
  
  const [nodes, setNodes] = useNodesState([ ])
  const [edges, setEdges] = useEdgesState([ ])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  
  // 节点类型注册
  const nodeTypes: NodeTypes = {
    customNode: CustomNode,
    subgraphContainer: SubgraphContainer
  }
  
  // 处理节点点击
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setDrawerVisible(true)
  }, [ ])
  
  // 从原始数据转换为 ProcessedNode 和 ProcessedEdge
  const processGraphData = useCallback((graphData: StreamGraph) => { 
    if (!graphData)
        return { nodes: [ ], edges: [ ] }
    
    // 处理节点 - 创建 ProcessedNode 格式
    const processedNodes: ProcessedNode[] = graphData.nodes.map((node: GraphNode) => {
      const nodeType = node.properties?.type || 'DEFAULT'
      // 获取逻辑节点对象和名称
      const logicalNode = nodeMap?.get(node.taskId)
    
      const logicalNodeName = logicalNode?.name || ''
      // 获取节点状态
      const nodeState = logicalNode?.state
      return {
        id: node.id.toString(),
        x: 0,
        y: 0,
        label: node.properties?.name || node.properties?.initialName || `Node ${node.id}`,
        subType: nodeType,
        taskId: node.taskId,
        logicalNode: logicalNodeName,
        // 添加节点状态
        nodeState: nodeState,
        schema: node.properties?.schema || '',
        width: 180,
        height: 100,
        subgraphId: node.subgraphId.toString()
      }
    })
    
    // 处理边 - 创建 ProcessedEdge 格式
    const processedEdges: ProcessedEdge[] = graphData.edges.map((edge: GraphEdge) => ({
      id: edge.id.toString(),
      sourceId: edge.inNodeId.toString(),
      targetId: edge.outNodeId.toString()
    }))
    return { nodes: processedNodes, edges: processedEdges }
  }, [nodeMap])
  
  // 将 ProcessedNode 和 ProcessedEdge 转换为 ReactFlow 格式
  const convertToReactFlowFormat = useCallback((processedNodes: ProcessedNode[], processedEdges: ProcessedEdge[]) => {
    // 转换节点
    const reactFlowNodes: Node[] = processedNodes.map(node => ({
      id: node.id,
      position: { x: node.x, y: node.y },
      data: {
        label: node.label,
        logicalNode: node.logicalNode,
        nodeState: node.nodeState,
        subType: node.subType,
        taskId: node.taskId,
        schema: node.schema,
        width: node.width,
        height: node.height,
        subgraphId: node.subgraphId
      },
      type: 'customNode',
      style: { width: node.width, height: node.height }
    }))
    
    // 创建节点ID到节点数据的映射，用于快速查找
    const nodeMap = new Map(
      processedNodes.map(node => [node.id, node])
    )
    
    // 处理边 - 根据源节点状态设置边的样式
    const reactFlowEdges: Edge[] = processedEdges.map(edge => {
      // 获取源节点的状态
      const sourceNode = nodeMap.get(edge.sourceId)
      const nodeState = sourceNode?.nodeState !== undefined ? Number(sourceNode.nodeState) : 1
      
      // 根据状态设置边的样式
      // 状态0: 停止 - 红色且不流动
      // 状态1: 运行 - 绿色且流动
      // 状态2: 启动中 - 橙色且不流动
      const edgeStyles = {
        0: { color: '#ff4d4f', animated: false }, // 红色，不流动
        1: { color: '#52c41a', animated: true },  // 绿色，流动
        2: { color: '#faad14', animated: false }  // 橙色，不流动
      }
      
      const { color, animated } = edgeStyles[nodeState] || edgeStyles[1]
      
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'smoothstep',
        animated: animated,
        style: { 
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: '5, 5',
        },
        labelStyle: { fill: color, fontSize: 12 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: color,
        },
      }
    })
    
    // 应用dagre布局
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      reactFlowNodes,
      reactFlowEdges
    )
    
    // Group nodes by subgraphId for subgraph containers
    const subgraphGroups = layoutedNodes.reduce((groups, node) => {
      const subgraphId = node.data.subgraphId
      if (!groups[subgraphId])
          groups[subgraphId] = [ ]
      
      groups[subgraphId].push(node)
      return groups
    }, { })
    
    // Create subgraph container nodes
    const subgraphContainers: Node[] = Object.entries(subgraphGroups).map(([subgraphId, groupNodes]: [string, Node[]]) => {
      // Find boundaries of the group
      const nodePositions = groupNodes.map(node => ({
        left: node.position.x,
        right: node.position.x + Number(node.style?.width || 180),
        top: node.position.y,
        bottom: node.position.y + Number(node.style?.height || 100)
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
          backgroundColor: `rgba(${parseInt(subgraphId) * 50 % 255}, ${parseInt(subgraphId) * 30 % 255}, ${parseInt(subgraphId) * 70 % 255}, 0.1)`,
          border: '1px dashed rgba(0,0,0,0.2)',
          borderRadius: '8px',
          zIndex: -1 
        },
        data: {
          label: `Subgraph ${subgraphId}`,
          subgraphId,
          labelStyle: {
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '6px 10px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }
        }
      }
    })
    return { 
      nodes: [...subgraphContainers, ...layoutedNodes], 
      edges: layoutedEdges 
    }
  }, [ ])
  
  // 数据加载后更新图
  useEffect(() => {
    if (data?.graph)
        try {
        const graphData = typeof data.graph === 'string' ? JSON.parse(data.graph) : data.graph
        
        const { nodes: processedNodes, edges: processedEdges } = processGraphData(graphData)
        
        const { nodes: reactFlowNodes, edges: reactFlowEdges } = convertToReactFlowFormat(processedNodes, processedEdges)
        setNodes(reactFlowNodes)
        setEdges(reactFlowEdges)
      } catch (e) {
        console.error('Failed to parse graph data:', e)
      }
    
  }, [data, processGraphData, convertToReactFlowFormat, setNodes, setEdges, nodeMap])
  
  if (isLoading)
      return <Card loading />
  
  if (error)
      return <Text type='danger'>Failed to load data: {error.message}</Text>
  
  if (!data)
      return <Empty description='' />
  
  return <div className='streaming-graph-page'>
    <div style={{ height: 600, width: '100%', border: '1px solid #ddd', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
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
      >
        <Background color='#f8f8f8' gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {/* Node details drawer - contained within the flow container */}
      <Drawer
        title={t('详情')}
        placement='right'
        getContainer={false}
        width='50%'
        onClose={() => { setDrawerVisible(false) }}
        open={drawerVisible}
      >
        <NodeDetailsComponent selectedNode={selectedNode} id={id} />
      </Drawer>
    </div>
  </div>
}

export const task_status_columns_map = [
  {
    title: t('任务 ID'),
    dataIndex: 'taskId',
    key: 'taskId'
  },
  {
    title: t('表名'),
    dataIndex: 'tableName',
    key: 'tableName'
  },
  {
    title: t('订阅任务名称'),
    dataIndex: 'actionName',
    key: 'actionName'
  },
  {
    title: t('线程 ID'),
    dataIndex: 'workerId',
    key: 'workerId'
  },
  {
    title: t('订阅主题'),
    dataIndex: 'topic',
    key: 'topic'
  },
  {
    title: t('订阅方式'),
    dataIndex: 'type',
    key: 'type'
  },
  {
    title: t('队列深度上限'),
    dataIndex: 'queueDepthLimit',
    key: 'queueDepthLimit'
  },
  {
    title: t('队列深度'),
    dataIndex: 'queueDepth',
    key: 'queueDepth'
  },
  {
    title: t('已处理消息数'),
    dataIndex: 'processedMsgCount',
    key: 'processedMsgCount'
  },
  {
    title: t('最近处理消息 ID'),
    dataIndex: 'lastMsgId',
    key: 'lastMsgId'
  },
  {
    title: t('失败消息总数'),
    dataIndex: 'failedMsgCount',
    key: 'failedMsgCount'
  },
  {
    title: t('最近处理失败的消息 ID'),
    dataIndex: 'lastFailedMsgId',
    key: 'lastFailedMsgId'
  },
  {
    title: t('最近处理失败的时刻'),
    dataIndex: 'lastFailedTimestamp',
    key: 'lastFailedTimestamp'
  },
  {
    title: t('最近错误信息'),
    dataIndex: 'lastErrMsg',
    key: 'lastErrMsg'
  },
  {
    title: t('消息是否为表'),
    dataIndex: 'msgAsTable',
    key: 'msgAsTable'
  },
  {
    title:  t('批次大小'),
    dataIndex: 'batchSize',
    key: 'batchSize'
  },
  {
    title: t('等待间隔'),
    dataIndex: 'throttle',
    key: 'throttle'
  },
  {
    title: t('订阅 hash 值'),
    dataIndex: 'hash',
    key: 'hash'
  },
  {
    title: t('过滤列'),
    dataIndex: 'filter',
    key: 'filter'
  },
  {
    title: t('开启订阅偏移持久化'),
    dataIndex: 'persistOffset',
    key: 'persistOffset'
  },
  {
    title: t('强制按时间间隔触发'),
    dataIndex: 'timeTrigger',
    key: 'timeTrigger'
  },
  {
    title:  t('包含消息 ID'),
    dataIndex: 'handlerNeedMsgId',
    key: 'handlerNeedMsgId'
  },
  {
    title: t('高可用组'),
    dataIndex: 'raftGroup',
    key: 'raftGroup'
  },
  {
    title: t('节点'),
    dataIndex: 'node',
    key: 'node'
  }
]

export const task_status_columns = task_status_columns_map.map(({ title, dataIndex, key }) => ({
  title: title,
  dataIndex: dataIndex,
  key: key,
  render: (text: any) => {
    if (typeof text === 'object')
        text = JSON.stringify(text)
    
    return <Tooltip placement='topLeft' title={text}>
      <span style={{ overflow: 'hidden', maxWidth: 100, textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
        {text}
      </span>
    </Tooltip>
  }
}))

// Task Subscription Worker Status Table component
export function TaskSubWorkerStatTable ({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR(
    ['getTaskSubWorkerStat', id],
    async () => {
      await defGetTaskSubWorkerStat()
      return getTaskSubWorkerStat(id)
    },
    {
      refreshInterval: 500
    }
  )
  
  if (isLoading)
      return <Card loading />
    
  if (error)
      return <Text type='danger'>{t('加载流任务订阅线程状态失败：')} {error.message}</Text>
    
  if (!data || data.length === 0)
      return null
  
  // Extract columns from data
  
  
  return <Card title={t('流任务订阅线程状态')} style={{ marginTop: 16 }}>
      <Table 
        dataSource={data} 
        columns={task_status_columns} 
        rowKey={(record, index) => record.topic}
        pagination={{ 
          defaultPageSize: 5, 
          showSizeChanger: true,
          showQuickJumper: true
        }}
        scroll={{ x: 'max-content' }}
        size='small'
      />
    </Card>
}

// Export main component with ReactFlowProvider
export function StreamingGraphOverview ({ id }: StreamingGraphOverviewProps) {
  return <ReactFlowProvider>
      <StreamingGraphVisualization id={id} />
      <TaskSubWorkerStatTable id={id} />
    </ReactFlowProvider>
}


