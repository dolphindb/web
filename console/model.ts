import dayjs from 'dayjs'

import { Model } from 'react-object-model'
import { satisfies } from 'compare-versions'

import type { BaseType } from 'antd/es/typography/Base/index.js'
import type { MessageInstance } from 'antd/es/message/interface.js'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm.js'
import type { NotificationInstance } from 'antd/es/notification/interface.js'

import { strcmp } from 'xshell/utils.browser.js'
import { request } from 'xshell/net.browser.js'

import {
    DDB, SqlStandard, DdbFunctionType, DdbVectorString, type DdbObj, DdbInt, DdbLong, type InspectOptions,
    DdbDatabaseError, type DdbStringObj, type DdbDictObj, type DdbVectorStringObj
} from 'dolphindb/browser.js'

import { language, t } from '../i18n/index.js'

import type { FormatErrorOptions } from './components/GlobalErrorBoundary.js'


export const storage_keys = {
    ticket: 'ddb.ticket',
    username: 'ddb.username',
    session_id: 'ddb.session_id',
    collapsed: 'ddb.collapsed',
    code: 'ddb.code',
    token: 'ddb.token',
    refresh_token: 'ddb.refresh_token',
    minimap: 'ddb.editor.minimap',
    enter_completion: 'ddb.editor.enter_completion',
    sql: 'ddb.sql',
    dashboards: 'ddb.dashboards'
} as const

const login_info = {
    domin: 'https://login.sufe.edu.cn/esc-sso/oauth2.0',
    client_id: '0835ce6ea9ad4ccb',
    client_secret: '66f23a0304134ea6a165e4434c96ffdc',
    redirect_uri: encodeURI('http://10.2.47.64:22212/')
} as const

const json_error_pattern = /^{.*"code": "(.*?)".*}$/

const username_guest = 'guest' as const

export type PageViews = 'overview' | 'overview-old' | 'shell' | 'dashboard' | 'table' | 'job' | 'login' | 'dfs' | 'log' | 'factor' | 'test' | 'computing' | 'tools' | 'iot-guide' | 'finance-guide' | 'access' | 'user' | 'group' | 'config'


export class DdbModel extends Model<DdbModel> {
    inited = false
    
    /** 在本地开发模式 */
    dev = false
    
    /** 通过 test.dolphindb.cn 访问的 web */
    test = false
    
    /** 启用详细日志，包括执行的代码和运行代码返回的变量 */
    verbose = false
    
    /** 是否启用了因子平台功能 */
    is_factor_platform_enabled = false
    
    ddb: DDB
    
    collapsed = localStorage.getItem(storage_keys.collapsed) === 'true'
    
    sql: SqlStandard = SqlStandard[localStorage.getItem(storage_keys.sql)] || SqlStandard.DolphinDB
    
    view = '' as PageViews
    
    /** 重定向 view */
    redirection?: PageViews
    
    logined = false
    
    username: string = username_guest
    
    admin = false
    
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
    
    is_v1: boolean
    
    is_v2: boolean
    
    is_v3: boolean
    
    license: DdbLicense
    
    license_server?: DdbLicenseServer
    
    first_get_server_log_length = true
    
    first_get_server_log = true
    
    options?: InspectOptions
    
    /** 是否显示顶部导航栏，传 header=0 时隐藏，便于嵌入 web 页面 */
    header: boolean
    
    /** 是否显示侧边栏, 传 sider=0 时隐藏 */
    sider: boolean
    
    /** 是否在代码为空时设置代码模板 */
    code_template: boolean
    
    
    message: MessageInstance
    
    modal: Omit<ModalStaticFunctions, 'warn'>
    
    notification: NotificationInstance
    
     /** 自动退出的时长 */
    timeout: number
    
