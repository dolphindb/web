import { useParams } from 'react-router'
import { Typography, Spin, Tabs } from 'antd'
import { LineChartOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'

import useSWR from 'swr'

import { t } from '@i18n'

import { Description } from './Description.tsx'
import { Overview } from './Overview.tsx'
import { Checkpoints } from './Checkpoints.tsx'
import { Configuration } from './Configuration.tsx'
import { get_stream_graph_meta_list } from './apis.ts'
import type { StreamGraphMeta } from './types.ts'


export function Detail () {
    const { id: url_id } = useParams()
    
    const { data: streamGraphs, isLoading } = useSWR<StreamGraphMeta[]>(
        'streamGraphs', 
        get_stream_graph_meta_list,
        {
            refreshInterval: 1000 * 30,
            revalidateOnFocus: true
        })
    
    if (isLoading)
        return <Spin />
    
    const id = streamGraphs?.find(graph => graph.id === url_id)?.fqn
    
    if (!id)
        return <Typography.Text type='danger'>{t('无效的流图 ID')}</Typography.Text>
    
    return <div className='themed'>
        <Description id={id} />
        
        <Tabs 
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
    </div>
}
