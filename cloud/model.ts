import { message } from 'antd'
import {
    default as dayjs,
    type Dayjs,
} from 'dayjs'

import { Model } from 'react-object-model'

import { request_json, type RequestError } from 'xshell/net.browser.js'
import { language, t } from '../i18n/index.js'


export const default_queries = {
    pageIndex: 1,
    pageSize: 50,
    sortField: ['namespace', 'name'],
    sortBy: ['asc', 'asc'],
}

// https://dolphindb1.atlassian.net/wiki/spaces/CC/pages/633864261
// 现阶段只考虑中文和英文翻译
const error_code_map = {
    E000000: '内部错误!',
    E000001: '无效参数!',
    E000002: '集群已存在!',
    E000003: '集群不存在!',
    E000004: '集群 Configmap 不存在!',
    E000005: '集群配置不能为空!',
    E000006: '集群配置不存在!',
    E000007: '集群配置不可用!',
    E000008: 'Pod 不存在!',
    E000009: 'Service 不存在!',
    E000010: '启动终端失败!',
    E000011: '保存临时文件失败!',
    E000012: '上传文件失败!',
    E000013: '解析上传文件失败!',
    E000014: '重启 Pod 失败!',
    E000015: 'Statefulset 不存在!',
    E000016: '启动 Pod 失败!',
    E000017: '暂停 Pod 失败!',
    E000018: '未允许的操作!',
    E000019: '备份不存在!',
    E000020: '还原不存在!',
    E000021: '备份云端存储配置已存在!',
} as const

const error_message_map = {
    'PageNum is invalid.': '页码不可用',
    'PageSize is invalid.': '页数据条数不可用',
    'request body invalid.': '请求内容不可用',
    'invalid remote type.': '云端存储类型不可用',
    'invalid storage resource.': '存储空间大小不可用',
    "The namespace can't be empty.": '命名空间不可为空',
    "The name can't be empty.": '名字不可为空',
    'The replicas can not be less than original.': '升级后副本数不可小于原值',
    'Standalone instance is forbidden to operate.': '单机节点不支持该操作',
    'Controller instance is forbidden to operate.': '控制节点不支持该操作',
    'new websocket handler from http failed.': '初始化 Websocket 失败',
    'The pod path should not be empty': '上传路径不能为空',
    'instance index should be smaller than controller replicas.': '节点索引必须小于控制节点副本数',
    'instance index should be smaller than datanode replicas.': '节点索引必须小于数据节点副本数',
    'instance index should be smaller than computenode replicas.': '节点索引必须小于计算节点副本数',
    'instance name should be the name of controller or datanode statefulset.': '节点名称不可用',
    '': ''
} as const


export class CloudModel extends Model <CloudModel> {
    inited = false
    
    view: 'cloud' | 'shell' = new URLSearchParams(location.search).get('view') as 'cloud' | 'shell' || 'cloud'
    
    clusters: Cluster[] = [ ]
    
    cluster: Cluster

    namespaces: Namespace[] = []

    storageclasses: StorageClass[] = []

    versions: string[] = []
    
    show_all_config = false
    
    monitor_url: string
    
    
    async init () {
        await Promise.all([
            this.get_clusters(default_queries),
            this.get_namespaces(),
            this.get_storageclasses(),
            this.get_versions(),
        ])
        
        this.get_monitor_url()
        
        this.set({
            inited: true,
        })
    }
    
    async get_monitor_url () {
        const { ip, port } = await request_json('/v1/grafana/url')
        
        this.set({
            monitor_url: '//' + ip + ':' + port
        })
    }
    
    async get_clusters (queries: QueryOptions) {
        const { items: clusters } = await request_json('/v1/dolphindbs', { queries })
        
        console.log('clusters:', clusters)
        
        this.set({
            clusters
        })
    }
    
    /** 获取 namespace 字段可选值 */
    async get_namespaces() {
        const { items: namespaces } = await request_json('/v1/namespaces')
        console.log('namespaces:', namespaces)
        this.set({
            namespaces
        })
    }

    /** 获取 storage_class 字段可选值 */
    async get_storageclasses() {
        const { items: storageclasses } = await request_json('/v1/storageclasses')
        console.log('storageclasses:', storageclasses)
        this.set({
            storageclasses
        })
    }

    /** 获取 version 字段可选值 */
    async get_versions() {
        const { items: versions } = await request_json('/v1/dolphindbs/versions')
        console.log('versions:', versions)
        this.set({
            versions
        })
    }
    
