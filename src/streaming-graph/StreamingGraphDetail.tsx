import { useParams, Link } from 'react-router'
import { Button, Typography, Divider } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { StreamingGraphDescription } from './StreamingGraphDescription.tsx'
import { StreamingGraphTabs } from './StreamingGraphTabs.tsx'

export function StreamingGraphDetail () {
  const { id } = useParams()
  
  if (!id)
      return <Typography.Text type='danger'>Invalid streaming graph ID</Typography.Text>
  
  
  return <div>
      <div style={{ marginBottom: 16 }}>
        <Link to='/streaming-graph'>
          <Button icon={<ArrowLeftOutlined />}>Back to List</Button>
        </Link>
      </div>
      
      <StreamingGraphDescription id={id} />
      
      <Divider />
      
      <StreamingGraphTabs id={id} />
    </div>
}
