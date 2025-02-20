import { Model } from 'react-object-model'

import { DdbInt, type DdbCallOptions } from 'dolphindb/browser.js'

import { t } from '@i18n/index.ts'

import { NodeType, model } from '@/model.ts'

import { iterator_map } from '@/utils.ts'

import { _2_strs, get_category, parse_nodes_configs } from './utils.ts'

import type { NodesConfig } from './type.ts'


const trusies = ['1', 'true'] as const

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
        const configs = parse_nodes_configs(
            // 2025.01.03 登录鉴权功能之后 loadClusterNodesConfigs 没有要求一定要在控制节点执行了
            // 所以这里不用 this.invoke
            await model.ddb.invoke<string[]>('loadClusterNodesConfigs', undefined, { urgent: true }))
        
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
        return trusies.includes(this.get_config(key))
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
        
        const old_config = await this.invoke<string[]>('loadClusterNodesConfigs', undefined, { urgent: true })
        
        await this.invoke(
            'saveClusterNodesConfigs', 
            [[...iterator_map(
                this.nodes_configs.entries(), 
                ([key, config]) => {
                    new_nodes_configs.set(key, config)
                    const { value } = config
                    return `${key}=${value}`
                })
            ]])
        
        if (model.node_type === NodeType.controller)
            try {
                await this.invoke('reloadClusterConfig')
            } catch (error) {
                model.modal.error({
                    title: t('配置文件存在错误 {{message}} 请检查输入内容并重新尝试。', { message: error.message }),
                })
                error.shown = true
                
                await this.invoke('saveClusterNodesConfigs', [old_config])
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
    
    
    get_config_classification () {
        return {
            [t('线程')]: new Set(['localExecutors', 'maxBatchJobWorker', 'maxDynamicWorker', 'webWorkerNum', 'workerNum', 'PKEYBackgroundWorkerPerVolume', 'PKEYCacheFlushWorkerNumPerVolume']),
            [t('内存')]: new Set(['chunkCacheEngineMemSize', 'maxMemSize', 'memoryReleaseRate', 'regularArrayMemoryLimit', 'warningMemSize', 'PKEYCacheEngineSize', 'PKEYBlockCacheSize', 'PKEYDeleteBitmapUpdateThreshold', 'PKEYStashedPrimaryKeyBufferSize']),
            [t('磁盘')]: new Set(['batchJobDir', 'chunkMetaDir', 'dataSync', 'jobLogFile', 'logFile', 'logLevel', 'maxLogSize', 'redoLogDir', 'redoLogPurgeInterval', 'redoLogPurgeLimit', 'volumes', 'diskIOConcurrencyLevel', 'PKEYMetaLogDir', 'PKEYRedoLogDir']),
            [t('网络')]: new Set(['enableHTTPS', 'localSite', 'maxConnections', 'maxConnectionPerSite', 'tcpNoDelay']),
            [t('流发布')]: new Set(['maxMsgNumPerBlock', 'maxPersistenceQueueDepth', 'maxPubQueueDepthPerSite', 'maxPubConnections', 'persistenceDir', 'persistenceWorkerNum']),
            [t('流订阅')]: new Set(['maxSubConnections', 'maxSubQueueDepth', 'persistOffsetDir', 'subExecutorPooling', 'subExecutors', 'subPort', 'subThrottle', 'streamingHAMode']),
            [t('系统')]: new Set(['console', 'config', 'home', 'maxPartitionNumPerQuery', 'mode', 'moduleDir', 'newValuePartitionPolicy', 'perfMonitoring', 'pluginDir', 'preloadModules', 'init', 'startup', 'run', 'tzdb', 'webRoot', 'webLoginRequired', 'enableShellFunction', 'enablePKEYEngine']),
            [t('计算组')]: new Set([
                'computeNodeCacheDir',
                'computeNodeCacheMeta',
                'computeNodeMemCacheSize',
                'computeNodeDiskCacheSize',
                'enableComputeNodeCacheEvictionFromQueryThread',
            ]),
        }
    }
    
    
    get_controller_config () {
        return [
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
            // 先不发，等 3.00 大版本再发
            // 'enableClientAuth',
            'computeNodeCachingDelay',
            'computeNodeCachingQueryThreshold',
            'enableComputeNodePrefetchData',
        ]
    }
}

export let config = new ConfigModel()