    async create (params) {
        console.log('新建集群:', params)
        
        await request_json('/v1/dolphindbs', {
            body: params,
        })
    }
    
    
    async delete (cluster: Cluster) {
        return request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}`, {
            method: 'DELETE',
        })
    }
    
    
    async get_cluster_nodes (cluster: Cluster) {
        const { items: nodes } = await request_json(
            // /v1/dolphindbs/<namespace>/<name>/instances
            `/v1/dolphindbs/${cluster.namespace}/${cluster.name}/instances`,
            {
                queries: {
                    pageSize: 100000
                }
            }
        )
        
        let { Datanode: datanodes, Controller: controllers, Computenode: computenodes, ...others } = nodes
        console.log('nodes:',nodes)
        
        if (controllers)
            controllers.sort((a, b) => 
                a.name.localeCompare(b.name))

        if (datanodes)
            datanodes.sort((a, b) => 
                a.name.localeCompare(b.name))
                
        if (computenodes)
            computenodes.sort((a, b) =>
                a.name.localeCompare(b.name))
            
        
        
        return { controllers, datanodes, computenodes, ...others }
    }
    
    
    async creat_cluster_node_service (cluster: Cluster, instanceName: string) {
        return request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/instances/${instanceName}/services`,{
            method: 'POST',
        })

    }


    async delete_cluster_node_service (cluster: Cluster, instanceName: string) {
        return request_json(
            `/v1/dolphindbs/${cluster.namespace}/${cluster.name}/instances/${instanceName}/services`, {
            method: 'DELETE',
        })
    }


    async get_cluster (cluster_overview: Cluster) {
        let cluster = await request_json(`/v1/dolphindbs/${cluster_overview.namespace}/${cluster_overview.name}`)
        cluster.created_at = dayjs(cluster.creation_timestamp)
        
        console.log('cluster:', cluster)
        this.set({
            cluster
        })
    }

    async get_cluster_config (cluster: Cluster): Promise<ClusterConfig> {
        return request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/configs`, {
            queries: {
                show_custom_config: !this.show_all_config
            }
        })
    }
    
    async update_cluster_config (cluster: Cluster, newconfig: ClusterConfig) {
        return request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/configs`, {
            method: 'PUT',
            body: newconfig,
        })
    }

    
    async restart_node (node: ClusterNode) {
        await request_json(`/v1/dolphindbs/${this.cluster.namespace}/${this.cluster.name}/instances/${node.name}/restart`, {
            method: 'PUT',
            // body: node
        })
    }
    
    
    show_json_error (error: RequestError) {
        if (!error.response)
            return
        
        let s = ''
        try {
            const { error_message, error_code } : { error_message: string, error_code: string} = JSON.parse(error.response.text)
            
            // 第一段错误信息以 ! 结尾，且中间不包含 !
            // 第二段错误信息以 . 结尾，且中间不包含 ! 或 .
            // 第二段信息和第三段信息之间可能有空格
            // 可能存在第三段信息，但第三段信息不展示
            const index_exclamation = error_message.indexOf('!')
            const index_dot = error_message.indexOf('.', index_exclamation)
            
            const part1 = error_message.slice(0, index_exclamation + 1)
            const part2 = error_message.slice(index_exclamation + 1, index_dot + 1).trim()
            
            s += language === 'zh' ? `${error_code_map[error_code]} ${error_message_map[part2]}` : `${part1} ${part2}`
        } catch(err) {
            // 这个 err不是原始错误，不往上抛
            s += t('转译错误信息出错，待解析文本 {{ text }}', { text: error.response.text })
        }
        message.error(s)
    }
}


export interface Cluster {
    name: string
    namespace: string
    mode: 'cluster' | 'standalone'
    log_mode: string
    cluster_type?: string
    version: string
    storage_class: string
    created_at: Dayjs
    controller: {
        replicas: number
        resources: ClusterNode['resources']
        data_size: string
        log_size: string
    }
    datanode: {
        replicas: number
        resources: ClusterNode['resources']
        data_size: string
        log_size: string
    }
    computenode: {
        replicas: number
        resources: ClusterNode['resources']
        data_size: string
        log_size: string
    }
    status: {
        phase: 'Available' | string
        message: string
    }
    services: {
        Datanode?: {
            ip: string
            port: string
        }
        Controller?: {
            ip: string
            port: string
        }
        Standalone?: {
            ip: string
            port: string
        }
        Computenode?: {
            ip: string
            port: string
        }
    }
}


export interface Namespace {
    name: string
}

export interface StorageClass {
    name: string
}

export interface ClusterNode {
    namespace: string
    name: string
    creation_timestamp: string
    /** resources.limits 一定有cpu字段和memory字段  
        resources.requests 同上  
        cpu 中未必有 value 字段，一定没有 unit 字段  
        memory 中未必有 value 字段，一定有 unit 字段 */
    resources: {
        /** 上限 */
        limits: {
            cpu: {
                value?: number
            },
            memory: {
                unit: string
                value?: number
            },
        },
        /** 下限 */
        requests: {
            cpu: {
                value?: number
            },
            memory: {
                unit: string
                value?: number
            },
        }
    }
    status: {
        phase: 'Available' | string
        message?: string
    }
    instance_service: {
        ip: string
        port: string
    }
}

export interface ClusterConfigItem {
    name: string,
    value: string,
    default_value: string,
    type: string,
    description: string
}

export interface ClusterConfig {
    cluster_config?: ClusterConfigItem[]
    controller_config?: ClusterConfigItem[]
    agent_config?: ClusterConfigItem[]
    dolphindb_config?: ClusterConfigItem[]
}

export interface QueryOptions {
    name?: string[] | string
    version?: string[] | string
    namespace?: Namespace[]
    sortField?: string[] | string
    sortBy?: string[] | string
    pageSize?: number
    pageIndex?: number
}

export type ClusterMode = 'standalone' | 'cluster'

export type ClusterType = 'singlecontroller' | 'multicontroller'

export let model = (window as any).model = new CloudModel()
