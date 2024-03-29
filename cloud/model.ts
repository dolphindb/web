import { Modal } from 'antd'
import type { MessageInstance } from 'antd/es/message/interface.js'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm.js'
import type { NotificationInstance } from 'antd/es/notification/interface.js'

import { default as dayjs, type Dayjs } from 'dayjs'

import { Model } from 'react-object-model'

import Cookies from 'js-cookie'

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
const error_codes = {
    E000000: '内部错误',
    E000001: '无效参数',
    E000002: '集群已存在',
    E000003: '集群不存在',
    E000004: '集群 Configmap 不存在',
    E000005: '集群配置不能为空',
    E000006: '集群配置不存在',
    E000007: '集群配置不可用',
    E000008: 'Pod 不存在',
    E000009: 'Service 不存在',
    E000010: '启动终端失败',
    E000011: '保存临时文件失败',
    E000012: '上传文件失败',
    E000013: '解析上传文件失败',
    E000014: '重启 Pod 失败',
    E000015: 'Statefulset 不存在',
    E000016: '启动 Pod 失败',
    E000017: '暂停 Pod 失败',
    E000018: '未允许的操作',
    E000019: '备份不存在',
    E000020: '还原不存在',
    E000021: '备份云端存储配置已存在',
    E000022: 'Secret 不存在',
    E000023: '当前登录失效，请刷新页面重新登陆'
} as const



export type PageViews = 'cluster' | 'log'

export class CloudModel extends Model <CloudModel> {
    inited = false
    
    authed: 'pending' | 'yes' | 'no' = 'pending'
    
    view: PageViews = 'cluster'
    
    username = ''
    
    is_shell = new URLSearchParams(location.search).get('view') === 'shell'
    
    clusters: Cluster[] = [ ]
    
    cluster: Cluster
    
    namespaces: Namespace[] = [ ]
    
    storageclasses: StorageClass[] = [ ]
    
    versions = [ ]
    
    show_all_config = false
    
    /** 以 // 开头, 不以 / 结尾 */
    monitor_url = `//${location.host}/grafana`
    
    collapsed = localStorage.getItem('ddb-cloud.collapsed') === 'true'
    
    license_server_address: string
    
    
    message: MessageInstance
    
    modal: Omit<ModalStaticFunctions, 'warn'>
    
    notification: NotificationInstance
    
    
    async init () {
        if (this.authed !== 'yes')
            throw new Error(t('请先登录再调用 init'))
        
        await Promise.all([
            this.get_clusters(default_queries),
            this.get_namespaces(),
            this.get_storageclasses(),
            this.get_versions(),
            this.get_username()
        ])
        
        this.get_license_server_address()
        
        this.set({
            inited: true,
        })
    }
    
    
    async auth (username: string, password: string) {
        let token: string
        let expire: string
        try {
            ({ token, expire } = await request_json<{ token: string, expire: string }>('/login', {
                body: {
                    username,
                    password,
                },
            }))
        } catch (error) {
            if (error.response?.status === 401)
                throw new Error(t('用户名或密码错误'))
            
            throw error
        }
        
        // set cookie
        let expireDate = new Date(expire)
        if (Number.isNaN(expireDate.getTime())) {
            console.warn(t('jwt token 过期时间无法解析:'), expire)
            expireDate = dayjs().add(1, 'day').toDate()
        }
        
        Cookies.set('jwt', token, { expires: expireDate, path: '/v1/' })
        
        this.set({ authed: 'yes' })
    }
    
    /** 是否已经认证过并且拥有 Cookie。会将认证结果写入到 authed */
    async check_authed () {
        try {
            await request_json('/v1/dolphindbs/versions')
        } catch (error) {
            this.set({ authed: 'no' })
            
            if (error.response?.status === 401) {
                // clear cookie
                Cookies.remove('jwt', { path: '/v1/' })
                return false
            }
            
            throw error
        }
        
        this.set({ authed: 'yes' })
        return true
    }
    
    /** 修改密码 */
    async change_password (username: string, password: string) {
        try {
            await request_json('/v1/auth/user', {
                method: 'PUT',
                body: {
                    username,
                    password,
                },
            })
        } catch (error) {
            this.show_json_error(error)
            throw error
        }
    }
    
    /** 获取用户名 */
    async get_username () {
        const { username } = await request_json<{ username: string }>('/v1/auth/user')
        this.set({ username })
    }
    
    async get_license_server_address () {
        const { address } = await request_json('/v1/licenseserver')
        
        this.set({
            license_server_address: address
        })
    }
    
    async get_clusters (queries: QueryOptions) {
        try {
            const { items: clusters } = await request_json('/v1/dolphindbs', { queries })
            console.log('clusters:', clusters)
            this.set({ clusters })
        } catch (error) {
            this.show_json_error(error)
            throw error
        }
    }
    
    /** 获取 namespace 字段可选值 */
    async get_namespaces () {
        const { items: namespaces } = await request_json('/v1/namespaces')
        console.log('namespaces:', namespaces)
        this.set({
            namespaces
        })
    }
    
    /** 获取 storage_class 字段可选值 */
    async get_storageclasses () {
        const { items: storageclasses } = await request_json('/v1/storageclasses')
        console.log('storageclasses:', storageclasses)
        this.set({
            storageclasses
        })
    }
    
    /** 获取 version 字段可选值 */
    async get_versions () {
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
        console.log('nodes:', nodes)
        
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
        return request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/instances/${instanceName}/services`, {
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
            const { error_message, error_code }: { error_message: string, error_code: string } = JSON.parse(error.response.body)
            s = language === 'zh' ? error_codes[error_code] : error_message.slice(0, error_message.indexOf('!'))
        } catch (err) {
            // 这个 err 不是原始错误，不往上抛
            s = t('转译错误信息出错，待解析文本 {{ text }}', { text: error.response.body })
        }
        
        this.modal.error({
            content: s,
            footer: false,
            closable: true,
            wrapClassName: 'json-error'
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
        // https://dolphindb1.atlassian.net/wiki/spaces/CC/pages/629080480/DolphinDB+Backup
        phase: 'Available' | 'Ready' | 'Progressing' | 'Unschedulable' | 'Unavailable' | 'Unknown'
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
    enable_jit?: boolean
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
    /** 可能直接没有 resources 字段
        resources.limits 一定有 cpu 字段和 memory 字段  
        resources.requests 同上  
        cpu 中未必有 value 字段，一定没有 unit 字段  
        memory 中未必有 value 字段，一定有 unit 字段 */
    resources?: {
        /** 上限 */
        limits: {
            cpu: {
                value?: number
            }
            memory: {
                unit: string
                value?: number
            }
        }
        /** 下限 */
        requests: {
            cpu: {
                value?: number
            }
            memory: {
                unit: string
                value?: number
            }
        }
    }
    status: {
        // https://dolphindb1.atlassian.net/wiki/spaces/CC/pages/629080480/DolphinDB+Backup
        phase: 'Ready' | 'Progressing' | 'Unschedulable' | 'Unavailable' | 'Paused'
        message?: string
    }
    instance_service: {
        ip: string
        port: string
    }
}

export interface ClusterConfigItem {
    name: string
    value: string
    default_value: string
    type: string
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
