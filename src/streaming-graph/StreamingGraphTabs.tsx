import { Tabs } from 'antd'
import { LineChartOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { StreamingGraphOverview } from './StreamingGraphOverview.tsx'
import { StreamingGraphCheckpoints } from './StreamingGraphCheckpoints.tsx'
import { StreamingGraphConfiguration } from './StreamingGraphConfiguration.tsx'


export function StreamingGraphTabs ({ id }: { id: string }) {
    return <Tabs 
        defaultActiveKey='overview'
        items={[
            {
                key: 'overview',
                icon: <LineChartOutlined />,
                label: t('概览'),
                children: <StreamingGraphOverview id={id} />
            },
            {
                key: 'checkpoints',
                icon: <CheckCircleOutlined />,
                label: t('检查点'),
                children: <StreamingGraphCheckpoints id={id} />
            },
            {
                key: 'configuration',
                icon: <SettingOutlined />,
                label: t('检查点'),
                children: <StreamingGraphConfiguration id={id} />
            },
        ]}
    />
}
