import { Descriptions, Typography, Empty, Card, Tabs, Table } from 'antd'
import useSWR from 'swr'

import { StatusTag, StatusType } from '@/components/tags/index.tsx'

import { getCheckpointConfig, getCheckpointJobInfo, getCheckpointSubjobInfo } from './apis.ts'

const { Text } = Typography

// Status mapping for tag colors
const status_map = {
  success: StatusType.SUCCESS,
  failed: StatusType.FAILED
}

interface StreamingGraphCheckpointsProps {
  id: string
}

export function StreamingGraphCheckpoints ({ id }: StreamingGraphCheckpointsProps) {
  // Get Job data
  const { data: jobData, error: jobError, isLoading: jobLoading } = useSWR(
    ['getCheckpointJobInfo', id],
    async () => getCheckpointJobInfo(id)
  )
  
  // Get SubJob data
  const { data: subjobData, error: subjobError, isLoading: subjobLoading } = useSWR(
    ['getCheckpointSubjobInfo', id],
    async () => getCheckpointSubjobInfo(id)
  )
  
  // Get configuration data
  const { data: configData, error: configError, isLoading: configLoading } = useSWR(
    ['getCheckpointConfig', id],
    async () => getCheckpointConfig(id)
  )
  
  // Safe timestamp comparison helper for sorting
  function compareTimestamps (a, b) {
    // Handle cases where timestamps might be null/undefined/invalid
    const timeA = a ? new Date(a).getTime() : 0
    const timeB = b ? new Date(b).getTime() : 0
    
    // If both are invalid (0), maintain original order
    if (timeA === 0 && timeB === 0)
        return 0
    // Sort nulls/invalid dates to the end
    if (timeA === 0)
        return 1
    if (timeB === 0)
        return -1
    // Normal comparison
    return timeA - timeB
  }
  
  // Job table columns
  const jobColumns = [
    { title: 'Checkpoint ID', dataIndex: 'checkpointId', key: 'checkpointId' },
    { title: 'Job ID', dataIndex: 'jobId', key: 'jobId' },
    { 
      title: 'Created Time', 
      dataIndex: 'createdTimeStamp', 
      key: 'createdTimeStamp',
      sorter: (a, b) => compareTimestamps(a.createdTimeStamp, b.createdTimeStamp),
      render: text => text ? new Date(text).toLocaleString() : '-'
    },
    { 
      title: 'Finished Time', 
      dataIndex: 'finishedTimeStamp', 
      key: 'finishedTimeStamp',
      sorter: (a, b) => compareTimestamps(a.finishedTimeStamp, b.finishedTimeStamp),
      render: text => text ? new Date(text).toLocaleString() : '-'
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: status => <StatusTag status={status_map[status]}>{status}</StatusTag>
    }
  ]
  
  // SubJob table columns
  const subjobColumns = [
    { title: 'Checkpoint ID', dataIndex: 'checkpointId', key: 'checkpointId' },
    { title: 'Job ID', dataIndex: 'jobId', key: 'jobId' },
    { title: 'Subjob ID', dataIndex: 'subjobId', key: 'subjobId' },
    { 
      title: 'First Barrier Arrival', 
      dataIndex: 'firstBarrierArrTs', 
      key: 'firstBarrierArrTs',
      sorter: (a, b) => compareTimestamps(a.firstBarrierArrTs, b.firstBarrierArrTs),
      render: text => text ? new Date(text).toLocaleString() : '-'
    },
    { 
      title: 'Barrier Alignment', 
      dataIndex: 'barrierAlignTs', 
      key: 'barrierAlignTs',
      sorter: (a, b) => compareTimestamps(a.barrierAlignTs, b.barrierAlignTs),
      render: text => text ? new Date(text).toLocaleString() : '-'
    },
    { 
      title: 'Barrier Forward', 
      dataIndex: 'barrierForwardTs', 
      key: 'barrierForwardTs',
      sorter: (a, b) => compareTimestamps(a.barrierForwardTs, b.barrierForwardTs),
      render: text => text ? new Date(text).toLocaleString() : '-'
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: status => <StatusTag status={status_map[status]}>{status}</StatusTag>
    },
    { title: 'Snapshot Channels ID', dataIndex: 'snapshotChannelsId', key: 'snapshotChannelsId' },
    { 
      title: 'Snapshot Size', 
      dataIndex: 'snapshotSize', 
      key: 'snapshotSize',
      sorter: (a, b) => (a.snapshotSize || 0) - (b.snapshotSize || 0),
      render: size => size ? `${size} bytes` : '-'
    }
  ]
  
  // Render Job tab content
  function renderJobTab () {
    if (jobLoading)
        return <Card loading />
    if (jobError)
        return <Text type='danger'>Failed to load Job info: {jobError.message}</Text>
    if (!jobData || !Array.isArray(jobData) || jobData.length === 0)
        return <Empty description='No Job data available' />
    
    return <Table 
      dataSource={jobData.map(item => ({ ...item, key: item.checkpointId }))} 
      columns={jobColumns} 
      rowKey='checkpointId'
      size='small'
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize: 10 }}
    />
  }
  
  // Render SubJob tab content
  function renderSubjobTab () {
    if (subjobLoading)
        return <Card loading />
    if (subjobError)
        return <Text type='danger'>Failed to load SubJob info: {subjobError.message}</Text>
    if (!subjobData || !Array.isArray(subjobData) || subjobData.length === 0)
        return <Empty description='No SubJob data available' />
    
    // Ensure each row has a unique key by combining checkpoint and subjob IDs
    const dataWithKeys = subjobData.map(item => ({
      ...item, 
      key: `${item.checkpointId}-${item.subjobId}`
    }))
    
    return <Table 
      dataSource={dataWithKeys} 
      columns={subjobColumns} 
      rowKey='key'
      size='small'
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize: 10 }}
    />
  }
  
  // Render Configuration tab content
  function renderConfigTab () {
    if (configLoading)
        return <Card loading />
    if (configError)
        return <Text type='danger'>Failed to load configuration: {configError.message}</Text>
    if (!configData || Object.keys(configData).length === 0)
        return <Empty description='No configuration data available' />
    
    return <Descriptions bordered size='small' column={1}>
      {Object.entries(configData).map(([key, value]) => <Descriptions.Item key={key} label={key}>
        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
      </Descriptions.Item>)}
    </Descriptions>
  }
  
  return <div className='streaming-config-container'>
    <Tabs defaultActiveKey='job'>
      <Tabs.TabPane tab='Job' key='job'>
        {renderJobTab()}
      </Tabs.TabPane>
      <Tabs.TabPane tab='SubJob' key='subjob'>
        {renderSubjobTab()}
      </Tabs.TabPane>
      <Tabs.TabPane tab='Configuration' key='config'>
        {renderConfigTab()}
      </Tabs.TabPane>
    </Tabs>
  </div>
}
