import { Model } from 'react-object-model'

import { to_space_case } from 'xshell/prototype.browser.js'
import { check, log, map_keys } from 'xshell/utils.browser.js'

import { model } from '@model'
import type { StreamGraphInfo } from './types.ts'
import { t } from '@i18n'


class StreamingGraph extends Model<StreamingGraph> {
    publish_stats: any[]
    
    graph_info: StreamGraphInfo
    
    
    async get_publish_stats (fullname: string) {
        const publish_stats = log('流任务发布状态',
            (await model.ddb.invoke<any[]>(get_publish_stats_fundef, [fullname]))
                .map(obj => map_keys(obj)))
        
        this.set({ publish_stats })
        
        return publish_stats
    }
    
    
    async get_stream_graph_info (fullname: string) {
        const { graph, meta, ...others } = (await model.ddb.invoke<any[]>('getStreamGraphInfo', [fullname]))
            [0]
        
        let graph_info: StreamGraphInfo = log('图信息:', {
            ...others,
            graph: JSON.parse(graph),
            meta: JSON.parse(meta)
        })
        
        // 统一规整 metrics 为对象，处理 keys 为 space case
        graph_info.graph.nodes.forEach(({ properties }) => {
            let { metrics } = properties
            
            if (!metrics)
                return
            
            if (Array.isArray(metrics)) {
                check(metrics.length === 1, t('node.properties 中的 metrics 数组长度应该为 1'))
                metrics = metrics[0]
            }
            
            properties.metrics = map_keys(metrics, to_space_case)
        })
        
        this.set({ graph_info })
        
        return graph_info
    }
}

export let sgraph = new StreamingGraph()


export const get_publish_stats_fundef = 
    'def get_publish_stats (name) {\n' +
    '    tableNames = select tableName from getOrcaStreamTaskSubscriptionMeta(name)\n' +
    '    conns =  getStreamingStat().pubConns\n' +
    '    \n' +
    '    return select * from tableNames, conns where strFind(conns.tables,  tableNames.tableName) != -1\n' +
    '}\n'

