import { useEffect } from 'react'
import { Descriptions, Button, Typography, Space } from 'antd'
import useSWR from 'swr'
import { ReloadOutlined, StopOutlined } from '@ant-design/icons'

import { StatusTag, StatusType } from '@/components/tags/index.tsx'

import { getStreamGraphMeta } from './apis.ts'
import { type StreamGraphMeta } from './types.ts'

// Status mapping
const status_map = {
  building: StatusType.PARTIAL_SUCCESS,
  running: StatusType.SUCCESS,
  destroyed: StatusType.FAILED,
  error: StatusType.FAILED,
  failed: StatusType.FAILED,
  destroying: StatusType.PARTIAL_SUCCESS
}

interface StreamingGraphDescriptionProps {
  id: string
}

export function StreamingGraphDescription ({ id }: StreamingGraphDescriptionProps) {
  // Use useSWR to fetch streaming graph details
  const { data, error, isLoading, mutate } = useSWR(
    ['streamGraphs', id], 
    async () => getStreamGraphMeta(id),
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true
    }
  )
  
  // Handle refresh
  function handleRefresh () {
    mutate()
  }
  
  // Calculate duration
  function getDuration (createTime: string) {
    if (!createTime)
        return '-'
    
    const start = new Date(createTime).getTime()
    const end = Date.now()
    const durationMs = end - start
    
    // Format duration
    const seconds = Math.floor(durationMs / 1000) % 60
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Get status display text
  function getStatusText (status: string) {
    const statuses = {
      building: 'Building',
      running: 'Running',
      error: 'Error',
      failed: 'Failed',
      destroying: 'Destroying',
      destroyed: 'Destroyed'
    }
    return statuses[status] || status
  }
  
  // Render action button
  function renderActions (graph: StreamGraphMeta) {
    const isActive = graph.status === 'running' || graph.status === 'building'
    
    return <Button 
        icon={<StopOutlined />} 
        type='primary' 
        danger
        disabled={!isActive}
        size='small'
        onClick={() => {
          // Implement cancel job logic here
          console.log('Cancel job:', graph.id)
        }}
      >
        Cancel Job
      </Button>
  }
  
  if (isLoading)
      return <Descriptions title='Streaming Graph Details' bordered size='small' />
  
  
  if (error || !data)
      return <Typography.Text type='danger'>Loading failed: {error?.message || 'Unknown error'}</Typography.Text>
  
  return <Descriptions 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span>Streaming Graph Details</span>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} size='small'>Refresh</Button>
        </div>
      }
      bordered
      column={3}
      size='small'
      className='compact-descriptions'
      style={{ 
        marginBottom: '16px' 
      }}
    >
      <Descriptions.Item label='Job ID'>{data.id}</Descriptions.Item>
      <Descriptions.Item label='Job State'>
        <StatusTag status={status_map[data.status]}>
          {getStatusText(data.status)}
        </StatusTag>
      </Descriptions.Item>
      <Descriptions.Item label='Actions'>
        {renderActions(data)}
      </Descriptions.Item>
      <Descriptions.Item label='Create Time'>
        {data.createTime ? new Date(data.createTime).toLocaleString() : '-'}
      </Descriptions.Item>
      <Descriptions.Item label='Duration'>
        {getDuration(data.createTime)}
      </Descriptions.Item>
      <Descriptions.Item label='Semantics'>
        {data.semantics}
      </Descriptions.Item>
    </Descriptions>
}
