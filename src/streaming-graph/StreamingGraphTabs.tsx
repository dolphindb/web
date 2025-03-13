import { Tabs } from 'antd'
import { LineChartOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'

import { StreamingGraphOverview } from './StreamingGraphOverview.tsx'
import { StreamingGraphCheckpoints } from './StreamingGraphCheckpoints.tsx'
import { StreamingGraphConfiguration } from './StreamingGraphConfiguration.tsx'

const { TabPane } = Tabs

interface StreamingGraphTabsProps {
  id: string
}

export function StreamingGraphTabs ({ id }: StreamingGraphTabsProps) {
  return <Tabs defaultActiveKey='overview'>
      <TabPane 
        tab={<span><LineChartOutlined /> Overview</span>}
        key='overview'
      >
        <StreamingGraphOverview id={id} />
      </TabPane>
      
      <TabPane 
        tab={<span><CheckCircleOutlined /> Checkpoints</span>}
        key='checkpoints'
      >
        <StreamingGraphCheckpoints id={id} />
      </TabPane>
      
      <TabPane 
        tab={<span><SettingOutlined /> Configuration</span>}
        key='configuration'
      >
        <StreamingGraphConfiguration id={id} />
      </TabPane>
    </Tabs>
}
