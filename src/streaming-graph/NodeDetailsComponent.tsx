import { Tabs, Descriptions, Table, Typography, Empty, Card, Tooltip } from 'antd'
import useSWR from 'swr'
import { type Node } from 'reactflow'

import { t } from '@i18n'

import { defGetTaskSubWorkerStat, getSteamEngineStat, getTaskSubWorkerStat } from './apis.ts'
import { task_status_columns, TaskSubWorkerStatTable } from './StreamingGraphOverview.tsx'
import type { StreamGraphStatus } from './types.ts'

const { Text } = Typography

interface NodeDetailsComponentProps {
  selectedNode: Node | null
  id: string
  status: StreamGraphStatus
}

export function NodeDetailsComponent ({ selectedNode, id, status }: NodeDetailsComponentProps) {
  
  const isEngine = selectedNode && (selectedNode.data?.subType === 'REACTIVE_STATE_ENGINE' || selectedNode.data?.subType === 'TIME_SERIES_ENGINE')
  const isTable = selectedNode && selectedNode.data?.subType === ('TABLE')
  
  
  const { data, error, isLoading } = useSWR(
    selectedNode ? ['getTaskSubWorkerStat', id] : null,
    async () => {
      await defGetTaskSubWorkerStat()
      return getTaskSubWorkerStat(id)
    }
  )
  
  const { data: engineData, error: engineError, isLoading: engineLoading } = useSWR(
    isEngine ? ['getSteamEngineStat', selectedNode] : null,
    async () => getSteamEngineStat(selectedNode.data.label)
  )
  
  if (!selectedNode)
      return null
  
  const nodeData = selectedNode.data
  // Basic information tab content
  const renderBasicInfo = () => <Descriptions bordered column={2}  labelStyle={{ whiteSpace: 'nowrap' }}>
      <Descriptions.Item label='ID'>{nodeData.showId}</Descriptions.Item>
      <Descriptions.Item label={t('类型')}>{nodeData.subType}</Descriptions.Item>
      <Descriptions.Item label={t('名称')}>{nodeData.variableName}</Descriptions.Item>
      <Descriptions.Item label={t('初始名称')}>{nodeData.initialName}</Descriptions.Item>
      <Descriptions.Item label={t('任务ID')}>{nodeData.taskId}</Descriptions.Item>
      <Descriptions.Item label={t('节点')} span={3}>{nodeData.logicalNode}</Descriptions.Item>
      <Descriptions.Item label={t('Schema')} span={3}>
        {renderSchema(nodeData.schema)}
      </Descriptions.Item>
    </Descriptions>
  
  // Metrics tab content
  function renderMetrics () {
    if (isLoading)
        return <Card loading />
    
    if (error)
        return <Text type='danger'>Failed to load metrics data: {error.message}</Text>
    
    if (!data || data.length === 0)
        return <Empty description='No metrics data available' />
    // Filter data related to the current node's subGraph
    const filteredData = data.filter(item => 
      item.taskId !== undefined && 
      Number(item.taskId) === Number(nodeData.taskId)
    )
    
    if (filteredData.length === 0)
        return <Empty description={`No metrics data found for worker ${nodeData.taskId}`} />
        
    
    
    // Extract columns from the data
    
    return <Table 
        dataSource={filteredData} 
        columns={task_status_columns} 
        rowKey={(record, index) => index.toString()}
        pagination={false}
        size='small'
        scroll={{ x: 'max-content' }}
      />
  }
  
  function renderEngineMetrics () {
    if (engineLoading)
        return <Card loading />
    
    if (engineError)
        return <Text type='danger'>Failed to load engine metrics data: {engineError.message}</Text>
        
    if (!engineData)
        return <Empty description='No engine metrics data available' />
    
    // 从数据中提取列
    const columns = engineData.columns.map(key => ({
        title: key,
        dataIndex: key,
        key: key,
        render: (text: any) => {
            // 如果值是对象，转换为字符串显示
            if (typeof text === 'object')
                text = JSON.stringify(text)
            
            // 添加 Tooltip 显示完整内容
            return <Tooltip placement='topLeft' title={text}>
                <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap', 
                    display: 'block',
                    maxWidth: 150  // 限制最大宽度
                }}>
                    {text}
                </span>
            </Tooltip>
        }
    }))
    
    
    return <Table 
        dataSource={engineData.data}
        columns={columns}
        pagination={false}  // 单行数据不需要分页
        size='small'
        scroll={{ x: 'max-content' }}  // 允许横向滚动
        bordered
    />
  }
  
  return <Tabs defaultActiveKey='1'>
      <Tabs.TabPane tab={t('节点详情')} key='1'>
        {renderBasicInfo()}
      </Tabs.TabPane>
      {isTable && <Tabs.TabPane tab={t('子图指标')} key='2'>
        {renderMetrics()}
      </Tabs.TabPane>}
      {isEngine && status === 'running' && <Tabs.TabPane tab={t('引擎指标')} key='3'>
        {renderEngineMetrics()}
      </Tabs.TabPane>}
    </Tabs>
}

function renderSchema (schema: any) {
  if (!schema || typeof schema !== 'object' || !schema.names || !schema.types)
      return null
  
  
  function getTypeColor (type: string) {
    switch (type) {
      case 'DOUBLE':
        return '#52c41a'
      case 'SYMBOL':
        return '#1890ff'
      case 'TIMESTAMP':
        return '#faad14'
      default:
        return '#666'
    }
  }
  
  return <Descriptions 
      size='small' 
      column={1}
      bordered
      style={{ 
        maxHeight: '160px', 
        overflow: 'auto' 
      }}
    >
      {schema.names.map((name: string, index: number) => <Descriptions.Item 
          key={name} 
          label={name}
        >
          <span style={{ color: getTypeColor(schema.types[index]) }}>
            {schema.types[index]}
          </span>
        </Descriptions.Item>)}
    </Descriptions>
} 
