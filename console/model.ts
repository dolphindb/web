import type { BaseType } from 'antd/lib/typography/Base/index.js'

import { Model } from 'react-object-model'

import { Modal } from 'antd'

import { ddb, DdbFunctionType, DdbObj, DdbInt, DdbLong, type InspectOptions } from 'dolphindb/browser.js'

import { t } from '../i18n/index.js'

export const storage_keys = {
    ticket: 'ddb.ticket',
    username: 'ddb.username',
    session_id: 'ddb.session_id',
    collapsed: 'ddb.collapsed',
    code: 'ddb.code',
    session: 'ddb.session',
    minimap: 'ddb.editor.minimap',
    enter_completion: 'ddb.editor.enter_completion',
} as const

const username_guest = 'guest' as const

export type PageViews = 'overview' | 'shell' | 'dashboard' | 'table' | 'job' | 'cluster' | 'login' | 'dfs' | 'log'

export class DdbModel extends Model<DdbModel> {
    inited = false
    
    /** 在本地开发模式 */
    dev = false
    
    /** 通过 cdn 访问的 web */
    cdn = false
    
    collapsed = localStorage.getItem(storage_keys.collapsed) === 'true'
    
    view = '' as PageViews
    
    /** 重定向 view */
    redirection?: PageViews
    
    logined = false
    
    username = localStorage.getItem(storage_keys.username) || username_guest
    
    node_type: NodeType
    
    node_alias: string
    
    controller_alias: string
    
    nodes: DdbNode[]
    
    node: DdbNode
    
    version: string
    
    license: DdbLicense
    
    first_get_server_log_length = true
    
    first_get_server_log = true
    
    options?: InspectOptions
    
    /** 是否显示顶部导航栏，传 header=0 时隐藏，便于嵌入 web 页面 */
    header: boolean
    
