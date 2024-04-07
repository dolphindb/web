import { t } from '../../i18n/index.js'


export type NodeType  = 'data' | 'agent' | 'controller' | 'computing'

export const CONFIG_CLASSIFICATION = {
    [t('线程')]: new Set(['localExecutors', 'maxBatchJobWorker', 'maxDynamicWorker', 'webWorkerNum', 'workerNum']),
    [t('内存')]:  new Set(['chunkCacheEngineMemSize', 'maxMemSize', 'memoryReleaseRate', 'regularArrayMemoryLimit', 'warningMemSize']),
    [t('磁盘')]:  new Set(['batchJobDir', 'chunkMetaDir', 'dataSync', 'jobLogFile', 'logFile', 'logLevel', 'maxLogSize', 'redoLogDir', 'redoLogPurgeInterval', 'redoLogPurgeLimit', 'volumes', 'diskIOConcurrencyLevel']),
    [t('网络')]:  new Set(['enableHTTPS', 'localSite', 'maxConnections', 'maxConnectionPerSite', 'tcpNoDelay']),
    [t('流发布')]:  new Set(['maxMsgNumPerBlock', 'maxPersistenceQueueDepth', 'maxPubQueueDepthPerSite', 'maxPubConnections', 'persistenceDir', 'persistenceWorkerNum']),
    [t('流订阅')]:  new Set(['maxSubConnections', 'maxSubQueueDepth', 'persistOffsetDir', 'subExecutorPooling', 'subExecutors', 'subPort', 'subThrottle']),
    [t('系统')]:  new Set(['console', 'config', 'home', 'maxPartitionNumPerQuery', 'mode', 'moduleDir', 'newValuePartitionPolicy', 'perfMonitoring', 'pluginDir', 'preloadModules', 'init', 'startup', 'run', 'tzdb', 'webRoot', 'webLoginRequired'])
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
    key: string
    category?: string
    qualifier: string
    name: string
    value: string
}
