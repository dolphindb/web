import { Model } from 'react-object-model'

import { check, map_keys } from 'xshell/utils.browser.js'

import { model } from '@model'
import { t } from '@i18n'


class StreamingGraph extends Model<StreamingGraph> {
    name: string
    
    metas: StreamGraphMeta[]
    
    publish_stats: any[]
    
    subscription_stats: SubscriptionStat[]
    
    info: StreamGraphInfo
    
    
    async get_metas () {
        const metas = (await model.ddb.invoke<any[]>('getStreamGraphMeta'))
            .map(({ checkpointConfig, tasks, ...others }) => ({
                ...others,
                checkpointConfig: JSON.parse(checkpointConfig),
                tasks: JSON.parse(tasks)
            }))
        
        console.log('图元数据:', metas)
        
        this.set({ metas })
        
        return metas
    }
    
    
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


// 流图状态
export type StreamGraphStatus = 'building' | 'running' | 'error' | 'failed' | 'destroying' | 'destroyed'

export type CheckpointJobStatus = 'running' | 'error' | 'failed' | 'success' | 'cancelled' | 'purged'

// 数据执行次数语义
export type Semantics = 'exactly-once' | 'at-least-once'

//  流图任务类型定义
export interface StreamGraphTask {
    id: number
    node: string
    status: StreamGraphStatus
    reason: string
}

// 流计算图元数据类型定义
export interface StreamGraphMeta {
    checkpointConfig: CheckpointConfig
    createTime: string
    fqn: string
    id: string
    owner: string
    reason: string
    semantics: Semantics
    status: StreamGraphStatus
    tasks: StreamGraphTask[]
}

export interface StreamGraphInfo {
    id: string
    fqn: string
    graph: StreamGraph
    meta: StreamGraphMeta
}

export interface CheckpointConfig {
    enable: boolean
    intervalMs: number
    timeoutMs: number
    alignedTimeoutMs: number
    minIntervalBetweenCkptMs: number
    consecutiveFailures: number
    maxConcurrentCheckpoints: number
    maxRetainedCheckpoints: number
}

// Node parallelism definition
export interface NodeParallelism {
    keyName: string
    count: number
}

// Node properties
export interface NodeProperties {
    type: string
    name?: string
    schema: string
    arguments?: string
    id?: string
    initialName?: string
    tableType?: string
    keyColumn?: string
    timeColumn?: string
    filterColumn?: string
    variableName?: string
    
    /** table 是对象, engine 是对象数组的第 0 项 */
    metrics?: any
}

// Graph node
export interface GraphNode {
    id: number
    subgraphId: number
    taskId: number
    parallelism: NodeParallelism
    properties: NodeProperties
    inEdges: number[]
    outEdges: number[]
}

// Graph edge
export interface GraphEdge {
    id: number
    inNodeId: number
    outNodeId: number
    partitionType: string
    filter: string
    handlers: any[]
    subscription: {
        actionName: string
        tableName: string
    }
}

// Complete graph structure
export interface StreamGraph {
    version: number
    nodes: GraphNode[]
    edges: GraphEdge[]
    config: object
}

export interface CheckpointJobInfo {
    checkpointId: string
    jobId: string
    createdTimeStamp: string
    finishedTimeStamp: string
    status: CheckpointJobStatus
    extra: any
}

export interface CheckpointSubjobInfo {
    checkpointId: string
    jobId: string
    subjobId: string
    firstBarrierArrTs: string
    barrierAlignTs: string
    barrierForwardTs: string
    status: 'success' | 'failed'
    snapshotChannelsId: string
    snapshotSize: number
    downstreamSubscribeOffsets: string
    snapshotMeta: {
        version: number
        totalSize: number
        maxChunkSize: number
        chunksNum: number
    }
    extra: any
}

