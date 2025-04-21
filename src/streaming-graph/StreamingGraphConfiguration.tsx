import { Descriptions, Typography, Empty, Card } from 'antd'
import useSWR from 'swr'

import { t } from '@i18n'

import { getStreamGraphInfo } from './apis.ts'

const { Text } = Typography

interface StreamingGraphConfigurationProps {
  id: string
}

export function StreamingGraphConfiguration ({ id }: StreamingGraphConfigurationProps) {
  // 只使用 SWR 获取检查点配置
  const { data, error, isLoading } = useSWR(
    ['getStreamGraphInfo', id],
    async () => getStreamGraphInfo(id)
  )
  
  if (isLoading)
      return <Card loading />
  
  if (error)
      return <Text type='danger'>{t('加载配置数据失败：')} {error.message}</Text>
  
  if (!data || Object.keys(data).length === 0)
      return <Empty description={t('没有配置数据')} />
  
  return <div className='streaming-config-container'>
      <Descriptions bordered size='small' column={1}>
        {Object.entries(data.graph.config).map(([key, value]) => <Descriptions.Item 
            key={key} 
            label={key}
          >
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </Descriptions.Item>)}
      </Descriptions>
    </div>
}
