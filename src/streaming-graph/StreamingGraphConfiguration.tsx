import { Descriptions, Typography, Empty, Card } from 'antd'
import useSWR from 'swr'

import { getCheckpointConfig } from './apis.ts'

const { Text } = Typography

interface StreamingGraphConfigurationProps {
  id: string
}

export function StreamingGraphConfiguration ({ id }: StreamingGraphConfigurationProps) {
  // 只使用 SWR 获取检查点配置
  const { data, error, isLoading } = useSWR(
    ['checkpointConfig', id],
    async () => getCheckpointConfig(id)
  )
  
  if (isLoading)
      return <Card loading />
  
  if (error)
      return <Text type='danger'>Failed to load configuration data: {error.message}</Text>
  
  if (!data || Object.keys(data).length === 0)
      return <Empty description='No available configuration data' />
  
  return <div className='streaming-config-container'>
      <Descriptions bordered size='small' column={1} title='Streaming Graph Configuration'>
        {Object.entries(data).map(([key, value]) => <Descriptions.Item 
            key={key} 
            label={key}
            labelStyle={{ fontWeight: 'bold' }}
          >
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </Descriptions.Item>)}
      </Descriptions>
    </div>
}
