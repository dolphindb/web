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
    status:  'success' | 'failed'
    snapshotChannelsId: string
    snapshotSize: number
    extra: any
  }