    /** 是否在代码为空时设置代码模板 */
    code_template: boolean
    
    
    constructor () {
        super()
        
        const params = new URLSearchParams(location.search)
        
        this.dev = location.pathname.endsWith('/console/') || params.get('dev') === '1'
        this.cdn = location.hostname === 'cdn.dolphindb.cn' || params.get('cdn') === '1'
        this.header = params.get('header') !== '0'
        this.code_template = params.get('code-template') === '1'
        this.redirection = params.get('redirection') as PageViews
    }
    
    
    async init () {
        console.log(t('web 开始初始化，当前处于{{mode}}模式，构建时间是 {{time}}', {
            mode: this.dev ? t('开发') : t('生产'),
            time: BUILD_TIME
        }))
        
        /** 检测 ddb 是否通过 nginx 代理，部署在子路径下 */
        const is_subpath = location.pathname === '/dolphindb/'
        if (is_subpath)
            ddb.url += 'dolphindb/'
        
        ddb.autologin = false
        
        try {
            await this.login_by_ticket()
        } catch {
            console.log(t('ticket 登录失败'))
            
            if (this.dev)
                try {
                    await this.login_by_password('admin', '123456')
                } catch {
                    console.log(t('使用默认账号密码登录失败'))
                }
        }
        
        await Promise.all([
            this.get_node_type(),
            this.get_node_alias(),
            this.get_controller_alias(),
        ])
        
        await this.get_cluster_perf()
        
        await this.check_leader_and_redirect()
        
        this.get_license()
        
        this.goto_default_view()
        
        this.set({ inited: true })
        
        this.get_version()
    }
    
    
    async login_by_password (username: string, password: string) {
        ddb.username = username
        ddb.password = password
        await ddb.call('login', [username, password], { urgent: true })
        
        const ticket = (
            await ddb.call<DdbObj<string>>('getAuthenticatedUserTicket', [ ], {
                urgent: true,
                ... this.node_type === NodeType.controller || this.node_type === NodeType.single ? { } : { node: this.controller_alias, func_type: DdbFunctionType.SystemFunc }
            })
        ).value
        
        localStorage.setItem(storage_keys.username, username)
        localStorage.setItem(storage_keys.ticket, ticket)
        
        this.set({ logined: true, username })
        console.log(t('{{username}} 使用账号密码登陆成功', { username: this.username }))
    }
    
    
    async login_by_ticket () {
        const ticket = localStorage.getItem(storage_keys.ticket)
        if (!ticket) {
            this.set({ logined: false, username: username_guest })
            throw new Error(t('没有自动登录的 ticket'))
        }
        
        try {
            await ddb.call('authenticateByTicket', [ticket], { urgent: true })
            this.set({ logined: true })
            console.log(t('{{username}} 使用 ticket 登陆成功', { username: this.username }))
        } catch (error) {
            this.set({ logined: false, username: username_guest })
            localStorage.removeItem(storage_keys.ticket)
            localStorage.removeItem(storage_keys.username)
            throw error
        }
    }
    
    
    /** 验证成功时返回用户信息；验证失败时跳转到单点登录页 */
    async login_by_session (session: string) {
        // https://dolphindb1.atlassian.net/browse/DPLG-581
        
        await ddb.call('login', ['guest', '123456'])
        
        const result = (
            await ddb.call('authenticateBySession', [session])
        ).to_dict<{ code: number, message: string, username: string, raw: string }>({ strip: true })
        
        if (result.code) {
            const message = t('通过 session 登录失败，即将跳转到单点登录页')
            localStorage.removeItem(storage_keys.session)
            const error = Object.assign(
                new Error(message),
                result
            )
            alert(
                message + '\n' +
                JSON.stringify(result)
            )
            if (location.pathname !== '/')
                location.pathname = '/'
            throw error
        } else {
            console.log(t('通过 session 登录成功:'), result)
            
            localStorage.setItem(storage_keys.session, session)
            
            // result.username 由于 server 的 parseExpr 无法正确 parse \u1234 这样的字符串，先从后台 JSON 中提取信息
            // 等 server 增加 parseJSON 函数
            const { name: username } = JSON.parse(result.raw)
            this.set({ logined: true, username })
            return result
        }
    }
    
    
    logout () {
        localStorage.removeItem(storage_keys.ticket)
        localStorage.removeItem(storage_keys.username)
        localStorage.setItem(storage_keys.session_id, '0')
        
        ddb.call('logout', [ ], { urgent: true })
        
        this.set({
            logined: false,
            username: username_guest,
        })
        this.goto_login()
    }
    
    
    async get_node_type () {
        const { value: node_type } = await ddb.call<DdbObj<NodeType>>('getNodeType', [ ], { urgent: true })
        this.set({
            node_type
        })
        console.log(t('节点类型:'), NodeType[node_type])
        return node_type
    }
    
    
    async get_node_alias () {
        const { value: node_alias } = await ddb.call<DdbObj<string>>('getNodeAlias', [ ], { urgent: true })
        this.set({
            node_alias
        })
        console.log(t('节点名称:'), node_alias)
        return node_alias
    }
    
    async get_controller_alias () {
        const { value: controller_alias } = await ddb.call<DdbObj<string>>('getControllerAlias', [ ], { urgent: true })
        this.set({ controller_alias })
        console.log(t('控制节点:'), controller_alias)
        return controller_alias
    }
    
    
    async get_version () {
        let { value: version } = await ddb.call<DdbObj<string>>('version', [ ])
        version = version.split(' ')[0]
        this.set({ version })
        console.log(t('版本:'), version)
        return version
    }
    
    
    async get_license () {
        const license = (
            await ddb.call<DdbObj<DdbObj[]>>('license')
        ).to_dict<DdbLicense>({ strip: true })
        
        console.log('license:', license)
        this.set({ license })
        return license
    }
    
    /**
     * 去登录页
     * @param redirection 设置登录完成后的回跳页面，默认取当前 view
     */
    goto_login (redirection: PageViews = this.view) {
        this.set({ view: 'login', redirection })
    }
    
    goto_redirection () {
        if (this.redirection) 
            this.set({ view: this.redirection })
        else
            // 保留旧跳转逻辑
            this.goto_default_view()
    }
    
