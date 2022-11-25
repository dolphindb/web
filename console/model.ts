import type { BaseType } from 'antd/lib/typography/Base/index.js'

import { Model } from 'react-object-model'

import { ddb, DdbFunctionType, DdbObj, DdbInt, DdbLong, type InspectOptions } from 'dolphindb/browser.js'

import { t } from '../i18n/index.js'

export const storage_keys = {
    ticket: 'ddb.ticket',
    username: 'ddb.username',
    session_id: 'ddb.session_id',
    collapsed: 'ddb.collapsed',
    code: 'ddb.code',
    session: 'ddb.session',
} as const

const username_guest = 'guest' as const

export class DdbModel extends Model<DdbModel> {
    inited = false
    
    collapsed = localStorage.getItem(storage_keys.collapsed) === 'true'
    
    view = '' as 'overview' | 'shell' | 'dashboard' | 'table' | 'job' | 'cluster' | 'login' | 'dfs' | 'log'
    
    logined = false
    
    username = localStorage.getItem(storage_keys.username) || username_guest
    
    node_type: NodeType
    
    node_alias: string
    
    controller_alias: string
    
    nodes: DdbNode[]
    
    node: DdbNode
    
    version: string
    
    license: DdbLicense
    
    /** 是否为中信证券用户 */
    citic = false
    
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
        this.header = params.get('header') !== '0'
        this.code_template = params.get('code-template') === '1'
    }
    
    
    async init () {
        console.log(t('console 开始初始化'))
        
        let url = new URL(location.href)
        
        /** 检测 ddb 是否通过 nginx 代理，部署在子路径下 */
        const is_subpath = location.pathname === '/dolphindb/'
        if (is_subpath)
            ddb.url += 'dolphindb/'
        
        ddb.autologin = false
        
        const license = await this.get_license()
        
        const citic_param = url.searchParams.get('citic') === '1'
        this.set({ citic: license.clientName === 'CITIC Securities' || location.hostname.includes('citicsinfo') || location.hostname === '172.23.122.19' || citic_param })
        
        // 中心证券单点登录
        if (this.citic) {
            console.log(t('当前为中信证券的 web, 启用单点登录'))
            
            const session = url.searchParams.get('sessionData') || localStorage.getItem(storage_keys.session)
            if (session) {
                url.searchParams.delete('sessionData')
                history.replaceState(null, '', url.toString())
                await this.login_by_session(session)
            } else if (citic_param)
                this.set({ logined: true, username: '马世超' })
            else if (is_subpath) {
                console.log(t('没有 sessionData 参数，将会跳转到登录页'))
                location.pathname = '/'
                return
            } else
                console.log(t('通过非 /dolphindb/ 路径直接访问中信证券 web'))
        } else
            try {
                await this.login_by_ticket()
            } catch {
                console.log(t('ticket 登录失败'))
            }
        
        await Promise.all([
            this.get_node_type(),
            this.get_node_alias(),
            this.get_controller_alias(),
        ])
        
        ;(async () => {
            await this.get_cluster_perf()
            await this.check_leader_and_redirect()
        })()
        
        
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
            view: 'login',
        })
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
        
        const node = nodes.find(node => 
            node.name === this.node_alias)
        
        console.log(t('当前节点:'), node)
        
        this.set({
            nodes,
            node
        })
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
        
        if (this.node_type === NodeType.data_node) {
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
        
        if (this.node_type === NodeType.data_node) {
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
    status?: 'queuing' | 'error' | 'running' | 'completed'
    theme?: BaseType
    
    // --- computed (getConsoleJobs)
    progress?: string
}


enum DdbNodeState {
    online = 1,
    offline = 0,
}


export let model = window.model = new DdbModel()
