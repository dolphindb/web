export type NodeType  = 'data' | 'agent' | 'controller' | 'computing'

export const CONFIG_CLASSIFICATION = {
    thread: new Set(['localExecutors', 'maxBatchJobWorker', 'maxDynamicWorker', 'webWorkerNum', 'workerNum']),
    memory: new Set(['chunkCacheEngineMemSize', 'maxMemSize', 'memoryReleaseRate', 'regularArrayMemoryLimit', 'warningMemSize']),
    disk: new Set(['batchJobDir', 'chunkMetaDir', 'dataSync', 'jobLogFile', 'logFile', 'logLevel', 'maxLogSize', 'redoLogDir', 'redoLogPurgeInterval', 'redoLogPurgeLimit', 'volumes', 'diskIOConcurrencyLevel']),
    network: new Set(['enableHTTPS', 'localSite', 'maxConnections', 'maxConnectionPerSite', 'tcpNoDelay']),
    streaming_pub: new Set(['maxMsgNumPerBlock', 'maxPersistenceQueueDepth', 'maxPubQueueDepthPerSite', 'maxPubConnections', 'persistenceDir', 'persistenceWorkerNum']),
    streaming_sub: new Set(['maxSubConnections', 'maxSubQueueDepth', 'persistOffsetDir', 'subExecutorPooling', 'subExecutors', 'subPort', 'subThrottle']),
    system: new Set(['console', 'config', 'home', 'logFile', 'maxPartitionNumPerQuery', 'mode', 'moduleDir', 'newValuePartitionPolicy', 'perfMonitoring', 'pluginDir', 'preloadModules', 'init', 'startup', 'run', 'tzdb', 'webRoot', 'webLoginRequired'])
}

export type ControllerConfig = {
    id: string
    name: string
    value: string
}

export type ClusterNode = {
    id: string
    host: string
    port: string
    alias: string
    mode: NodeType
}

export type NodesConfig = {
    id: string
    qualifier: string
    name: string
    value: string
}
