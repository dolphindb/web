import { Tabs, Descriptions, Table, Typography, Empty, Card, Tooltip } from 'antd'
import useSWR from 'swr'
import { type Node } from 'reactflow'

import { defGetTaskSubWorkerStat, getTaskSubWorkerStat } from './apis.ts'

const { Text } = Typography
const { TabPane } = Tabs

interface NodeDetailsComponentProps {
  selectedNode: Node | null
  id: string // Stream Graph ID
}

export function NodeDetailsComponent ({ selectedNode, id }: NodeDetailsComponentProps) {
  const { data, error, isLoading } = useSWR(
    selectedNode ? ['getTaskSubWorkerStat', id] : null,
    async () => {
      await defGetTaskSubWorkerStat()
      return getTaskSubWorkerStat(id)
    }
  )
  
  if (!selectedNode)
      return null
  
  const nodeData = selectedNode.data
  
  // Basic information tab content
  const renderBasicInfo = () => <Descriptions bordered column={2}>
      <Descriptions.Item label='ID'>{selectedNode.id}</Descriptions.Item>
      <Descriptions.Item label='Type'>{nodeData.subType}</Descriptions.Item>
      <Descriptions.Item label='Name'>{nodeData.label}</Descriptions.Item>
      <Descriptions.Item label='Task ID'>{nodeData.taskId}</Descriptions.Item>
      <Descriptions.Item label='Schema' span={3}>{nodeData.schema}</Descriptions.Item>
    </Descriptions>
  
  // Metrics tab content
  function renderMetrics () {
    if (isLoading)
        return <Card loading />
    
    if (error)
        return <Text type='danger'>Failed to load metrics data: {error.message}</Text>
    
    if (!data || data.length === 0)
        return <Empty description='No metrics data available' />
    console.log('data', data, nodeData)
    // Filter data related to the current node's subGraph
    const filteredData = data.filter(item => 
      item.taskId !== undefined && 
      Number(item.taskId) === Number(nodeData.taskId)
    )
    
    if (filteredData.length === 0)
        return <Empty description={`No metrics data found for worker ${nodeData.taskId}`} />
    
    // Extract columns from the data
    const columns = Object.keys(filteredData[0]).map(key => ({
      title: key,
      dataIndex: key,
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
    
    return <Table 
        dataSource={filteredData} 
        columns={columns} 
        rowKey={(record, index) => index.toString()}
        pagination={false}
        size='small'
        scroll={{ x: 'max-content' }}
      />
  }
  
  return <Tabs defaultActiveKey='1'>
      <Tabs.TabPane tab='Node Details' key='1'>
        {renderBasicInfo()}
      </Tabs.TabPane>
      <Tabs.TabPane tab='Subgraph Metrics' key='2'>
        {renderMetrics()}
      </Tabs.TabPane>
    </Tabs>
} 
