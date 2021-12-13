import Model from 'react-object-model'

import { ddb, DdbObj } from './ddb.browser'

const storage_keys = {
    ticket: 'ddb.ticket',
    username: 'ddb.username',
    session_id: 'ddb.session_id',
} as const

const username_guest = 'guest' as const

export class DdbModel extends Model <DdbModel> {
    inited = false
    
    view = '' as 'overview' | 'shell' | 'shellold' | 'table' | 'job' | 'cluster' | 'login' | 'dfs'
    
    logined = false
    
    username = localStorage.getItem(storage_keys.username) || username_guest
    
    node_type: NodeType
    
    nodes: DdbNode[]
    
    
    async init () {
        await ddb.connect()
        
        try {
            await model.login_by_ticket()
        } catch {
            console.log('ticket 登录失败')
        }
        
        await model.get_node_type()
        
        if (this.node_type === NodeType.controller)
            await this.get_cluster_perf()
        
        model.goto_default_view()
        
        this.set({
            inited: true
        })
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
        this.set({ node_type })
        console.log('node_type:', NodeType[node_type])
        return node_type
    }
    
    
    goto_default_view () {
        this.set({
            view: this.node_type === NodeType.controller ? 
                    'cluster'
                :
                    'shellold'
        })
    }
    
    
    /** https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/g/getClusterPerf.html */
    async get_cluster_perf () {
        this.nodes = (
            await ddb.call<DdbObj<DdbObj[]>>('getClusterPerf', [true], { urgent: true })
        ).to_rows<DdbNode>()
    }
    
    async get_console_jobs () {
        if (this.node_type === NodeType.controller) {
            const active_node_names = this.nodes.filter(node => 
                node.state === DdbNodeState.online && node.mode !== NodeType.agent
            ).map(node => 
                node.name
            )
            return ddb.eval<DdbObj<DdbObj[]>>(`pnodeRun(getConsoleJobs, ${JSON.stringify(active_node_names)})`, { urgent: true })
        }
        
        return ddb.call<DdbObj<DdbObj[]>>('getConsoleJobs', [ ], { urgent: true })
    }
    
    async get_recent_jobs () {
        if (this.node_type === NodeType.controller) {
            const active_node_names = this.nodes.filter(node => 
                node.state === DdbNodeState.online && node.mode !== NodeType.agent
            ).map(node => 
                node.name
            )
            return ddb.eval<DdbObj<DdbObj[]>>(`pnodeRun(getRecentJobs, ${JSON.stringify(active_node_names)})`, { urgent: true })
        }
        
        return ddb.call<DdbObj<DdbObj[]>>('getRecentJobs', [ ], { urgent: true })
    }
    
    async get_scheduled_jobs () {
        if (this.node_type === NodeType.controller) {
            const active_node_names = this.nodes.filter(node => 
                node.state === DdbNodeState.online && node.mode !== NodeType.agent
            ).map(node => 
                node.name
            )
            return ddb.eval<DdbObj<DdbObj[]>>(`pnodeRun(getScheduledJobs, ${JSON.stringify(active_node_names)})`, { urgent: true })
        }
        
        return ddb.call<DdbObj<DdbObj[]>>('getScheduledJobs', [ ], { urgent: true })
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
    
    cpuUsage: number
    avgLoad: number
    
    medLast10QueryTime: bigint
    publicName: string
    
    // ... 省略了一些
}


enum DdbNodeState {
    online = 1,
    offline = 0,
}


export let model = (window as any).model = new DdbModel()

export default model
