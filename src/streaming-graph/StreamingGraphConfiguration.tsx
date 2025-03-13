import { Descriptions, Typography, Empty, Card } from 'antd'
import useSWR from 'swr'

import { getStreamGraphMeta } from './apis.ts'

const { Text } = Typography

interface StreamingGraphConfigurationProps {
  id: string
}

export function StreamingGraphConfiguration ({ id }: StreamingGraphConfigurationProps) {
  // Use SWR to fetch the data
  const { data, error, isLoading } = useSWR(
    ['streamGraphs', id], 
    async () => getStreamGraphMeta(id)
  )
  
  if (isLoading)
      return <Card loading />
  
  if (error)
      return <Text type='danger'>Failed to load configuration data: {error.message}</Text>
  
  
  if (!data)
      return <Empty description='No data available' />
  
  return <div>
      <Descriptions bordered size='small' column={2}>
        <Descriptions.Item label='ID'>{data.id}</Descriptions.Item>
        <Descriptions.Item label='FQN'>{data.fqn}</Descriptions.Item>
        <Descriptions.Item label='Owner'>{data.owner}</Descriptions.Item>
        <Descriptions.Item label='Status'>{data.status}</Descriptions.Item>
        <Descriptions.Item label='Create Time'>
          {data.createTime ? new Date(data.createTime).toLocaleString() : '-'}
        </Descriptions.Item>
        <Descriptions.Item label='Semantics'>{data.semantics}</Descriptions.Item>
        {data.reason && (
          <Descriptions.Item label='Reason' span={2}>
            {data.reason}
          </Descriptions.Item>
        )}
      </Descriptions>
    </div>
}
