import { useParams, useNavigate } from 'react-router'
import { Button, Typography, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import useSWR from 'swr'

import { StreamingGraphDescription } from './StreamingGraphDescription.tsx'
import { StreamingGraphTabs } from './StreamingGraphTabs.tsx'
import { get_stream_graph_meta_list } from './apis.ts'
import type { StreamGraphMeta } from './types.ts'

export function StreamingGraphDetail () {
    const { id } = useParams()
    const navigate = useNavigate()
    
    // 使用 useSWR 获取流计算图数据
    const { data: streamGraphs, isLoading } = useSWR<StreamGraphMeta[]>('streamGraphs', get_stream_graph_meta_list, {
        refreshInterval: 30000, // 每30秒刷新一次
        revalidateOnFocus: true
    })
    
    const name = streamGraphs?.find(graph => graph.id === id)?.fqn
    
    if (isLoading)
        return <Spin />
    
    if (!name)
        return <Typography.Text type='danger'>{t('无效的流图 ID')}</Typography.Text>
    
    return <div className='themed'>
            <div style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={async () => navigate(-1)}>
                    {t('返回')}
                </Button>
            </div>
            
            <StreamingGraphDescription id={name} />
            
            <StreamingGraphTabs id={name} />
        </div>
}
