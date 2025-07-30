import { useParams } from 'react-router'
import { Typography, Spin } from 'antd'

import { t } from '@i18n'

import useSWR from 'swr'

import { Description } from './Description.tsx'
import { StreamingGraphTabs } from './Tabs.tsx'
import { get_stream_graph_meta_list } from './apis.ts'
import type { StreamGraphMeta } from './types.ts'

export function Detail () {
    const { id } = useParams()
    
    const { data: streamGraphs, isLoading } = useSWR<StreamGraphMeta[]>(
        'streamGraphs', 
        get_stream_graph_meta_list,
        {
            refreshInterval: 1000 * 30,
            revalidateOnFocus: true
        })
    
    if (isLoading)
        return <Spin />
    
    const name = streamGraphs?.find(graph => graph.id === id)?.fqn
    
    if (!name)
        return <Typography.Text type='danger'>{t('无效的流图 ID')}</Typography.Text>
    
    return <div className='themed'>
        <Description id={name} />
        
        <StreamingGraphTabs id={name} />
    </div>
}
