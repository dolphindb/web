import type { BaseType } from 'antd/lib/typography/Base/index.js'

import { Model } from 'react-object-model'

import { ddb, DdbFunctionType, DdbObj, DdbInt, DdbLong } from 'dolphindb/browser.js'

const storage_keys = {
    ticket: 'ddb.ticket',
    username: 'ddb.username',
    session_id: 'ddb.session_id',
} as const

const username_guest = 'guest' as const

export class DdbModel extends Model <DdbModel> {
    inited = false
    
    collapsed = false
    
    view = '' as 'overview' | 'shell' | 'shellold' | 'table' | 'job' | 'cluster' | 'login' | 'dfs' | 'log'
    
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
    
    
    async init () {
        await ddb.connect({ autologin: false })
        
        try {
            await this.login_by_ticket()
        } catch {
            console.log('ticket 登录失败')
        }
        
        await Promise.all([
            this.get_node_type(),
            this.get_node_alias(),
            this.get_controller_alias(),
        ])
        
        this.get_cluster_perf()
        
        this.goto_default_view()
        
        this.set({
            inited: true
        })
        
        this.get_version()
        
        this.get_license()
    }
    
    
    async login_by_password (username: string, password: string) {
        await ddb.call('login', [username, password], { urgent: true })
        
        let ticket: string
        
        if (this.node_type === NodeType.controller || this.node_type === NodeType.single)
            ticket = (
                await ddb.call<DdbObj<string>>('getAuthenticatedUserTicket', [ ], { urgent: true })
            ).value
        
        localStorage.setItem(storage_keys.username, username)
        
        if (ticket)
            localStorage.setItem(storage_keys.ticket, ticket)
        
        this.set({
            logined: true,
            username,
        })
        
        console.log(`${username} 使用账号密码登陆成功`)
    }
    
    
    async login_by_ticket () {
        const ticket = localStorage.getItem(storage_keys.ticket)
        if (!ticket) {
            this.set({
                logined: false,
                username: username_guest
            })
            
            throw new Error('no ticket to login')
        }
        
        try {
            await ddb.call('authenticateByTicket', [ticket], { urgent: true })
            this.set({
                logined: true
            })
            console.log(`${this.username} 使用 ticket 登陆成功`)
        } catch (error) {
            this.set({
                logined: false,
                username: username_guest
            })
            
            localStorage.removeItem(storage_keys.ticket)
            localStorage.removeItem(storage_keys.username)
            
            throw error
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
        console.log('node_type:', NodeType[node_type])
        return node_type
    }
    
    
    async get_node_alias () {
        const { value: node_alias } = await ddb.call<DdbObj<string>>('getNodeAlias', [ ], { urgent: true })
        this.set({
            node_alias
        })
        console.log('node_alias:', node_alias)
        return node_alias
    }
    
    async get_controller_alias () {
        const { value: controller_alias } = await ddb.call<DdbObj<string>>('getControllerAlias', [ ], { urgent: true })
        this.set({
            controller_alias
        })
        console.log('controller_alias:', controller_alias)
        return controller_alias
    }
    
    
    async get_version () {
        let { value: version } = await ddb.call<DdbObj<string>>('version', [ ])
        version = version.split(' ')[0]
        this.set({
            version
        })
        console.log('version:', version)
        return version
    }
    
    
    async get_license () {
        const license = (
            await ddb.call<DdbObj<DdbObj[]>>('license')
        ).to_dict<DdbLicense>({ strip: true })
        
        console.log('license:', license)
        this.set({
            license
        })
        return license
    }
    
    
    goto_default_view () {
        this.set({
            view: this.node_type === NodeType.controller ? 
                    'cluster'
                :
                    'shellold'
        })
    }
    
    
    /** https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/g/getClusterPerf.html  
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
        
        console.log('nodes:', nodes)
        
        const node = nodes.find(node => 
            node.name === this.node_alias)
        
        console.log('node:', node)
        
        this.set({
            nodes,
            node
        })
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
                    this.nodes.filter(node => 
                        node.state === DdbNodeState.online && node.mode !== NodeType.agent
                    ).map(node => 
                        node.name
                    )
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
    publicName: string
    
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