    goto_default_view () {
        this.set({
            view: new URLSearchParams(location.search).get('view') as DdbModel['view'] || 
                (this.node_type === NodeType.controller ? 'cluster' : 'shell')
        })
    }
    
    
    /** 获取 nodes 和 node 信息
        https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/g/getClusterPerf.html  
        Only master or single mode supports function getClusterPerf.
    */
    async get_cluster_perf () {
        const nodes = (
            await ddb.call<DdbObj<DdbObj[]>>('getClusterPerf', [true], {
                urgent: true,
                
                ... this.node_type === NodeType.controller || this.node_type === NodeType.single ? 
                    { }
                :
                    {
                        node: this.controller_alias,
                        func_type: DdbFunctionType.SystemFunc
                    },
            })
        ).to_rows<DdbNode>()
        
        console.log(t('集群节点:'), nodes)
        
        const node = nodes.find(node => node.name === this.node_alias)
        
        console.log(t('当前节点:'), node)
        
        this.set({ nodes, node })
    }
    
    
    async check_leader_and_redirect () {
        if (this.node.mode === NodeType.controller && 'isLeader' in this.node && this.node.isLeader === false) {
            const leader = this.nodes.find(node => 
                node.isLeader)
            
            if (leader) {
                alert(
                    t('您访问的这个控制结点现在不是高可用 (raft) 集群的 leader 结点, 将会为您自动跳转到集群当前的 leader 结点: ') + leader.site
                )
                
                location.host = `${leader.host}:${leader.port}`
            }
        }
    }
    
    async get_console_jobs () {
        return ddb.call<DdbObj<DdbObj[]>>('getConsoleJobs', [ ], {
            urgent: true,
            nodes: this.node_type === NodeType.controller ? 
                    this.nodes.filter(node => 
                        node.state === DdbNodeState.online && node.mode !== NodeType.agent
                    ).map(node => 
                        node.name
                    )
                :
                    null
        })
    }
    
    
    async get_recent_jobs () {
        return ddb.call<DdbObj<DdbObj[]>>('getRecentJobs', [ ], {
            urgent: true,
            nodes: this.node_type === NodeType.controller ? 
                    this.nodes.filter(node => 
                        node.state === DdbNodeState.online && node.mode !== NodeType.agent
                    ).map(node => 
                        node.name
                    )
                :
                    null
        })
    }
    
    
    async get_scheduled_jobs () {
        return ddb.call<DdbObj<DdbObj[]>>('getScheduledJobs', [ ], {
            urgent: true,
            nodes: this.node_type === NodeType.controller ? 
                this.nodes.filter(node => node.state === DdbNodeState.online && node.mode !== NodeType.agent)
                    .map(node => node.name)
                :
                    null
        })
    }
    
    
    async cancel_console_job (job: DdbJob) {
        return ddb.call('cancelConsoleJob', [job.rootJobId], { urgent: true })
    }
    
    
    async cancel_job (job: DdbJob) {
        return ddb.call('cancelJob', [job.jobId], {
            urgent: true,
            ... (!job.node || this.node_alias === job.node) ? { } : { node: job.node, func_type: DdbFunctionType.SystemProc }
        })
    }
    
    
    async delete_scheduled_job (job: DdbJob) {
        return ddb.call('deleteScheduledJob', [job.jobId], {
            urgent: true,
            ... (!job.node || this.node_alias === job.node) ? { } : { node: job.node, func_type: DdbFunctionType.SystemProc }
        })
    }
    
    
    async get_server_log_length () {
        let length: bigint
        
        if (this.node_type === NodeType.data_node || this.node_type === NodeType.computing_node) {
            if (this.first_get_server_log_length) {
                await ddb.eval(
                    'def get_server_log_length_by_agent (host, port, node_alias) {\n' +
                    '    conn_agent = xdb(host, port)\n' +
                    "    length = remoteRun(conn_agent, 'getServerLogLength', node_alias)\n" +
                    '    close(conn_agent)\n' +
                    '    return length\n' +
                    '}\n'
                )
                this.first_get_server_log_length = false
            }
            const [host, port] = this.node.agentSite.split(':')
            ;({ value: length } = await ddb.call<DdbObj<bigint>>(
                'get_server_log_length_by_agent',
                [host, new DdbInt(Number(port)), this.node_alias]
            ))
        } else
            ({ value: length } = await ddb.call<DdbObj<bigint>>('getServerLogLength', [this.node_alias]))
        
        console.log('get_server_log_length', length)
        
        return length
    }
    
    
    async get_server_log (offset: bigint, length: bigint) {
        let logs: string[]
        
        if (this.node_type === NodeType.data_node || this.node_type === NodeType.computing_node) {
            if (this.first_get_server_log) {
                await ddb.eval(
                    'def get_server_log_by_agent (host, port, length, offset, node_alias) {\n' +
                    '    conn_agent = xdb(host, port)\n' +
                    "    logs = remoteRun(conn_agent, 'getServerLog', length, offset, true, node_alias)\n" +
                    '    close(conn_agent)\n' +
                    '    return logs\n' +
                    '}\n'
                )
                this.first_get_server_log = false
            }
            
            const [host, port] = this.node.agentSite.split(':')
            
            ;({ value: logs } = await ddb.call<DdbObj<string[]>>(
                'get_server_log_by_agent',
                [host, new DdbInt(Number(port)), new DdbLong(length), new DdbLong(offset), this.node_alias]
            ))
        } else
            ({ value: logs } = await ddb.call<DdbObj<string[]>>(
                'getServerLog',
                [new DdbLong(length), new DdbLong(offset), true, this.node_alias]
            ))
        
        logs.reverse()
        
        console.log('get_server_log', offset, length, logs.length)
        
        return logs
    }
    
    
    show_error ({ error, title, content }: { error?: Error, title?: string, content?: string }) {
        Modal.error({
            className: 'modal-error',
            title: title || error?.message,
            ... (content || error) ? {
                content: content || error.stack
            } : { },
            width: 800,
        })
    }
}

