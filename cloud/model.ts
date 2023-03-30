import { Modal } from 'antd'
import {
    default as dayjs,
    type Dayjs,
} from 'dayjs'

import { Model } from 'react-object-model'

import { request_json, type RequestError } from 'xshell/net.browser.js'
import { t } from '../i18n/index.js'


export const default_queries = {
    pageIndex: 1,
    pageSize: 50,
    sortField: ['namespace', 'name'],
    sortBy: ['asc', 'asc'],
}


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
    
    show_error ({ error, title, content }: { error?: Error | RequestError, title?: string, content?: string }) {
        console.log(error)
        
        Modal.error({
            className: 'modal-error',
            title: title || error?.message,
            content: (() => {
                if (content)
                    return content
                    
                if (error) {
                    let s = ''
                    
                    // 假定不会遇到其它不是 RequestError 但又有 response 字段的错误
                    if ('response' in error) {
                        const { url, text } = error.response
                        s += t('请求 {{ url }} 时出错', { url }) + '\n'
                        
                        s += t('错误信息:') + '\n'
                        
                        try {
                            s += (JSON.parse(text)?.error_message || t('服务端未返回错误信息')) + '\n'
                        } catch(error) {
                            s += t('解析服务端发送的 JSON 信息时发生错误') + '\n'
                        }
                    }
                    
                    s += t('调用栈:\n') +
                        error.stack + '\n'
                
                    if (error.cause)
                        s += (error.cause as Error).stack
                    
                    return s
                }
            })(),
            width: 1000,
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
    storage_class: string
    created_at: Dayjs
    controller: {
        replicas: number
        resources: {
            limits: {
                cpu: {
                    value: number
                },
                memory: {
                    unit: string
                    value: number
                },
            },
            requests: {
                cpu: {
                    value: number
                },
                memory: {
                    unit: string
                    value: number
                },
            }
        }
        data_size: string
        log_size: string
    }
    datanode: {
        replicas: number
        resources: {
            limits: {
                cpu: {
                    value: number
                },
                memory: {
                    unit: string
                    value: number
                },
            },
            requests: {
                cpu: {
                    value: number
                },
                memory: {
                    unit: string
                    value: number
                },
            }
        }
        data_size: string
        log_size: string
    }
    computenode: {
        replicas: number
        resources: {
            limits: {
                cpu: {
                    value: number
                },
                memory: {
                    unit: string
                    value: number
                },
            },
            requests: {
                cpu: {
                    value: number
                },
                memory: {
                    unit: string
                    value: number
                },
            }
        }
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
