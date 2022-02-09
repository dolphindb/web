import {
    default as dayjs,
    type Dayjs,
} from 'dayjs'

import Model from 'react-object-model'

import { request_json } from 'xshell/net.browser'


export const default_queries = {
    pageIndex: 1,
    pageSize: 50,
    sortField: 'name',
    sortBy: 'asc'
} as const


export class CloudModel extends Model <CloudModel> {
    inited = false
    
    view = 'cloud'
    
    clusters: Cluster[] = [ ]
    
    cluster: Cluster

    namespaces: Namespace[] = []

    storageclasses: StorageClass[] = []

    versions: string[] = []
    
    async init () {
        await Promise.all([
            this.get_clusters(default_queries),
            this.get_namespaces(),
            this.get_storageclasses(),
            this.get_versions(),
        ])
        
        this.set({
            inited: true,
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
            method: 'delete',
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
        
        console.log('nodes:', nodes)
        
        return nodes
    }
    
    
    async get_cluster (cluster_overview: Cluster) {
        const cluster = await request_json(`/v1/dolphindbs/${cluster_overview.namespace}/${cluster_overview.name}`)
        cluster.created_at = dayjs(cluster.creationTimestamp)
        
        console.log('cluster:', cluster)
        this.set({
            cluster
        })
    }

    async get_cluster_config (cluster: Cluster): Promise<ClusterConfig> {
        return request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/configs`)
    }

    async update_cluster_config (cluster: Cluster, newconfig: ClusterConfig) {
        return request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/configs`, {
            method: 'put',
            body: newconfig,
        })
    }

    
    async restart_node (node: ClusterNode) {
        await request_json(`/v1/dolphindbs/${this.cluster.namespace}/${this.cluster.name}/instances/${node.name}/restart`, {
            method: 'put',
            // body: node
        })
    }
}


export interface Cluster {
    name: string
    namespace: string
    mode: 'cluster' | 'standalone'
    log_mode: string
    cluster_type?: string
    version: string
    storage_class_name: string
    created_at: Dayjs
    controller: {
        replicas: number
        resources: any,
        dataSize: string,
        logSize: string,
    }
    datanode: {
        replicas: number
        resources: any,
        dataSize: string,
        logSize: string,
    }
    status: {
        phase: 'Available' | string
        message: string
    }
    Services: {
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
    resources: {
        limits: {
            cpu: string
            memory: string
        }
    }
    status: {
        phase: 'Available' | string
        message?: string
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
    cluster_config?: ClusterConfigItem[],
    controller_config?: ClusterConfigItem[],
    agent_config?: ClusterConfigItem[]
    dolphindb_config?: ClusterConfigItem[]
}

export interface QueryOptions {
    name?: string[] | string,
    version?: string[] | string,
    namespace?:Namespace[],
    sortField?: string[] | string,
    sortBy?: string[] | string
    pageSize?: number
    pageIndex?: number
}

export type ClusterMode = 'standalone' | 'cluster'

export type ClusterType = 'singlecontroller' | 'multicontroller'

export let model = (window as any).model = new CloudModel()

export default model
