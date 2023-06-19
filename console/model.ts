import dayjs from 'dayjs'

import { Model } from 'react-object-model'

import { Modal } from 'antd'
import type { BaseType } from 'antd/es/typography/Base/index.js'

import { DDB, DdbFunctionType, DdbVectorString, DdbObj, DdbInt, DdbLong, type InspectOptions, DdbDatabaseError, DdbStringObj, type DdbDictObj, type DdbVectorStringObj } from 'dolphindb/browser.js'

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
    
    /** 通过 ticket 或用户名密码自动登录，默认为 true 传 autologin=0 关闭 */
    autologin = true
    
    /** 通过 cdn 访问的 web */
    cdn = false
    
    /** 启用详细日志，包括执行的代码和运行代码返回的变量 */
    verbose = false
    
    ddb: DDB
    
    collapsed = localStorage.getItem(storage_keys.collapsed) === 'true'
    
    view = '' as PageViews
    
    /** 重定向 view */
    redirection?: PageViews
    
    logined = false
    
    username: string = username_guest
    
    node_type: NodeType
    
    node_alias: string
    
    login_required = false
    
    
    /** 通过 getControllerAlias 得到 */
    controller_alias: string
    
    
    // --- 通过 getClusterPerf 拿到的集群节点信息
    nodes: DdbNode[]
    
    node: DdbNode
    
    /** 控制节点 */
    controller: DdbNode
    
    /** 通过 getClusterPerf 取集群中的某个数据节点，方便后续 rpc 到数据节点执行操作 */
    datanode: DdbNode
    // --- 
    
    version: string
    
    license: DdbLicense
    
    license_server?: DdbLicenseServer
    
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
        this.autologin = params.get('autologin') !== '0'
        this.cdn = location.hostname === 'cdn.dolphindb.cn' || params.get('cdn') === '1'
        this.verbose = params.get('verbose') === '1'
        
        const port = params.get('port') || (this.dev ? '8848' : location.port)
        
        this.ddb = new DDB(
            (this.dev ? (params.get('tls') === '1' ? 'wss' : 'ws') : (location.protocol === 'https:' ? 'wss' : 'ws')) +
                '://' +
                (params.get('hostname') || (this.dev ? '127.0.0.1' : location.hostname)) +
                
                // 一般 location.port 可能是空字符串
                (port ? `:${port}` : '') +
                
                // 检测 ddb 是否通过 nginx 代理，部署在子路径下
                (location.pathname === '/dolphindb/' ? '/dolphindb/' : ''),
            {
                autologin: false,
                verbose: this.verbose
            }
        )
        
        this.header = params.get('header') !== '0'
        this.code_template = params.get('code-template') === '1'
        this.redirection = params.get('redirection') as PageViews
    }
    
    
    async init () {
        console.log(t('web 开始初始化，当前处于{{mode}}模式，构建时间是 {{time}}', {
            mode: this.dev ? t('开发') : t('生产'),
            time: BUILD_TIME
        }))
        
        
        await Promise.all([
            this.get_node_type(),
            this.get_node_alias(),
            this.get_controller_alias(),
            this.get_login_required()
        ])
        
        if (this.autologin)
            try {
                await this.login_by_ticket()
            } catch {
                console.log(t('ticket 登录失败'))
                
                if (this.dev) 
                    try {
                        await this.login_by_password('admin', '123456')
                    } catch {
                        console.log(t('使用 admin 账号密码登录失败'))
                    }
                
            }
        
        await this.get_cluster_perf()
        
        await this.check_leader_and_redirect()
        
        console.log(t('web 初始化成功'))
        
        this.get_license_info()
        
        this.goto_default_view()
        
        if (this.login_required && !this.logined)
            this.goto_login()
        
        this.set({ inited: true })
        
        this.get_version()
    }
    
    
    
    async login_by_password (username: string, password: string) {
        this.ddb.username = username
        this.ddb.password = password
        await this.ddb.call('login', [username, password], { urgent: true })
        
        const ticket = (
            await this.ddb.call<DdbObj<string>>('getAuthenticatedUserTicket', [ ], {
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
        if (!ticket)
            throw new Error(t('没有自动登录的 ticket'))
        
        const last_username = localStorage.getItem(storage_keys.username)
        if (!last_username)
            throw new Error(t('没有自动登录的 username'))
        
        try {
            await this.ddb.call('authenticateByTicket', [ticket], { urgent: true })
            this.set({ logined: true, username: last_username })
            console.log(t('{{username}} 使用 ticket 登陆成功', { username: last_username }))
        } catch (error) {
            localStorage.removeItem(storage_keys.ticket)
            localStorage.removeItem(storage_keys.username)
            throw error
        }
    }
    
    
    /** 验证成功时返回用户信息；验证失败时跳转到单点登录页 */
    async login_by_session (session: string) {
        // https://dolphindb1.atlassian.net/browse/DPLG-581
        
        await this.ddb.call('login', ['guest', '123456'])
        
        const result = (
            await this.ddb.call('authenticateBySession', [session])
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
        
        this.ddb.call('logout', [ ], { urgent: true })
        
        this.set({
            logined: false,
            username: username_guest,
        })
        this.goto_login()
    }
    
    async start_nodes (nodes) {
        const checked = nodes.map(node => node.name)
        await this.ddb.call('startDataNode', [new DdbVectorString(checked)])
    }
    
    
    async stop_nodes (nodes) {
        const checked = nodes.map(node => node.name)
        await this.ddb.call('stopDataNode', [new DdbVectorString(checked)])
    }
    
    async get_node_type () {
        const { value: node_type } = await this.ddb.call<DdbObj<NodeType>>('getNodeType', [ ], { urgent: true })
        this.set({ node_type })
        console.log(t('节点类型:'), NodeType[node_type])
        return node_type
    }
    
    
    async get_node_alias () {
        const { value: node_alias } = await this.ddb.call<DdbObj<string>>('getNodeAlias', [ ], { urgent: true })
        this.set({ node_alias })
        console.log(t('节点名称:'), node_alias)
        return node_alias
    }
    
    
    async get_controller_alias () {
        const { value: controller_alias } = await this.ddb.call<DdbObj<string>>('getControllerAlias', [ ], { urgent: true })
        this.set({ controller_alias })
        console.log(t('控制节点:'), controller_alias)
        return controller_alias
    }
    
    
    async get_login_required () {
        const { value } = await this.ddb.call<DdbStringObj>('getConfig', ['webLoginRequired'], { urgent: true })
        const login_required = value === '1' || value === 'true'
        this.set({ login_required })
        // 开发用 this.set({ login_required: true })
        console.log(t('web 强制登录:'), login_required)
        return login_required
    }
    
    
    async get_version () {
        let { value: version } = await this.ddb.call<DdbObj<string>>('version')
        version = version.split(' ')[0]
        this.set({ version })
        console.log(t('版本:'), version)
        return version
    }
    
    
    /** 获取 license 相关信息 */
    async get_license_info () {
        const license = await this.get_license_self_info()
        
        this.check_license_expiration()
        
        if (license.licenseType === LicenseTypes.LicenseServerVerify)
            await this.get_license_server_info()
    }
    
    
    check_license_expiration () {
        const license = this.license
        
        // license.expiration 是以 date 为单位的数字
        const expiration_date = dayjs(license.expiration * 86400000)
        const now = dayjs()
        const after_two_week = now.add(2, 'week')
        const is_license_expired = now.isAfter(expiration_date, 'day')
        const is_license_expire_soon = after_two_week.isAfter(expiration_date, 'day')
        
        if (is_license_expired)
            Modal.error({
                title: t('License 过期提醒'),
                content: t('DolphinDB License 已过期，请联系管理人员立即更新，避免数据库关闭'),
                width: 600,
            })
         else if (is_license_expire_soon)
             Modal.warning({
                title: t('License 过期提醒'),
                content: t('DolphinDB License 将在两周内过期，请提醒管理人员及时更新，避免数据库过期后自动关闭'),
                width: 700,
            })
    }
    
    
    /** 获取节点的 license 信息 */
    async get_license_self_info () {
        const license = (
            await this.ddb.call<DdbObj<DdbObj[]>>('license')
        ).to_dict<DdbLicense>({ strip: true })
        
        console.log('license:', license)
        this.set({ license })
        return license
    }
    
    
    /** 如果节点是 license server, 获取 license server 相关信息 */
    async get_license_server_info () {
        const license_server_site = (
            await this.ddb.call<DdbStringObj>('getConfig', ['licenseServerSite'])
        ).value
        
        const is_license_server_node = this.license.licenseType === LicenseTypes.LicenseServerVerify && license_server_site === this.node.site
        
        const license_server_resource = is_license_server_node 
            ? (await this.ddb.call<DdbDictObj<DdbVectorStringObj>>('getLicenseServerResourceInfo')).to_dict<DdbLicenseServerResource>({ strip: true }) 
            : null
        
        this.set({ 
            license_server: {
                is_license_server_node,
                site: license_server_site,
                resource: license_server_resource
            }
        })
    }
    
    
    /** 去登录页
        @param redirection 设置登录完成后的回跳页面，默认取当前 view */
    goto_login (redirection: PageViews = this.view) {
        this.set({
            view: 'login',
            ... redirection === 'login' ? { } : { redirection }
        })
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
            await this.ddb.call<DdbObj<DdbObj[]>>('getClusterPerf', [true], {
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
        
        let node: DdbNode, controller: DdbNode, datanode: DdbNode
        
        for (const _node of nodes) {
            if (_node.name === this.node_alias)
                node = _node
            
            if (_node.mode === NodeType.controller)
                if (_node.isLeader)
                    controller = _node
                else
                    controller ??= _node
            
            if (_node.mode === NodeType.data)
                datanode ??= _node
        }
        
        console.log(t('当前节点:'), node)
        if (node.mode !== NodeType.single)
            console.log(t('控制节点:'), controller, t('数据节点:'), datanode)
        
        this.set({ nodes, node, controller, datanode })
    }
      
    find_closest_node_host (node: DdbNode) {
        const ip_pattern = /\d+\.\d+\.\d+\.\d+/
        
        const params = new URLSearchParams(location.search)
        const current_connect_host = params.get('hostname') || location.hostname
        const current_connect_host_parts = ip_pattern.test(current_connect_host) 
            ? current_connect_host.split('.') 
            : current_connect_host.split('.').reverse()
        
        const hosts = [...node.publicName.split(';').map(name => name.trim()), node.host]
        
        const calc_host_score = (hostname: string) => {
            const compare_host_parts = ip_pattern.test(hostname) 
                ? hostname.split('.') 
                : hostname.split('.').reverse()
            const score = compare_host_parts.reduce((total_score, part, i) => {
                const part_score = part === current_connect_host_parts[i] 
                    ? 2 << (compare_host_parts.length - i) 
                    : 0
                return total_score + part_score
            }, 0)
            
            return score
        }
        
        const [closest] = hosts.slice(1).reduce<readonly [string, number]>((prev, hostname) => {
            if (hostname === current_connect_host)
                return [hostname, Infinity]
            
            const [_, closest_score] = prev
            const score = calc_host_score(hostname)
            if (score > closest_score)
                return [hostname, score]
            
            return prev
        }, [hosts[0], calc_host_score(hosts[0])] as const)
        
        return closest
    }
    
    
    async check_leader_and_redirect () {
        if (this.node.mode === NodeType.controller && 'isLeader' in this.node && this.node.isLeader === false) {
            const leader = this.nodes.find(node => node.isLeader)
            
            if (leader) {
                const host = this.find_closest_node_host(leader)
                alert(
                    t('您访问的这个控制节点现在不是高可用 (raft) 集群的 leader 节点, 将会为您自动跳转到集群当前的 leader 节点: ') + 
                    `${host}:${leader.port}`
                )
                this.navigate_to(host, leader.port, { keep_current_query: true })
            }
        }
    }
    
    
    async get_console_jobs () {
        return this.ddb.call<DdbObj<DdbObj[]>>('getConsoleJobs', [ ], {
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
        return this.ddb.call<DdbObj<DdbObj[]>>('getRecentJobs', [ ], {
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
        return this.ddb.call<DdbObj<DdbObj[]>>('getScheduledJobs', [ ], {
            urgent: true,
            nodes: this.node_type === NodeType.controller ? 
                this.nodes.filter(node => node.state === DdbNodeState.online && node.mode !== NodeType.agent)
                    .map(node => node.name)
                :
                    null
        })
    }
    
    
    async cancel_console_job (job: DdbJob) {
        return this.ddb.call('cancelConsoleJob', [job.rootJobId], { urgent: true })
    }
    
    
    async cancel_job (job: DdbJob) {
        return this.ddb.call('cancelJob', [job.jobId], {
            urgent: true,
            ... (!job.node || this.node_alias === job.node) ? { } : { node: job.node, func_type: DdbFunctionType.SystemProc }
        })
    }
    
    
    async delete_scheduled_job (job: DdbJob) {
        return this.ddb.call('deleteScheduledJob', [job.jobId], {
            urgent: true,
            ... (!job.node || this.node_alias === job.node) ? { } : { node: job.node, func_type: DdbFunctionType.SystemProc }
        })
    }
    
    
    async get_server_log_length () {
        let length: bigint
        
        if (this.node_type === NodeType.data || this.node_type === NodeType.computing) {
            if (this.first_get_server_log_length) {
                await this.ddb.eval(
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
            ;({ value: length } = await this.ddb.call<DdbObj<bigint>>(
                'get_server_log_length_by_agent',
                [host, new DdbInt(Number(port)), this.node_alias]
            ))
        } else
            ({ value: length } = await this.ddb.call<DdbObj<bigint>>('getServerLogLength', [this.node_alias]))
        
        console.log('get_server_log_length', length)
        
        return length
    }
    
    
    async get_server_log (offset: bigint, length: bigint) {
        let logs: string[]
        
        if (this.node_type === NodeType.data || this.node_type === NodeType.computing) {
            if (this.first_get_server_log) {
                await this.ddb.eval(
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
            
            ;({ value: logs } = await this.ddb.call<DdbObj<string[]>>(
                'get_server_log_by_agent',
                [host, new DdbInt(Number(port)), new DdbLong(length), new DdbLong(offset), this.node_alias]
            ))
        } else
            ({ value: logs } = await this.ddb.call<DdbObj<string[]>>(
                'getServerLog',
                [new DdbLong(length), new DdbLong(offset), true, this.node_alias]
            ))
        
        logs.reverse()
        
        console.log('get_server_log', offset, length, logs.length)
        
        return logs
    }
    
    
    show_error ({ error, title, content }: { error?: Error, title?: string, content?: string }) {
        console.log(error)
        
        Modal.error({
            className: 'modal-error',
            title: title || error?.message,
            content: (() => {
                if (content)
                    return content
                    
                if (error) {
                    let s = ''
                    
                    if (error instanceof DdbDatabaseError) {
                        const { type, options } = error
                        switch (type) {
                            case 'script':
                                s += t('运行以下脚本时出错:\n') +
                                    error.options.script + '\n'
                                break
                            
                            case 'function':
                                s += t('调用 {{func}} 函数时出错，参数为:\n', { func: error.options.func }) +
                                    options.args.map(arg => arg.toString())
                                        .join_lines()
                                break
                        }
                    }
                    
                    s += t('调用栈:\n') +
                        error.stack
                    
                    if (error.cause)
                        s += '\n' + (error.cause as Error).stack
                    
                    return s
                }
            })(),
            width: 1000,
        })
    }
    
    
    navigate_to_node (node: DdbNode, options?: NavigateToOptions) {
        this.navigate_to(node.publicName || node.host, node.port, options)
    }
    
    
    navigate_to (
        hostname: string,
        port: string | number,
        options: NavigateToOptions = { }
    ) {
        const {
            pathname = location.pathname,
            query: extra_query,
            keep_current_query = false,
            open = false
        } = options
        
        const current_params = new URLSearchParams(location.search)
        const is_query_params_mode = current_params.get('hostname') || current_params.get('port')
        console.log('is_query_params_mode', is_query_params_mode)
        const new_params = new URLSearchParams(extra_query)
        
        if (keep_current_query) 
            current_params.forEach((v, key) => {
                !new_params.has(key) && new_params.set(key, v)
            })
            
        
        if (is_query_params_mode) {
            new_params.set('hostname', hostname)
            new_params.set('port', port.toString())
        }
        
        const url_hostname = is_query_params_mode ? location.hostname : hostname
        const url_port = is_query_params_mode ? location.port : port
        const url = `${location.protocol}//${url_hostname}:${url_port}${pathname}?${new_params.toString()}`
        
        if (open) 
            window.open(url, '_blank')
         else
            location.href = url
    }
}


export enum NodeType {
    data = 0,
    agent = 1,
    controller = 2,
    single = 3,
    computing = 4,
}


export interface DdbNode {
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
    
    // 下面这些统计时间都不准确，和 timer 结果不一致，不要使用
    // ex1 = table(rand(1.0000,10000000) as c1)
    // timer select count(*) from ex1 where c1 > 0.5 and c1 <=0.8
    // 执行十次后，实际执行时间和返回的不一致
    // 目前发现这两种不会统计
    // 1. 不含 join 的内存表查询
    // 2. SINGLE 模式，使用 snapshot 的查询
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

export enum LicenseTypes {
    /** 其他方式 */
    Other = 0,
    /** 机器指纹绑定 */
    MachineFingerprintBind = 1,
    /** 在线验证 */
    OnlineVerify = 2,
    /** LicenseServer 验证 */
    LicenseServerVerify = 3,
}

export interface DdbLicense {
    authorization: string
    licenseType: LicenseTypes
    maxMemoryPerNode: number
    maxCoresPerNode: number
    clientName: string
    bindCPU: boolean
    expiration: number
    maxNodes: number
    version: string
    modules: bigint
}

export interface DdbLicenseServerResource {
    availableCores: number
    availableMemory: number
    maxCores: number
    maxNodes: number
    maxMemory: number
    expiration: number
}

export interface DdbLicenseServer {
    site: string
    is_license_server_node: boolean
    resource: DdbLicenseServerResource | null
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


export enum DdbNodeState {
    online = 1,
    offline = 0,
}


interface NavigateToOptions {
    pathname?: string
    query?: ConstructorParameters<typeof URLSearchParams>[0]
    keep_current_query?: boolean
    open?: boolean
}


export let model = window.model = new DdbModel()
