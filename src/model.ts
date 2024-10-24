import { Model } from 'react-object-model'

import type { BaseType } from 'antd/es/typography/Base/index.d.ts'
import type { MessageInstance } from 'antd/es/message/interface.d.ts'
import type { HookAPI as ModalHookAPI } from 'antd/es/modal/useModal/index.d.ts'
import type { NotificationInstance } from 'antd/es/notification/interface.d.ts'

import type { NavigateFunction, NavigateOptions } from 'react-router-dom'

import 'xshell/polyfill.browser.js'
import { assert, filter_values, strcmp } from 'xshell/utils.browser.js'
import { request } from 'xshell/net.browser.js'

import {
    DDB, SqlStandard, DdbInt, DdbLong, type InspectOptions,
    DdbDatabaseError, type DdbObj, type DdbTableData,
} from 'dolphindb/browser.js'

import type { Docs } from 'dolphindb/docs.js'

import { language, t } from '@i18n/index.ts'

import type { FormatErrorOptions } from '@/components/GlobalErrorBoundary.tsx'
import { config } from '@/config/model.ts'
import { goto_url, strip_quotes } from '@/utils.ts'


export const storage_keys = {
    ticket: 'ddb.ticket',
    username: 'ddb.username',
    collapsed: 'ddb.collapsed',
    code: 'ddb.code',
    session: 'ddb.session',
    minimap: 'ddb.editor.minimap',
    enter_completion: 'ddb.editor.enter_completion',
    sql: 'ddb.sql',
    dashboard_autosave: 'ddb.dashboard.autosave',
    overview_display_mode: 'ddb.overview.display_mode',
    overview_display_columns: 'ddb.overview.display_columns',
    license_notified_date: 'ddb.license.notified_date',
} as const

const json_error_pattern = /^{.*"code": "(.*?)".*}$/

const username_guest = 'guest' as const

export type PageViews = 'overview' | 'shell' | 'dashboard' | 'table' | 'job' | 'plugins' | 'login' | 'dfs' | 'log' | 
    'factor' | 'test' | 'computing' | 'tools' | 'iot-guide' | 'finance-guide' | 'access' | 'user' | 'group' | 'config' |
    'settings' | 'data-connection' | 'parser-template' | 'data-collection'


type OAuthType = 'authorization code' | 'implicit'


export class DdbModel extends Model<DdbModel> {
    params: URLSearchParams
    
    inited = false
    
    /** 在本地开发模式 */
    dev = false
    
    /** 通过 ticket 或用户名密码自动登录，默认为 true 传 autologin=0 关闭 */
    autologin = true
    
    /** 是否启用 sso 登录 */
    oauth = false
    
    oauth_type: OAuthType
    
    /** 通过 test.dolphindb.cn 访问的 web */
    test = false
    
    /** 静态资源的根路径 */
    assets_root = '/'
    
    /** 启用详细日志，包括执行的代码和运行代码返回的变量 */
    verbose = false
    
    /** 是否启用了因子平台功能 */
    is_factor_platform_enabled = false
    
    ddb: DDB
    
    collapsed = localStorage.getItem(storage_keys.collapsed) === 'true'
    
    sql: SqlStandard = SqlStandard[localStorage.getItem(storage_keys.sql)] || SqlStandard.DolphinDB
    
    // todo: 暂时兼容，后面会把这里的逻辑去掉
    get view () {
        return location.pathname.strip_start(this.assets_root).split('/')[0] || 'shell'
    }
    
    logined = false
    
    username: string = username_guest
    
    admin = false
    
    node_type: NodeType
    
    node_alias: string
    
    /** 是否启用了客户端认证 */
    client_auth = false
    
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
    
    /** version() 函数的完整返回值 */
    version_full: string
    
    v1: boolean
    
    v2: boolean
    
    v3: boolean
    
    license: DdbLicense
    
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
    
    modal: ModalHookAPI
    
    notification: NotificationInstance
    
    navigate: NavigateFunction
    
