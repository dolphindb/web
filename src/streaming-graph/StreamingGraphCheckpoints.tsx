import { Card, Descriptions, Typography, Empty } from 'antd'
import useSWR from 'swr'

import { getStreamGraphMeta } from './apis.ts'

const { Title, Text } = Typography

interface StreamingGraphCheckpointsProps {
  id: string
}

export function StreamingGraphCheckpoints ({ id }: StreamingGraphCheckpointsProps) {
  // Use SWR to fetch the data
  const { data, error, isLoading } = useSWR(
    ['streamGraphs', id], 
    async () => getStreamGraphMeta(id)
  )
  
  if (isLoading)
      return <Card loading />
  
  if (error)
      return <Text type='danger'>Failed to load checkpoint data: {error.message}</Text>
  
  
  if (!data)
      return <Empty description='No data available' />
  
  return <div>
      <Title level={5}>Checkpoint Configuration</Title>
      <Card>
        {Object.keys(data.checkpointConfig).length > 0 ? (
          <Descriptions bordered size='small' column={2}>
            {Object.entries(data.checkpointConfig).map(([key, value]) => <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Descriptions.Item>)}
          </Descriptions>
        ) : (
          <Empty description='No checkpoint configuration found' />
        )}
      </Card>
    </div>
}
