import { Card, Typography, Empty, Drawer, Descriptions, Table } from 'antd'
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

import { defGetTaskSubWorkerStat, getStreamGraphInfo, getTaskSubWorkerStat } from './apis.ts'
import { type StreamGraph, type GraphNode, type GraphEdge } from './types.ts'
import { NodeDetailsComponent } from './NodeDetailsComponent.tsx'

const { Text } = Typography

// 定义布局方向和节点间距
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({ }))

// 设置布局方向为水平方向
function getLayoutedElements (nodes: Node[], edges: Edge[], direction = 'LR') {
  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 100,  // 减小排之间的距离(之前是150)
    nodesep: 50,   // 减小同一排中节点之间的距离(之前是80)
    edgesep: 20    // 减小边之间的最小距离(之前是30)
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
  return <div 
      className={`react-flow-node node-type-${data.subType}`}
      style={{
        width: data.width,
        height: data.height,
        transform: selected ? 'scale(1.05)' : undefined,
        boxShadow: selected ? '0 4px 8px rgba(0,0,0,0.3)' : undefined,
        zIndex: selected ? 1000 : undefined
      }}
    >
      <Handle
        type='target'
        position={Position.Left}
        style={{ background: '#555' }}
        isConnectable={false}
      />
      <div className='node-header'>{data.subType}</div>
      <div className='node-label' title={data.label}>{data.label}</div>
      <div className='node-task'>Task ID: {data.taskId}</div>
      <div className='node-schema' title={data.schema}>
        {data.schema && data.schema.length > 20 
          ? `${data.schema.substring(0, 20)}...` 
          : data.schema
        }
      </div>
      <Handle
        type='source'
        position={Position.Right}
        style={{ background: '#555' }}
        isConnectable={false}
      />
    </div>
}

// 流图组件
function StreamingGraphVisualization ({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR(
    ['getStreamGraphInfo', id], 
    async () => getStreamGraphInfo(id)
  )
  
  const [nodes, setNodes] = useNodesState([ ])
  const [edges, setEdges] = useEdgesState([ ])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  
  // 节点类型注册
  const nodeTypes: NodeTypes = {
    customNode: CustomNode
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
      
      return {
        id: node.id.toString(),
        // 不再手动设置x和y坐标，将由dagre布局算法决定
        x: 0,
        y: 0,
        label: node.properties?.name || node.properties?.initialName || `Node ${node.id}`,
        subType: nodeType,
        taskId: node.taskId,
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
    console.log('Processed Nodes:', processedNodes, processedEdges)
    return { nodes: processedNodes, edges: processedEdges }
  }, [ ])
  
  // 将 ProcessedNode 和 ProcessedEdge 转换为 ReactFlow 格式
  const convertToReactFlowFormat = useCallback((processedNodes: ProcessedNode[], processedEdges: ProcessedEdge[]) => {
    // 转换节点
    const reactFlowNodes: Node[] = processedNodes.map(node => ({
      id: node.id,
      position: { x: node.x, y: node.y },
      data: {
        label: node.label,
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
    
    const reactFlowEdges: Edge[] = processedEdges.map(edge => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#1890ff',
          strokeWidth: 2,
          strokeDasharray: '5, 5',
        },
        labelStyle: { fill: '#1890ff', fontSize: 12 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#1890ff',
        },
      }))
    
    // 应用dagre布局
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      reactFlowNodes,
      reactFlowEdges
    )
    
    // Group nodes by subgraphId for subgraph containers
    const subgraphGroups = layoutedNodes.reduce((groups, node) => {
      const subgraphId = node.data.subgraphId;
      if (!groups[subgraphId]) {
        groups[subgraphId] = [];
      }
      groups[subgraphId].push(node);
      return groups;
    }, {});
    
    // Create subgraph container nodes
    const subgraphContainers: Node[] = Object.entries(subgraphGroups).map(([subgraphId, groupNodes]: [string, Node[]]) => {
      // Find boundaries of the group
      const nodePositions = groupNodes.map(node => ({
        left: node.position.x,
        right: node.position.x + Number(node.style?.width || 180),
        top: node.position.y,
        bottom: node.position.y + Number(node.style?.height || 100)
      }));
      
      const left = Math.min(...nodePositions.map(pos => pos.left)) - 20;
      const right = Math.max(...nodePositions.map(pos => pos.right)) + 20;
      const top = Math.min(...nodePositions.map(pos => pos.top)) - 40; // Extra space for the label
      const bottom = Math.max(...nodePositions.map(pos => pos.bottom)) + 20;
      
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
          zIndex: -1 // Place behind nodes
        },
        data: {
          label: `Subgraph ${subgraphId}`,
          subgraphId
        }
      };
    });
    
    return { 
      nodes: [...subgraphContainers, ...layoutedNodes], 
      edges: layoutedEdges 
    };
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
    
  }, [data, processGraphData, convertToReactFlowFormat, setNodes, setEdges])
  
  if (isLoading)
      return <Card loading />
  
  if (error)
      return <Text type='danger'>Failed to load data: {error.message}</Text>
  
  if (!data)
      return <Empty description='' />
  
  return <div className='streaming-graph-page'>
    <div style={{ height: 400, width: '100%', border: '1px solid #ddd', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
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
      >
        <Background color='#f8f8f8' gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {/* Node details drawer - contained within the flow container */}
      <Drawer
        title='Details'
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

// Task Subscription Worker Status Table component
function TaskSubWorkerStatTable({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR(
    ['getTaskSubWorkerStat', id],
    async () => {
      await defGetTaskSubWorkerStat()
      return getTaskSubWorkerStat(id)
    }
  )

  if (isLoading)
    return <Card loading />

  if (error)
    return <Text type='danger'>Failed to load subscription worker data: {error.message}</Text>

  if (!data || data.length === 0)
    return <Empty description='No subscription worker data available' />

  // Extract columns from data
  const columns = Object.keys(data[0]).map(key => ({
    title: key,
    dataIndex: key,
    key: key,
    render: (text: any) => {
      if (typeof text === 'object') return JSON.stringify(text)
      return <span>{text}</span>
    }
  }))

  return (
    <Card title="Task Subscription Worker Statistics" style={{ marginTop: 16 }}>
      <Table 
        dataSource={data} 
        columns={columns} 
        rowKey={(record, index) => index.toString()}
        pagination={{ 
          defaultPageSize: 5, 
          showSizeChanger: true,
          showQuickJumper: true
        }}
        scroll={{ x: 'max-content' }}
        size="small"
      />
    </Card>
  )
}

// Export main component with ReactFlowProvider
export function StreamingGraphOverview ({ id }: StreamingGraphOverviewProps) {
  return <ReactFlowProvider>
      <StreamingGraphVisualization id={id} />
      <TaskSubWorkerStatTable id={id} />
    </ReactFlowProvider>
}


