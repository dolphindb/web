import { Model } from 'react-object-model'

import { DdbInt, DdbVectorString, type DdbCallOptions } from 'dolphindb/browser.js'
import { log, to_option } from 'xshell/utils.browser.js'

import { t } from '@i18n'

import { NodeType, model } from '@model'

import { iterator_map, urgent } from '@utils'

import { _2_strs, get_category } from './utils.ts'

import type { NodesConfig } from './type.ts'


class ConfigModel extends Model<ConfigModel> {
    nodes_configs: Map<string, NodesConfig>
    
    
    async load_controller_configs () {
        return this.invoke<string[]>('loadControllerConfigs')
    }
    
    
    async save_controller_configs (configs: string[]) {
        await this.invoke('saveControllerConfigs', [configs])
    }
    
    
    async get_cluster_nodes () {
        return this.invoke<string[]>('getClusterNodesCfg')
    }
    
    
    async save_cluster_nodes (nodes: string[]) {
        await this.invoke('saveClusterNodes', [nodes])
    }
    
    
    async add_agent_to_controller (host: string, port: number, alias: string) {
        await this.invoke('addAgentToController', [host, new DdbInt(port), alias])
    }
    
    
    async load_configs () {
        const configs = new Map<string, NodesConfig>(
            (
                // 2025.01.03 登录鉴权功能之后 loadClusterNodesConfigs 没有要求一定要在控制节点执行了
                // 所以这里不用 this.invoke
                await model.ddb.invoke<string[]>('loadClusterNodesConfigs', undefined, urgent)
            ).map(str => {
                const [left, value = ''] = str.split2('=', { optional: true })
                    .map(s => s.trim()) as [string, string?]
                
                const idot = left.indexOf('.')
                const name = left.slice(idot + 1)
                
                return [
                    left,
                    {
                        key: left,
                        category: get_category(name),
                        qualifier: idot !== -1  ? left.slice(0, idot) : '',
                        name,
                        value,
                    }
                ]
            }))
        
        this.set({ nodes_configs: configs })
        
        console.log(
            t('配置文件:'),
            Object.fromEntries(
                iterator_map(
                    this.nodes_configs.entries(),
                    ([key, { value }]) => [key, value])))
        
        return configs        
    }
    
    
    /** 读取配置文件 key 配置项对应的值，返回字符串值或 undefined */
    get_config <TValue extends string> (key: string): TValue | undefined {
        return this.nodes_configs.get(key)?.value as TValue
    }
    
    
    get_boolean_config (key: string) {
        const value = this.get_config(key)
        return value === '1' || value === 'true'
    }
    
    
    set_config (key: string, value: string) {
        this.nodes_configs.set(key, {
            name: key,
            key,
            value,
            qualifier: '',
            category: get_category(key)
        })
    }
    
    
    async change_configs (configs: Array<[string, NodesConfig]>) {
        configs.forEach(([key, value]) => {
            this.nodes_configs.set(key, { ...value, category: get_category(value.name) })
        })
        
        await this.save_configs()
    }
    
    
    delete_config (key: string) {
        this.nodes_configs.delete(key)
    }
    
    
    async delete_configs (configs: Array<string>) {
        configs.forEach(config => {
            this.nodes_configs.delete(config)
        })
        
        await this.save_configs()
    }
    
    
    async save_configs () {
        const new_nodes_configs = new Map<string, NodesConfig>()
        
        const old_config = await this.invoke<string[]>('loadClusterNodesConfigs', undefined, urgent)
        
        await this.invoke(
            'saveClusterNodesConfigs', 
            [
                log(
                    '保存新的配置:', 
                    new DdbVectorString([...iterator_map(
                        this.nodes_configs.entries(), 
                        ([key, config]) => {
                            new_nodes_configs.set(key, config)
                            const { value } = config
                            return `${key}=${value}`
                        })
                    ]))
            ])
        
        if (model.node_type === NodeType.controller)
            try {
                await this.invoke('reloadClusterConfig')
            } catch (error) {
                model.modal.error({
                    title: log('加载配置文件错误:', t('配置文件存在错误 {{message}} 请检查输入内容并重新尝试。', { message: error.message })),
                })
                error.shown = true
                
                await this.invoke('saveClusterNodesConfigs', [
                    log('恢复旧的配置:', new DdbVectorString(old_config))
                ])
                await this.load_configs()
                
                throw error
            }
        
        this.set({ nodes_configs: new_nodes_configs })
    }
    
    
    async invoke <TResult> (
        name: string, 
        args?: any[], 
        options?: DdbCallOptions
    ) {
        return model.ddb.invoke<TResult>(
            name, 
            args,
            {
                ... model.node_type === NodeType.controller || model.node_type === NodeType.single
                    ? { }
                    : { node: model.controller_alias },
                ...options
            })
    }
}