    /** 记录启用了哪些可选功能 */
    enabled_modules = new Set<string>()
    
    /** 记录所有可选功能 */
    optional_modules = new Set(['finance-guide', 'iot-guide'])
    
    docs: Docs
    
    
    constructor () {
        super()
        
        const params = this.params = new URLSearchParams(location.search)
        
        this.dev = params.get('dev') !== '0' && (location.host === 'localhost:8432' || params.get('dev') === '1')
        
        this.test = location.hostname === 'test.dolphindb.cn' || params.get('test') === '1'
        
        // 确定 assets_root
        if (this.test)
            for (const web_path of ['/web/', '/web-main/'])
                if (location.pathname.startsWith(web_path)) {
                    this.assets_root = web_path
                    break
                }
        
        this.autologin = params.get('autologin') !== '0'
        
        this.verbose = params.get('verbose') === '1'
        
        // test 或开发模式下，浏览器误跳转到 https 链接，自动跳转回 http
        if (location.protocol === 'https:' && (this.dev || this.test) && params.get('https') !== '1') {
            alert('请将地址栏中的链接改为 http:// 开头')
            return
        }
        
        let hostname = params.get('hostname') || location.hostname
        let port = params.get('port') || location.port
        
        const host = params.get('host')
        
        if (host) {
            // 优先用 host 参数中的主机和端口
            [hostname, port] = host.split(':')
            params.delete('host')
            params.set('hostname', hostname)
            params.set('port', port)
            // 转换 url
            let url = new URL(location.href)
            url.search = params.toString()
            history.replaceState(null, '', url)
        }
        
        this.ddb = new DDB(
            (this.dev ? (params.get('tls') === '1' ? 'wss' : 'ws') : (location.protocol === 'https:' ? 'wss' : 'ws')) +
                '://' +
                hostname +
                
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
    }
    
    
    /** 不论是否登录、是否有权限，都执行的基础初始化 */
    async init () {
        console.log(t('web 开始初始化，当前处于{{mode}}模式，版本为 {{version}}', {
            mode: this.dev ? t('开发') : t('生产'),
            version: WEB_VERSION
        }))
        
        await Promise.all([
            this.get_node_type(),
            this.get_node_alias(),
            this.get_controller_alias(),
            this.get_version()
        ])
        
        await Promise.all([
            // 必须先调用上面的函数，load_configs 依赖 controller alias, version 等信息
            config.load_configs(),
            
            this.get_cluster_perf(true)
        ])
        
        console.log(t('配置:'), await this.ddb.invoke<Record<string, string>>('getConfig'))
        
        await this.check_leader_and_redirect()
        
        this.set({
            oauth: config.get_boolean_config('oauth'),
            login_required: config.get_boolean_config('webLoginRequired'),
            enabled_modules: new Set(
                config.get_config('webModules')?.split(',') || [ ]
            )
        })
        
        console.log(t('web 强制登录:'), this.login_required)
        
        if (this.oauth) {
            this.oauth_type = config.get_config<OAuthType>('oauthWebType') || 'authorization code'
            
            if (!['authorization code', 'implicit'].includes(this.oauth_type))
                throw new Error(t('oauthType 配置参数的值必须为 authorization code 或 implicit，默认为 authorization code'))
            
            // 不论是否 autologin, 都需要处理 oauth 跳转回来时 url 带有 state 的情况，
            // 因此需要调用这个方法检查并可能再次跳转
            await this.login_by_oauth()
        }
        
        
        if (this.autologin && !this.logined)
            try {
                await this.login_by_ticket()
            } catch {
                console.log(t('ticket 登录失败'))
                
                if ((this.dev || this.test) && !this.oauth)
                    try {
                        await this.login_by_password('admin', '123456')
                    } catch {
                        console.log(t('使用默认 admin 账号密码登录失败'))
                    }
            }
        
        
        console.log(t('web 初始化成功'))
        
        this.set({ inited: true })
        
        this.get_license_info()
        
        if (!this.logined && (this.login_required || await this.check_client_auth()))
            await this.goto_login()
        else
            await this.get_factor_platform_enabled()
    }
    
    
    /** 检查是否启用了客户端认证 (ClientAuth) */
    async check_client_auth (): Promise<boolean> {
        try {
            const client_auth = await this.ddb.invoke<boolean>('isClientAuth', undefined, { urgent: true })
            console.log(t('web 安全认证:'), client_auth)
            this.set({ client_auth })
            return client_auth
        } catch {
            return false
        }
    }
    
    
    /** 设置 url 上的 query 参数
        - key: 参数名
        - value: 参数值，为 null 或 undefined 时删除该参数 */
    set_query (key: string, value: string | null) {
        let params = new URLSearchParams(location.search)
        
        if (value === null || value === undefined)
            params.delete(key)
        else
            params.set(key, value)
        
        model.navigate({ search: params.toString() }, { replace: true })
    }
    
    
    show_error (options: FormatErrorOptions) {
        show_error(this.modal, options)
    }
    
    
    async login_by_password (username: string, password: string) {
        this.ddb.username = username
        this.ddb.password = password
        
        await this.ddb.invoke('login', [username, password], { urgent: true })
        
        await this.update_user()
        
        console.log(t('{{username}} 使用账号密码登陆成功', { username: this.username }))
    }
    
    
    /** 通过 oauthLogin 和 getAuthenticatedUserTicket 拿到的两种 ticket 登录 */
    async login_by_ticket () {
        const ticket = localStorage.getItem(storage_keys.ticket)
        if (!ticket)
            throw new Error(t('没有自动登录的 ticket'))
        
        const last_username = localStorage.getItem(storage_keys.username)
        if (!last_username)
            throw new Error(t('没有自动登录的 username'))
        
        try {
            await this.ddb.invoke('authenticateByTicket', [ticket], { urgent: true })
            this.set({ logined: true, username: last_username })
            
            await this.is_admin()
            
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
        
        await this.ddb.invoke('login', ['guest', '123456'])
        
        const result = await this.ddb.invoke<{ code: number, message: string, username: string, raw: string }>('authenticateBySession', [session])
        
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
            
            await this.is_admin()
            
            return result
        }
    }
    
    
    /** 实现了两种 oauth 方法: 
        - authorization code
        - implicit
        
        https://www.ruanyifeng.com/blog/2019/04/oauth-grant-types.html  
        https://datatracker.ietf.org/doc/html/rfc6749 */
    async login_by_oauth () {
        let url = new URL(location.href)
        
        // 有 ticket 说明 oauthLogin 登录成功
        let ticket: string
        
        /** redirect_uri 只能跳转到其中某个节点，需要带参数跳回到原发起登录的节点 
            发起跳转后会抛出错误中断后续流程 */
        const maybe_jump = async (params: URLSearchParams) => {
            const state = params.get('state')
            if (state && state !== this.node_alias) {
                const node = this.nodes.find(({ name }) => name === state)
                if (!node)
                    throw new Error(t('无法从当前节点 {{current}} 跳转回发起登录的节点 {{origin}}，找不到节点信息', { current: this.node_alias, origin: state }))
                
                console.log(t('根据 state 参数跳转到节点:'), state)
                
                await goto_url(this.get_node_url(node, { queries: { state: null } }))
            }
        }
        
        // https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2
        if (this.oauth_type === 'authorization code') {
            let { searchParams: params } = url
            
            await maybe_jump(params)
            
            const code = params.get('code')
            
            if (code) {
                console.log(
                    t('尝试 oauth 单点登录，类型是 authorization code, code 为 {{code}}',
                    { code }))
                
                ticket = await this.ddb.invoke<string>('oauthLogin', [this.oauth_type, { code }])
                
                params.delete('state')
                params.delete('code')
                history.replaceState(null, '', url.toString())
            } else
                console.log(t('尝试 oauth 单点登录，类型是 authorization code, 无 code'))
        } else {
            const params = new URLSearchParams(url.hash.slice(1))
            
            await maybe_jump(params)
            
            const access_token = params.get('access_token') || params.get('accessToken')
            const token_type = params.get('token_type') || params.get('tokenType')
            const expires_in = params.get('expires_in') || params.get('expiresIn')
            
            if (access_token) {
                console.log(t(
                    '尝试 oauth 单点登录，类型是 implicit, token_type 为 {{token_type}}, access_token 为 {{access_token}}, expires_in 为 {{expires_in}}',
                    { token_type, access_token, expires_in }))
                
                ticket = await this.ddb.invoke<string>('oauthLogin', [this.oauth_type, {
                    token_type,
                    access_token,
                    expires_in
                }])
                
                url.hash = ''
            } else
                console.log(t('尝试 oauth 单点登录，类型是 implicit, 无 access_token'))
        }
        
        
        if (ticket) {
            const username = await this.update_user(ticket)
            
            if (this.logined)
                console.log(t('{{username}} 使用 oauth 单点登录成功', { username }))
            else
                throw new Error(t('通过 oauth 单点登录之后的 username 不能是 {{guest}}', { guest: username_guest }))
        }
    }
    
    
    async update_user (ticket?: string) {
        const [session, username] = await this.ddb.invoke<[string, string]>('getCurrentSessionAndUser')
        
        const logined = username !== username_guest
        
        this.set({ logined, username })
        
        await this.is_admin()
        
        if (logined) {
            if (!ticket)
                ticket = await this.ddb.invoke<string>('getAuthenticatedUserTicket', undefined, {
                    urgent: true,
                    ... this.node_type === NodeType.controller || this.node_type === NodeType.single 
                        ? undefined
                        : { node: this.controller_alias }
                })
            
            localStorage.setItem(storage_keys.username, username)
            localStorage.setItem(storage_keys.ticket, ticket)
        }
        
        return username
    }
    
    
    async logout () {
        localStorage.removeItem(storage_keys.ticket)
        localStorage.removeItem(storage_keys.username)
        
        await this.ddb.invoke('logout', undefined, { urgent: true })
        
        this.set({
            logined: false,
            username: username_guest,
            admin: false
        })
        
        if (this.login_required || this.client_auth)
            await this.goto_login()
    }
    
    
    async is_admin () {
        const admin = this.logined && (
            await this.ddb.invoke<DdbTableData<{ isAdmin: boolean }>>(
                'getUserAccess',
                undefined,
                { urgent: true }
            )
        ).data[0].isAdmin
        
        this.set({ admin })
        
        return admin
    }
    
    
    /** 获取是否启用因子平台 */
    async get_factor_platform_enabled () {
        try {
            this.set({
                is_factor_platform_enabled: 
                    await this.ddb.execute<boolean>('readLicenseAuthorization(license().modules).starfish', { urgent: true })
            })
            
            return this.is_factor_platform_enabled
        } catch {
            return false
        }
    }
    
    
    async start_nodes (nodes: DdbNode[]) {
        await this.ddb.invoke('startDataNode', [nodes.map(node => node.name)], { node: this.controller_alias })
    }
    
    
    async stop_nodes (nodes: DdbNode[]) {
        await this.ddb.invoke('stopDataNode', [nodes.map(node => node.name)], { node: this.controller_alias })
    }
    
    
    async get_node_type () {
        const node_type = await this.ddb.invoke<NodeType>('getNodeType', undefined, { urgent: true })
        this.set({ node_type })
        console.log(t('节点类型:'), NodeType[node_type])
        return node_type
    }
    
    
    async get_node_alias () {
        const node_alias = await this.ddb.invoke<string>('getNodeAlias', undefined, { urgent: true })
        this.set({ node_alias })
        console.log(t('节点名称:'), node_alias)
        return node_alias
    }
    
    
    async get_controller_alias () {
        const controller_alias = await this.ddb.invoke('getControllerAlias', undefined, { urgent: true })
        this.set({ controller_alias })
        console.log(t('控制节点:'), controller_alias)
        return controller_alias
    }
    
    
    async get_version () {
        const version_full = await this.ddb.invoke<string>('version')
        const version = version_full.split(' ')[0]
        
        this.set({
            version,
            version_full,
            v1: version.startsWith('1.'),
            v2: version.startsWith('2.'),
            v3: version.startsWith('3.')
        })
        
        console.log(t('server 版本:'), version_full)
        
        return version
    }
    
    
    /** 获取 license 相关信息 */
    async get_license_info () {
        const license = await this.ddb.invoke<DdbLicense>('license')
        console.log('license:', license)
        this.set({ license })
        return license
    }
    
    
    /** 跳转路径，不改变查询参数 */
    goto (pathname: string, options?: NavigateOptions & { query?: Record<string, string> }) {
        assert(pathname.startsWith('/'), 'goto 应该传入绝对路径')
        
        const params = new URLSearchParams(location.search)
        const { query, ..._options } = options
        if (query)
            Object.entries(query).forEach(([key, value]) => {
                if (value === undefined)
                    params.delete(key)
                else
                    params.set(key, value)
            })
        
        this.navigate({ pathname, search: params.toString() }, _options)
    }
    
    
    /** 去登录页 */
    async goto_login () {
        if (this.oauth) {
            const auth_uri = strip_quotes(
                config.get_config('oauthAuthUri')
            )
            const client_id = config.get_config('oauthClientId')
            const redirect_uri = strip_quotes(
                config.get_config('oauthRedirectUri')
            )
            
            if (!auth_uri || !client_id)
                throw new Error(t('必须配置 oauthAuthUri, oauthClientId 参数'))
            
            const url = new URL(
                auth_uri + '?' + new URLSearchParams({
                    response_type: this.oauth_type === 'authorization code' ? 'code' : 'token',
                    client_id,
                    ... redirect_uri ? { redirect_uri } : { },
                    state: this.node_alias
                }).toString()
            ).toString()
            
            console.log(t('跳转到 oauth 验证页面:'), url)
            
            await goto_url(url)
        } else
            this.goto('/login/')
    }
    
    
    /** 获取 nodes 和 node 信息
        https://www.dolphindb.cn/cn/help/FunctionsandCommands/FunctionReferences/g/getClusterPerf.html  
        Only master or single mode supports function getClusterPerf. */
    async get_cluster_perf (print: boolean) {
        const nodes = (
            await this.ddb.invoke<DdbTableData<DdbNode>>('getClusterPerf', [true], {
                urgent: true,
                
                ... this.node_type === NodeType.controller || this.node_type === NodeType.single
                    ? undefined
                    : { node: this.controller_alias }
            })
        )
        .data
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
        
        return nodes
    }
    
    
    /** 判断当前集群是否有数据节点或计算节点正在运行 */
    has_data_and_computing_nodes_alive () {
        return Boolean(
            this.nodes.find(node =>
                (node.mode === NodeType.data || node.mode === NodeType.computing) && 
                node.state === DdbNodeState.online)
        )
    }
    
    
    find_node_closest_hostname (node: DdbNode) {
        const params = new URLSearchParams(location.search)
        const current_connect_host = params.get('hostname') || location.hostname
        
        // 所有域名应该都转成小写后匹配，因为浏览器默认会将 location.hostname 转为小写
        const hosts = [...node.publicName.split(';').map(name => name.trim().toLowerCase()), node.host.toLowerCase()]
        
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
        
        const [closest] = hosts.slice(1).reduce<[string, number]>((prev, hostname) => {
            if (hostname === current_connect_host)
                return [hostname, Infinity]
            
            const [_, closest_score] = prev
            const score = calc_host_score(hostname)
            if (score > closest_score)
                return [hostname, score]
            
            return prev
        }, [hosts[0], calc_host_score(hosts[0])])
        
        return closest
    }
    
    
    async check_leader_and_redirect () {
        if (this.node.mode === NodeType.controller && 'isLeader' in this.node && this.node.isLeader === false) {
            const leader = this.nodes.find(node => node.isLeader)
            
            if (leader) {
                const url = this.get_node_url(leader)
                alert(
                    t('您访问的这个控制节点现在不是高可用 (raft) 集群的 leader 节点, 将会为您自动跳转到集群当前的 leader 节点: ') + 
                    url
                )
                
                await goto_url(url)
            }
        }
    }
    
    
    async get_console_jobs () {
        return this.ddb.call<DdbObj<DdbObj[]>>('getConsoleJobs', undefined, {
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
        return this.ddb.call<DdbObj<DdbObj[]>>('getRecentJobs', undefined, {
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
        return this.ddb.call<DdbObj<DdbObj[]>>('getScheduledJobs', undefined, {
            urgent: true,
            nodes: this.node_type === NodeType.controller ? 
                this.nodes.filter(node => node.state === DdbNodeState.online && node.mode !== NodeType.agent)
                    .map(node => node.name)
                :
                    null
        })
    }
    
    
    async cancel_console_job (job: DdbJob) {
        return this.ddb.invoke('cancelConsoleJob', [job.rootJobId], { urgent: true })
    }
    
    
    async cancel_job (job: DdbJob) {
        return this.ddb.invoke('cancelJob', [job.jobId], {
            urgent: true,
            ... (!job.node || this.node_alias === job.node) ? { } : { node: job.node }
        })
    }
    
    
    async delete_scheduled_job (job: DdbJob) {
        return this.ddb.invoke('deleteScheduledJob', [job.jobId], {
            urgent: true,
            ... (!job.node || this.node_alias === job.node) ? { } : { node: job.node }
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
            length = await this.ddb.invoke<bigint>(
                'get_server_log_length_by_agent',
                [host, new DdbInt(Number(port)), this.node_alias]
            )
        } else
            length = await this.ddb.invoke<bigint>('getServerLogLength', [this.node_alias])
        
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
            
            logs = await this.ddb.invoke<string[]>(
                'get_server_log_by_agent',
                [host, new DdbInt(Number(port)), new DdbLong(length), new DdbLong(offset), this.node_alias]
            )
        } else
            logs = await this.ddb.invoke<string[]>(
                'getServerLog',
                [new DdbLong(length), new DdbLong(offset), true, this.node_alias]
            )
        
        logs.reverse()
        
        console.log('get_server_log', offset, length, logs.length)
        
        return logs
    }
    
    
    /** 获取 node 最优跳转 url */
    get_node_url (node: DdbNode, options?: GetUrlOptions ) {
        return this.get_url(
            this.find_node_closest_hostname(node), 
            node.port, 
            options
        )
    }
    
    
    get_url (
        hostname: string, 
        port: number,
        {
            pathname = location.pathname,
            queries,
            keep_current_queries = true
        }: GetUrlOptions = { }
    ) {
        const _queries = new URLSearchParams(location.search)
        const is_query_params_mode = _queries.get('hostname') || _queries.get('port')
        const port_ = is_query_params_mode ? location.port : port
        
        const query_string = new URLSearchParams(filter_values({
            ... keep_current_queries ? Object.fromEntries(_queries.entries()) : { },
            ... is_query_params_mode ? {
                hostname,
                port: String(port)
            } : { },
            ... queries,
        })).toString()
        
        return location.protocol + '//' +
            (is_query_params_mode ? location.hostname : hostname) + 
            (port_ ? `:${port_}` : '') +
            pathname + 
            (query_string ? `?${query_string}` : '') +
            location.hash
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
                        options.args.map(arg => arg.toString({ quote: true, grouping: false, nullstr: true }))
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
    
    
    is_module_visible (key: string): boolean {
        return this.enabled_modules.has(key) || !this.optional_modules.has(key)
    }
}


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
    computeGroup: string
    
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
    expiration: string
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


export interface GetUrlOptions {
    pathname?: string
    queries?: Record<string, string>
    keep_current_queries?: boolean
}


export let model = window.model = new DdbModel()