     /** 自动退出的计时器 */
    timer = null
    
    
    constructor () {
        super()
        
        const params = new URLSearchParams(location.search)
        
        this.dev = params.get('dev') !== '0' && location.pathname.endsWith('/console/') || params.get('dev') === '1'
        this.test = location.hostname === 'test.dolphindb.cn' || params.get('test') === '1'
        this.verbose = params.get('verbose') === '1'
        
        // test 或开发模式下，浏览器误跳转到 https 链接，自动跳转回 http
        if (location.protocol === 'https:' && (this.dev || this.test) && params.get('https') !== '1') {
            alert('请将地址栏中的链接改为 http:// 开头')
            return
        }
        
        const port = params.get('port') || location.port
        
        this.ddb = new DDB(
            (this.dev ? (params.get('tls') === '1' ? 'wss' : 'ws') : (location.protocol === 'https:' ? 'wss' : 'ws')) +
                '://' +
                (params.get('hostname') || location.hostname) +
                
                // 一般 location.port 可能是空字符串
                (port ? `:${port}` : '') +
                
                // 检测 ddb 是否通过 nginx 代理，部署在子路径下
                (location.pathname === '/dolphindb/' ? '/dolphindb/' : ''),
            {
                autologin: false,
                verbose: this.verbose,
                sql: this.sql
            }
        )
        
        const view = params.get('view')
        const dashboard = params.get('dashboard')
        
        this.header = params.get('header') !== '0' && (view !== 'dashboard' || !dashboard)
        this.sider = params.get('sider') !== '0' && (view !== 'dashboard' || !dashboard)
        this.code_template = params.get('code-template') === '1'
        this.redirection = params.get('redirection') as PageViews
    }
    
    
    async init () {
        console.log(t('web 开始初始化，当前处于{{mode}}模式，版本为 {{version}}', {
            mode: this.dev ? t('开发') : t('生产'),
            version: WEB_VERSION
        }))
        
        
        await Promise.all([
            this.get_node_type(),
            this.get_node_alias(),
            this.get_controller_alias(),
            this.get_login_required()
        ])
        
        try {
            let url = new URL(location.href)
            let { searchParams } = url
            const token_code = searchParams.get('code')
            const token = localStorage.getItem(storage_keys.token)
            const refresh_token = localStorage.getItem(storage_keys.refresh_token)
            const { domin, client_id, client_secret, redirect_uri } = login_info
            ;((await this.ddb.call<DdbVectorString>(
                'loadClusterNodesConfigs', 
                    [ ], 
                    { ... this.node_type === NodeType.controller || this.node_type === NodeType.single ? { } : { node: this.controller_alias, func_type: DdbFunctionType.SystemFunc } }
            )).value).forEach(item => {
                const [key, value] = item.split('=')
                if (key === 'webLogoutTimeout')
                    this.timeout = Number(value)
            })
            
            if (token && refresh_token) 
                await this.login_by_token(token, refresh_token)
            else if (token_code) {
                searchParams.delete('code')
                history.replaceState(null, '', url.toString())
                
                const { access_token: token, refresh_token } = await (
                    await fetch(
                        new URL(`${domin}/accessToken?` + new URLSearchParams({
                            grant_type: 'authorization_code',
                            client_id,
                            client_secret,
                            code: token_code,
                            response_type: 'code',
                            redirect_uri,
                            oauth_timestamp: new Date().getTime().toString(),
                        })).toString(),
                        { method: 'post' }
                )).json()
                
                localStorage.setItem(storage_keys.token, token)
                localStorage.setItem(storage_keys.refresh_token, refresh_token)
                
                await this.login_by_token(token, refresh_token)
            }
        } catch (error) {
            model.message.error('单点登录失败，请重试')
        }
        
        await this.get_cluster_perf(true)
        
        await Promise.all([
            this.check_leader_and_redirect(),
            this.get_factor_platform_enabled(),
        ])
        
        console.log(t('web 初始化成功'))
        
        this.get_license_info()
        
        this.goto_default_view()
        
        if (this.login_required && !this.logined)
            this.goto_login()
        
        this.set({ inited: true })
        
        this.get_version()
    }
    
    
    /** 设置 url 上的 query 参数
        - key: 参数名
        - value: 参数值，为 null 或 undefined 时删除该参数 */
    set_query (key: string, value: string | null) {
        let url = new URL(location.href)
        
        if (value === null || value === undefined)
            url.searchParams.delete(key)
        else
            url.searchParams.set(key, value)
        
        history.replaceState(null, '', url)
    }
    
    
    show_error (options: FormatErrorOptions) {
        show_error(this.modal, options)
    }
    
    
    goto_sufe_login () {
        const { domin, client_id, redirect_uri } = login_info
        localStorage.removeItem(storage_keys.token)
        localStorage.removeItem(storage_keys.refresh_token)
        location.assign(new URL(`${domin}/authorize?` + new URLSearchParams({
            client_id,
            response_type: 'code',
            redirect_uri,
            oauth_timestamp: new Date().getTime().toString(),
        })).toString())
    }
        
    
    /** SUFE 单点登录 */
    async login_by_token (token: string, refresh_token: string) {
        await this.ddb.call('login', [token, refresh_token])
        const { username, refresh_token: _refresh_token, token: _token } = JSON.parse((await this.ddb.eval(`
            name = exec name from rpc(getControllerAlias(), getClusterPerf) where state = 1 limit 1
            def runFunc(funcName){
                return funcByName(funcName).call();
            }
            rpc(name[0], runFunc, "getUserLoginInfo")`
        )).value as string)
        
        localStorage.setItem(storage_keys.token, _token)
        localStorage.setItem(storage_keys.refresh_token, _refresh_token)
        
        this.set({ logined: true, username })
        await this.is_admin()
        this.start_timer()
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
        
        await this.is_admin()
        
        console.log(t('{{username}} 使用账号密码登陆成功', { username: this.username }))
    }
        
    
    async logout () {
        localStorage.removeItem(storage_keys.ticket)
        localStorage.removeItem(storage_keys.username)
        localStorage.removeItem(storage_keys.token)
        localStorage.removeItem(storage_keys.refresh_token)
        localStorage.setItem(storage_keys.session_id, '0')
        
        await this.ddb.call('logout', [ ], { urgent: true })
        
        clearTimeout(this.timer)
        
        this.set({
            logined: false,
            username: username_guest,
            admin: false,
            timer: null
        })
        location.assign('https://login.sufe.edu.cn/esc-sso/logout')
    }
    
    
    start_timer () {
        if (this.timeout)
            this.set({ timer: setTimeout(() => { this.logout() }, this.timeout * 60 * 1000) })
    }
    
    
    reset_timer () {
        clearTimeout(this.timer)
        this.start_timer()
    }
    
    
    async is_admin () {
        if (this.node_type !== NodeType.computing)
            this.set({ admin: (await this.ddb.call<DdbObj<DdbObj[]>>('getUserAccess', [ ], { urgent: true })).to_rows()[0].isAdmin })
    }
    
    
    /** 获取是否启用因子平台，待 server 实现 */
    async get_factor_platform_enabled () {
        try {
            const { value } = await this.ddb.eval<DdbObj<boolean>>(
                'use factorPlatform::facplf\n' +
                'factorPlatform::facplf::is_factor_platform_enabled()\n'
                , { urgent: true })
            this.set({ is_factor_platform_enabled: value })
            return value
        } catch { }
    }
    
    
    async start_nodes (nodes: DdbNode[]) {
        await this.ddb.call('startDataNode', [new DdbVectorString(nodes.map(node => node.name))], {
            node: this.controller_alias, 
            func_type: DdbFunctionType.SystemProc
        })
    }
    
    
    async stop_nodes (nodes: DdbNode[]) {
        await this.ddb.call('stopDataNode', [new DdbVectorString(nodes.map(node => node.name))], {
            node: this.controller_alias, 
            func_type: DdbFunctionType.SystemProc
        })
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
        this.set({ 
            version,
            is_v1: satisfies(version, '^1'),
            is_v2: satisfies(version, '^2'),
            is_v3: satisfies(version, '^3')
        })
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
            this.modal.error({
                title: t('License 过期提醒'),
                content: t('DolphinDB License 已过期，请联系管理人员立即更新，避免数据库关闭'),
                width: 600,
            })
         else if (is_license_expire_soon)
             this.modal.warning({
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
                (this.node_type === NodeType.controller ? 
                    (this.dev || this.test ? 'overview' : 'overview-old')
                :
                    'shell')
        })
    }
    
    
    /** 获取 nodes 和 node 信息
        https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/g/getClusterPerf.html  
        Only master or single mode supports function getClusterPerf. */
    async get_cluster_perf (print: boolean) {
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
        .sort((a, b) => strcmp(a.name, b.name))
        
        if (print)
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
        if (print) {
            console.log(t('当前节点:'), node)
            if (node.mode !== NodeType.single)
                console.log(t('控制节点:'), controller, t('数据节点:'), datanode)
        }
        
        this.set({ nodes, node, controller, datanode })
    }
    
    
    /** 判断当前集群是否有数据节点或计算节点正在运行 */
    has_data_and_computing_nodes_alive () {
        return Boolean(
            this.nodes.find(node =>
                (node.mode === NodeType.data || node.mode === NodeType.computing) && 
                node.state === DdbNodeState.online)
        )
    }
    
    
    find_closest_node_host (node: DdbNode) {
        const params = new URLSearchParams(location.search)
        const current_connect_host = params.get('hostname') || location.hostname
        
        const hosts = [...node.publicName.split(';').map(name => name.trim()), node.host]
        
        // 匹配当前域名/IP 和 hosts 中域名/IP 的相似度，动态规划最长公共子串
        function calc_host_score (hostname: string) {
            let maxlen = 0 // 最长公共子串的长度
            // 初始化 dp 数组
            let dp: number[][] = new Array(hostname.length + 1)
            for (let i = 0;  i < hostname.length + 1;  i++) 
                dp[i] = new Array(current_connect_host.length + 1).fill(0)
            
            for (let i = 1;  i <= hostname.length;  i++) 
                for (let j = 1;  j <= current_connect_host.length;  j++)
                    if (hostname[i - 1] === current_connect_host[j - 1]) {
                        dp[i][j] = dp[i - 1][j - 1] + 1 // 如果字符相同，则在前一个基础上加1
                        if (dp[i][j] > maxlen)
                            maxlen = dp[i][j] // 更新最长公共子串的长度
                    } else
                        dp[i][j] = 0 // 如果字符不相同，则重置为0
            
            return maxlen
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
    
    
    async recompile_and_refresh () {
        await request('http://localhost:8432/api/recompile')
        location.reload()
    }
    
    
    format_error (error: Error) {
        let s = ''
        
        if (error instanceof DdbDatabaseError) {
            const { type, options, message } = error
            
            // json 错误是可以预期的业务逻辑错误，不需要显示后面的脚本、参数和调用栈了
            if (message.includes(' => {"')) {
                const i_arrow = message.lastIndexOf('=>')
                const i_message_start = i_arrow === -1 ? 0 : i_arrow + 3
                
                const matches = json_error_pattern.exec(message.slice(i_message_start))
                
                if (matches) {
                    const { code, variables } = JSON.parse(matches[0])
                    
                    return {
                        title: t(error_messages[code], { variables }),
                        body: ''
                    }
                }
            }
            
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
        
        return {
            title: error.message,
            body: s
        }
    }
    
    
    get_error_code_doc_link (ref_id: string) {
        return language === 'en'
            ? `https://docs.dolphindb.com/en/Maintenance/ErrorCodeReference/${ref_id}.html`
            : `https://docs.dolphindb.cn/zh/error_codes/${ref_id}.html`
    }
}


if (!Array.prototype.toReversed)
    Object.defineProperty(Array.prototype, 'toReversed', {
        configurable: true,
        writable: true,
        enumerable: false,
        value: function toReversed (this: Array<any>) {
            return [...this].reverse()
        }
    })

if (!Array.prototype.toSpliced)
    Object.defineProperty(Array.prototype, 'toSpliced', {
        configurable: true,
        writable: true,
        enumerable: false,
        value: function toSpliced (...args: [start: number, deleteCount?: number, ...items: any[]]) {
            const copy = [...this]
            copy.splice(...args)
            return copy
        }
    })

if (!Array.prototype.at)
    Object.defineProperty(Array.prototype, 'at', {
        configurable: true,
        writable: true,
        enumerable: false,
        value: function at (index: number) {
            return index >= 0 ? this[index] : this[index + this.length]
        }
    })



export enum NodeType {
    data = 0,
    agent = 1,
    controller = 2,
    single = 3,
    computing = 4,
}


export function show_error (modal: DdbModel['modal'], { title, error, body }: FormatErrorOptions) {
    let title_: string, body_: string
    
    if (error)
        ({ title: title_, body: body_ } = model.format_error(error))
    
    modal.error({
        className: 'modal-error',
        title: title || title_,
        content: (body || body === '') ? body : body_,
        width: 1000,
    })
}


const error_messages = {
    S001: '当前配置不存在',
    S002: '配置id重复，无法保存',
    S003: '当前配置与已有配置重名，请改名',
    S004: '命名不可为空',
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
    /** @deprecated server 2.00.10 后没有 local executor，此项一直为零 */
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
