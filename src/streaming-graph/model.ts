import { Model } from 'react-object-model'

import { check, map_keys } from 'xshell/utils.browser.js'
import { DdbFunction, DdbFunctionType, type DdbTableData } from 'dolphindb/browser.js'

import { model } from '@model'
import { t } from '@i18n'


class StreamingGraph extends Model<StreamingGraph> {
    name: string
    
    graphs: StreamGraphMeta[]
    
    graph: StreamGraphInfo
    
    graph_loading = false
    
    engine_stats: DdbTableData
    
    publish_stats: any[]
    
    subscription_stats: SubscriptionStat[]
    
    checkpoint_config: CheckpointConfig
    
    jobs: CheckpointJob[]
    
    subjobs: CheckpointSubJob[]
    
    
    async get_graphs () {
        const graphs = (await model.ddb.invoke<any[]>('getStreamGraphMeta'))
            .map(({ checkpointConfig, tasks, ...others }) => ({
                ...others,
                checkpointConfig: JSON.parse(checkpointConfig),
                tasks: JSON.parse(tasks)
            }))
        
        console.log('流图列表:', graphs)
        
        this.set({ graphs })
        
        return graphs
    }
    
    
    async get_graph (name = this.name) {
        this.set({ graph_loading: true })
        
        const info = (await model.ddb.invoke<any[]>('getStreamGraphInfo', [name]))
            [0]
        
        if (!info) {
            this.set({ graph_loading: false })
            return
        }
        
        let graph: StreamGraphInfo = {
            ...info,
            graph: JSON.parse(info.graph),
            meta: JSON.parse(info.meta)
        }
        
        // 统一规整 metrics 为对象，处理 keys 为 space case
        graph.graph.nodes.forEach(({ properties }) => {
            let { metrics } = properties
            
            if (Array.isArray(metrics)) {
                check(metrics.length === 1, t('node.properties 中的 metrics 数组长度应该为 1'))
                properties.metrics = metrics[0]
            }
        })
        
        console.log('流图信息:', graph)
        
        this.set({ graph, graph_loading: false })
        
        return graph
    }
    
    
    async get_engine_stats (engine_name: string) {
        const engine_stats = await model.ddb.invoke<DdbTableData>(
            'useOrcaStreamEngine',
            [
                engine_name,
                new DdbFunction('getStreamEngineStateTable', DdbFunctionType.SystemFunc)
            ],
            { table: 'full' })
        
        this.set({ engine_stats })
        
        console.log('引擎状态:', engine_stats)
        
        return engine_stats
    }
    
    
    async get_subscription_stats (name = this.name) {
        const subscription_stats = await model.ddb.invoke<SubscriptionStat[]>(get_subscription_stats_funcdef, [name])
        
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
    
    
    async get_checkpoint_config (name = this.name) {
        const checkpoint_config = await model.ddb.invoke<CheckpointConfig>('getOrcaCheckpointConfig', [name])
        
        console.log('检查点配置:', checkpoint_config)
        
        this.set({ checkpoint_config })
        
        return checkpoint_config
    }
    
    
    async get_checkpoint_jobs (name = this.name) {
        const jobs = await model.ddb.invoke<CheckpointJob[]>('getOrcaCheckpointJobInfo', [name])
        
        console.log('检查点作业:', jobs)
        
        this.set({ jobs })
        
        return jobs
    }
    
    
    async get_checkpoint_subjobs (name = this.name) {
        const subjobs = await model.ddb.invoke<CheckpointSubJob[]>('getOrcaCheckpointSubjobInfo', [name])
        
        console.log('检查点子任务:', subjobs)
        
        this.set({ subjobs })
        
        return subjobs
    }
}

export let sgraph = new StreamingGraph()


export const get_subscription_stats_funcdef = 
    'def get_subscription_stats (name) {\n' +
    '    stat = pnodeRun(def (): getStreamingStat().subWorkers, getDataNodes())\n' +
    '    sub = getOrcaStreamTaskSubscriptionMeta(name)\n' +
    '    return select * from sub, stat where strFind(stat.topic, sub.tableName + "/" + sub.actionName) != -1 order by taskId\n' +
    '}\n'

export const get_publish_stats_fundef = 
    'def get_publish_stats (name) {\n' +
    '    tableNames = select distinct tableName from getOrcaStreamTaskSubscriptionMeta(name)\n' +
    '    conns = pnodeRun(def (): getStreamingStat().pubConns, getDataNodes())\n' +
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


export const graph_statuses: Record<StreamGraphStatus, string> = {
    building: t('构建中'),
    running: t('运行中'),
    error: t('错误'),
    failed: t('失败'),
    destroying: t('销毁中'),
    destroyed: t('已销毁')
}

// 流图状态
export type StreamGraphStatus = 'building' | 'running' | 'error' | 'failed' | 'destroying' | 'destroyed'

export type CheckpointJobStatus = 'running' | 'error' | 'failed' | 'success' | 'cancelled' | 'purged'

// 数据执行次数语义
export type Semantics = 'exactly-once' | 'at-least-once'

export interface StreamGraphTask {
    id: number
    node: string
    status: StreamGraphStatus
    reason: string
}

export interface StreamGraphMeta {
    fqn: string
    id: string
    checkpointConfig: CheckpointConfig
    createTime: string
    owner: string
    reason: string
    semantics: Semantics
    status: StreamGraphStatus
    tasks: StreamGraphTask[]
}

export interface StreamGraphInfo {
    fqn: string
    id: string
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

export interface NodeParallelism {
    keyName: string
    count: number
}

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
    
    metrics?: Record<string, any>
}

export interface GraphNode {
    id: number
    subgraphId: number
    taskId: number
    parallelism: NodeParallelism
    properties: NodeProperties
    inEdges: number[]
    outEdges: number[]
}

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

export interface StreamGraph {
    version: number
    nodes: GraphNode[]
    edges: GraphEdge[]
    config: object
}

export interface CheckpointJob {
    checkpointId: string
    jobId: string
    createdTimeStamp: string
    finishedTimeStamp: string
    status: CheckpointJobStatus
    extra: any
}

export interface CheckpointSubJob {
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