/** 分类的集群节点配置 */
export const node_configs = {
    [t('线程')]: [
        'localExecutors', 'maxBatchJobWorker', 'maxDynamicWorker', 'webWorkerNum', 'workerNum', 
        'PKEYBackgroundWorkerPerVolume', 'PKEYCacheFlushWorkerNumPerVolume'
    ],
    [t('内存')]: [
        'chunkCacheEngineMemSize', 'maxMemSize', 'memoryReleaseRate', 'regularArrayMemoryLimit', 'warningMemSize', 
        'PKEYCacheEngineSize', 'PKEYBlockCacheSize', 'PKEYDeleteBitmapUpdateThreshold', 'PKEYStashedPrimaryKeyBufferSize'
    ],
    [t('磁盘')]: [
        'batchJobDir', 'chunkMetaDir', 'dataSync', 'jobLogFile', 'logFile', 'logLevel', 'maxLogSize', 'redoLogDir', 
        'redoLogPurgeInterval', 'redoLogPurgeLimit', 'volumes', 'diskIOConcurrencyLevel', 'PKEYMetaLogDir', 'PKEYRedoLogDir', 'coldVolumes'
    ],
    [t('网络')]: [
        'enableHTTPS', 'localSite', 'maxConnections', 'maxConnectionPerSite', 'tcpNoDelay'
    ],
    [t('流发布')]: [
        'maxMsgNumPerBlock', 'maxPersistenceQueueDepth', 'maxPubQueueDepthPerSite', 'maxPubConnections', 
        'persistenceDir', 'persistenceWorkerNum'
    ],
    [t('流订阅')]: [
        'maxSubConnections', 'maxSubQueueDepth', 'persistOffsetDir', 'subExecutorPooling', 'subExecutors', 
        'subPort', 'subThrottle', 'streamingHAMode', 'streamingSQLExecutors', 'maxStreamingSQLQueriesPerTable', 
        'streamingRaftLearners', 'streamingRaftGroups', 'crossClusterRaftWorkerNum'
    ],
    [t('系统')]: [
        'console', 'config', 'home', 'maxPartitionNumPerQuery', 'mode', 'moduleDir', 'newValuePartitionPolicy', 
        'perfMonitoring', 'pluginDir', 'preloadModules', 'init', 'startup', 'run', 'tzdb', 'webRoot', 'webLoginRequired', 
        'enableShellFunction', 'enablePKEYEngine'
    ],
    [t('计算组')]: [
        'computeNodeCacheDir', 'computeNodeCacheMeta', 'computeNodeMemCacheSize', 'computeNodeDiskCacheSize',
        'enableComputeNodeCacheEvictionFromQueryThread',
    ]
}


/** 集群节点配置选项，用于 antd options */
export const node_configs_options = Object.entries(node_configs)
    .map(([category_name, configs]) => ({
        label: category_name,
        options: configs.map(to_option)
    }))


export const controller_configs = ([
    'mode',
    'preloadModules',
    'localSite',
    'clusterConfig',
    'nodesFile',
    'localExecutors',
    'maxBatchJobWorker',
    'maxConnections',
    'maxConnectionPerSite',
    'maxDynamicWorker',
    'maxMemSize',
    'webWorkerNum',
    'dfsMetaDir',
    'dfsMetaLogFilename',
    'dfsReplicationFactor',
    'dfsReplicaReliabilityLevel',
    'dfsRecoveryWaitTime',
    'enableDFS',
    'enableHTTPS',
    'dataSync',
    'webLoginRequired',
    'PublicName',
    'datanodeRestartInterval',
    'dfsHAMode',
    'clusterReplicationSlaveNum',
    'dfsChunkNodeHeartBeatTimeout',
    'clusterReplicationMasterCtl',
    'metricsToken',
    'strictPermissionMode',
    'enableLocalDatabase',
    'enableClientAuth',
    'computeNodeCachingDelay',
    'computeNodeCachingQueryThreshold',
    'enableComputeNodePrefetchData'
] as const).map(to_option)


export async function validate_qualifier (config_name: string, value: string) {
    if ((config_name === 'computeNodeCacheDir' || config_name === 'computeNodeCacheMeta') && !value.includes('%'))
        throw new Error(t('配置项 {{name}} 的限定词必须包含 %', { name: config_name }))
}

export async function validate_config (config_name: string, value: string) {
    if (!value || value.trim() === '') 
        throw new Error(t('请输入配置值'))
    
    if ((config_name === 'computeNodeCacheDir' || config_name === 'computeNodeCacheMeta') && !value.includes('<ALIAS>'))
        throw new Error(t('配置项 {{name}}的值必须包含 <ALIAS>', { name: config_name }))
} 

export let config = new ConfigModel()
