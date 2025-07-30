import { Tabs } from 'antd'
import { LineChartOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { Overview } from './Overview.tsx'
import { Checkpoints } from './Checkpoints.tsx'
import { Configuration } from './Configuration.tsx'


export function StreamingGraphTabs ({ id }: { id: string }) {
    return <Tabs 
        defaultActiveKey='overview'
        items={[
            {
                key: 'overview',
                icon: <LineChartOutlined />,
                label: t('概览'),
                children: <Overview id={id} />
            },
            {
                key: 'checkpoints',
                icon: <CheckCircleOutlined />,
                label: t('检查点'),
                children: <Checkpoints id={id} />
            },
            {
                key: 'configuration',
                icon: <SettingOutlined />,
                label: t('配置'),
                children: <Configuration id={id} />
            }
        ]}
    />
}