export enum NodeType {
    data_node = 0,
    agent = 1,
    controller = 2,
    single = 3,
    computing_node = 4,
}


interface DdbNode {
    name: string
    state: DdbNodeState
    mode: NodeType
    host: string
    port: number
    site: string
    agentSite: string
    maxConnections: number
    maxMemSize: number
    workerNum: number
    executorNum: number
    connectionNum: number
    memoryUsed: bigint
    memoryAlloc: bigint
    diskReadRate: bigint
    diskWriteRate: bigint
    networkRecvRate: bigint
    networkSendRate: bigint
    
    cpuUsage: number
    avgLoad: number
    
    queuedJobs: number
    queuedTasks: number
    runningJobs: number
    runningTasks: number
    
    jobLoad: number
    
    /** 单位 ns */
    medLast10QueryTime: bigint
    maxLast10QueryTime: bigint
    medLast100QueryTime: bigint
    maxLast100QueryTime: bigint
    maxRunningQueryTime: bigint

    diskCapacity: bigint
    diskFreeSpace: bigint
    diskFreeSpaceRatio: number

    lastMinuteWriteVolume: bigint
    lastMinuteReadVolume: bigint

    lastMinuteNetworkSend: bigint
    lastMinuteNetworkRecv: bigint

    lastMsgLatency: bigint
    cumMsgLatency: bigint

    publicName: string
    
    isLeader: boolean
    
    // ... 省略了一些
}

interface DdbLicense {
    authorization: string
    licenseType: number
    maxMemoryPerNode: number
    maxCoresPerNode: number
    clientName: string
    bindCPU: boolean
    expiration: number
    maxNodes: number
    version: string
    modules: bigint
}

export interface DdbJob {
    startTime?: bigint
    endTime?: bigint
    errorMsg?: string
    
    jobId?: string
    rootJobId?: string
    
    jobDesc?: string
    desc?: string
    
    jobType?: string
    
    priority?: number
    parallelism?: number
    
    node?: string
    
    userId?: string
    userID?: string
    
    receiveTime?: bigint
    receivedTime?: bigint
    
    sessionId?: string
    
    remoteIP?: Uint8Array
    
    remotePort?: number
    
    totalTasks?: number
    
    finishedTasks?: number
    
    runningTask?: number
    
    // --- computed (getRecentJobs)
    status?: 'queuing' | 'failed' | 'running' | 'completed'
    theme?: BaseType
    
    // --- computed (getConsoleJobs)
    progress?: string
}


enum DdbNodeState {
    online = 1,
    offline = 0,
}


export let model = window.model = new DdbModel()
