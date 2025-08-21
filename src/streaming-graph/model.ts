import { Model } from 'react-object-model'

import { to_space_case } from 'xshell/prototype.browser.js'
import { check, log, map_keys } from 'xshell/utils.browser.js'

import { model } from '@model'
import type { StreamGraphInfo } from './types.ts'
import { t } from '@i18n'


class StreamingGraph extends Model<StreamingGraph> {
    name: string
    
    publish_stats: any[]
    
    subscription_stats: SubscriptionStat[]
    
    info: StreamGraphInfo
    
    
    async get_subscription_stats (name = this.name) {
        const subscription_stats = await model.ddb.invoke<SubscriptionStat[]>(get_task_subworker_stat_fundef, [name])
        
        if (name === this.name)
            this.set({ subscription_stats })
        
        return subscription_stats
    }
    
    
    async get_publish_stats (name = this.name) {
        const publish_stats = (await model.ddb.invoke<any[]>(get_publish_stats_fundef, [name]))
            .map(obj => map_keys(obj))
        
        // console.log('流任务发布状态:', publish_stats)
        
        this.set({ publish_stats })
        
        return publish_stats
    }
    
    
    async get_stream_graph_info (name = this.name) {
        const { graph, meta, ...others } = (await model.ddb.invoke<any[]>('getStreamGraphInfo', [name]))
            [0]
        
        let graph_info: StreamGraphInfo = {
            ...others,
            graph: JSON.parse(graph),
            meta: JSON.parse(meta)
        }
        
        // 统一规整 metrics 为对象，处理 keys 为 space case
        graph_info.graph.nodes.forEach(({ properties }) => {
            let { metrics } = properties
            
            if (Array.isArray(metrics)) {
                check(metrics.length === 1, t('node.properties 中的 metrics 数组长度应该为 1'))
                properties.metrics = metrics[0]
            }
        })
        
        // console.log('图信息:', graph_info)
        
        this.set({ info: graph_info })
        
        return graph_info
    }
}

export let sgraph = new StreamingGraph()


export const get_task_subworker_stat_fundef = 
    'def get_task_subworker_stat (name) {\n' +
    '    stat = pnodeRun(def (): getStreamingStat().subWorkers, getDataNodes())\n' +
    '    sub = getOrcaStreamTaskSubscriptionMeta(name)\n' +
    '    return select * from sub, stat where strFind(stat.topic, sub.tableName + "/" + sub.actionName) != -1 order by taskId\n' +
    '}\n'

export const get_publish_stats_fundef = 
    'def get_publish_stats (name) {\n' +
    '    tableNames = select tableName from getOrcaStreamTaskSubscriptionMeta(name)\n' +
    '    conns =  getStreamingStat().pubConns\n' +
    '    \n' +
    '    return select * from tableNames, conns where strFind(conns.tables,  tableNames.tableName) != -1\n' +
    '}\n'


export interface SubscriptionStat {
    taskId: string
    tableName: string
    actionName: string
    workerId: string
    topic: string
    type: string
    queueDepthLimit: number | null
    queueDepth: number | null
    processedMsgCount: number | null
    lastMsgId: number | null
    failedMsgCount: number | null
    lastFailedMsgId: number | null
    lastFailedTimestamp: number | null
    lastErrMsg: string
    msgAsTable: boolean
    batchSize: number
    throttle: number
    hash: string
    filter: string
    persistOffset: number
    timeTrigger: string
    handlerNeedMsgId: string
    raftGroup: string
}
