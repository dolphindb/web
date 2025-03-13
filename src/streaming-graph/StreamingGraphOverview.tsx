import { Table, Card, Typography, Empty, Drawer } from 'antd'
import useSWR from 'swr'
import { useCallback, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  Background, 
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  EdgeTypes,
  MarkerType,
  Position,
  type NodeProps,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  ConnectionLineType
} from 'reactflow'
import 'reactflow/dist/style.css'

import './streaming-graph.sass'

import { getStreamGraphInfo, getStreamGraphMeta } from './apis.ts'
import { type StreamGraph, type GraphNode, type GraphEdge } from './types.ts'

const { Title, Text } = Typography

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
      <div className='node-content'>
        <div className='node-header'>{data.subType}</div>
        <div className='node-label' title={data.label}>{data.label}</div>
        <div className='node-task'>任务ID: {data.taskId}</div>
        <div className='node-schema' title={data.schema}>
          {data.schema && data.schema.length > 15 
            ? `${data.schema.substring(0, 15)}...` 
            : data.schema}
        </div>
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
  
  console.log('data', data)
  
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
        x: (node.id % 3) * 300 + 50,  // 使用节点自带的x坐标，如果没有则计算一个
        y: (node.id / 3) * 200 + 50,  // 使用节点自带的y坐标
        label: node.properties?.name || node.properties?.initialName || `Node ${node.id}`,
        subType: nodeType,
        taskId: node.taskId,
        schema: node.properties?.schema || '',
        width: 180,
        height: 100
      }
    })
    
    // 处理边 - 创建 ProcessedEdge 格式
    const processedEdges: ProcessedEdge[] = graphData.edges.map((edge: GraphEdge) => ({
      id: edge.id.toString(),
      sourceId: edge.inNodeId.toString(),
      targetId: edge.outNodeId.toString()
    }))
    
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
        height: node.height
      },
      type: 'customNode',
      style: { width: node.width, height: node.height }
    }))
    
    const reactFlowEdges: Edge[] = processedEdges.map(edge => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'step', // 使用step类型获得直角连接线
        style: { 
          stroke: '#555', 
          strokeWidth: 2,
        },
        labelStyle: { fill: '#888', fontSize: 12 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#555',
        },
      }))
    
    return { nodes: reactFlowNodes, edges: reactFlowEdges }
  }, [ ])
  
  // 数据加载后更新图
  useEffect(() => {
    if (data?.graph)
        try {
        const graphData = typeof data.graph === 'string' ? JSON.parse(data.graph) : data.graph
        console.log('Raw graph data:', graphData)
        
        const { nodes: processedNodes, edges: processedEdges } = processGraphData(graphData)
        console.log('Processed nodes:', processedNodes)
        console.log('Processed edges:', processedEdges)
        
        const { nodes: reactFlowNodes, edges: reactFlowEdges } = convertToReactFlowFormat(processedNodes, processedEdges)
        
        setNodes(reactFlowNodes)
        setEdges(reactFlowEdges)
      } catch (e) {
        console.error('Failed to parse graph data:', e)
      }
    
  }, [data, processGraphData, convertToReactFlowFormat, setNodes, setEdges])
  
  // 显示节点详情的渲染函数
  function renderNodeDetails () {
    if (!selectedNode)
        return null
    
    const nodeData = selectedNode.data
    return <div>
        <Title level={5}>节点详情</Title>
        <div className='node-detail-item'>
          <strong>ID:</strong> {selectedNode.id}
        </div>
        <div className='node-detail-item'>
          <strong>类型:</strong> {nodeData.subType}
        </div>
        <div className='node-detail-item'>
          <strong>名称:</strong> {nodeData.label}
        </div>
        <div className='node-detail-item'>
          <strong>任务ID:</strong> {nodeData.taskId}
        </div>
        <div className='node-detail-item'>
          <strong>模式:</strong> {nodeData.schema}
        </div>
      </div>
  }
  
  if (isLoading)
      return <Card loading />
  
  if (error)
      return <Text type='danger'>加载数据失败: {error.message}</Text>
  
  if (!data)
      return <Empty description='没有可用数据' />
  
  return <div className='streaming-graph-page'>
      <div style={{ height: 600, width: '100%', border: '1px solid #ddd', borderRadius: '4px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition='bottom-right'
          connectionLineType={ConnectionLineType.Step}
        >
          <Background color='#f8f8f8' gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      
      {/* 节点详情抽屉 */}
      <Drawer
        title='节点详情'
        placement='right'
        width={400}
        onClose={() => { setDrawerVisible(false) }}
        open={drawerVisible}
      >
        {renderNodeDetails()}
      </Drawer>
    </div>
}

// 导出主组件，包装在 ReactFlowProvider 中
export function StreamingGraphOverview ({ id }: StreamingGraphOverviewProps) {
  return <ReactFlowProvider>
      <StreamingGraphVisualization id={id} />
    </ReactFlowProvider>
}
