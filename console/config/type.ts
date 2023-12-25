export type NodeType  = 'data' | 'agent' | 'controller' | 'computing'

export const CONFIG_CLASSIFICATION = {
    thread: ['localExecutors', 'maxBatchJobWorker', 'maxDynamicWorker', 'webWorkerNum', 'workerNum'],
    memory: ['chunkCacheEngineMemSize', 'maxMemSize', 'memoryReleaseRate', 'regularArrayMemoryLimit', 'warningMemSize'],
    disk: ['batchJobDir', 'chunkMetaDir', 'dataSync', 'jobLogFile', 'logFile', 'logLevel', 'maxLogSize', 'redoLogDir', 'redoLogPurgeInterval', 'redoLogPurgeLimit', 'volumes', 'diskIOConcurrencyLevel'],
    network: ['enableHTTPS', 'localSite', 'maxConnections', 'maxConnectionPerSite', 'tcpNoDelay'],
    streaming_pub: ['maxMsgNumPerBlock', 'maxPersistenceQueueDepth', 'maxPubQueueDepthPerSite', 'maxPubConnections', 'persistenceDir', 'persistenceWorkerNum'],
    streaming_sub: ['maxSubConnections', 'maxSubQueueDepth', 'persistOffsetDir', 'subExecutorPooling', 'subExecutors', 'subPort', 'subThrottle'],
    system: ['console', 'config', 'home', 'logFile', 'maxPartitionNumPerQuery', 'mode', 'moduleDir', 'newValuePartitionPolicy', 'perfMonitoring', 'pluginDir', 'preloadModules', 'init', 'startup', 'run', 'tzdb', 'webRoot', 'webLoginRequired']
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
