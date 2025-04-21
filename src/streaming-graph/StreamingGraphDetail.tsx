import { useParams, useNavigate } from 'react-router'
import { Button, Typography, Divider } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { StreamingGraphDescription } from './StreamingGraphDescription.tsx'
import { StreamingGraphTabs } from './StreamingGraphTabs.tsx'
export function StreamingGraphDetail () {
  const { id } = useParams()
  const navigate = useNavigate()
  
  if (!id)
      return <Typography.Text type='danger'>{t('无效的流图 ID')}</Typography.Text>
  
  
  return <div>
      <div style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={async () => navigate(-1)}>{t('返回')}</Button>
      </div>
      
      <StreamingGraphDescription id={id} />
      
      <Divider />
      
      <StreamingGraphTabs id={id} />
    </div>
}
