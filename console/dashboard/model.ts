import { createRef } from 'react'

import { Model } from 'react-object-model'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'

import { DdbForm, type DdbVoid, type DdbObj, type DdbValue, DdbVectorLong, DdbVectorString, DdbLong, DdbDict, DdbInt } from 'dolphindb/browser.js'

import { GridStack, type GridStackNode, type GridItemHTMLElement } from 'gridstack'

import { assert, genid } from 'xshell/utils.browser.js'

import type { MessageInstance } from 'antd/es/message/interface.js'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm.js'
import type { NotificationInstance } from 'antd/es/notification/interface.js'

import { t } from '../../i18n/index.js'
import { model, show_error, type ErrorOptions, storage_keys } from '../model.js'
import { type Monaco } from '../shell/Editor/index.js'

import { type DataSource, type ExportDataSource, import_data_sources, unsubscribe_data_source, type DataType, clear_data_sources, subscribe_data_source } from './DataSource/date-source.js'
import { type IEditorConfig, type IChartConfig, type ITableConfig, type ITextConfig, type IGaugeConfig, type IHeatMapChartConfig, type IOrderBookConfig } from './type.js'
import { type Variable, import_variables, type ExportVariable } from './Variable/variable.js'


export class DashBoardModel extends Model<DashBoardModel> {
    /** 所有 dashboard 的配置 */
    configs: DashBoardConfig[]
    
    /** 当前 dashboard 配置 */
    config: DashBoardConfig
    
    /** 所有用户 */
    users: string[] = [ ]
    
    /** GridStack.init 创建的 gridstack 实例 */
    grid: GridStack
    
    /** 画布中所有的图表控件 */
    widgets: Widget[] = [ ]
    
    /** 当前选中的图表控件，焦点在画布时可能为 null (是否合理？不合理可以再加一个 focused 属性) */
    widget: Widget | null
    
    
    /** 全局变量 */
    variables: Variable[] = [ ]
    
    
    /** 数据源 */
    data_sources: DataSource[] = [ ]
    
    
    /** 编辑、预览状态切换 */
    editing = (new URLSearchParams(location.search)).get('preview') !== '1'
    
    /** 切换状态 */
    loading = false
    
    // gridstack 仅支持 12 列以下的，大于 12 列需要手动添加 css 代码，详见 gridstack 的 readme.md
    // 目前本项目仅支持仅支持 <= 12
    maxcols = 12
    maxrows = 12
    
    monaco: Monaco
    
    sql_editor: monacoapi.editor.IStandaloneCodeEditor
    
    filter_column_editor: monacoapi.editor.IStandaloneCodeEditor
    
    filter_expression_editor: monacoapi.editor.IStandaloneCodeEditor
    
    result: Result
    
    // console/model.js 对应黑色主题的版本
    message: MessageInstance
    
    modal: Omit<ModalStaticFunctions, 'warn'>
    
    notification: NotificationInstance
    
    
    /** 初始化 GridStack 并配置事件监听器 */
    async init ($div: HTMLDivElement) {
        // try {
        //     await this.get_dashboard_configs()
        // } catch (error) {
        //     this.set({ backend: false })
        //     await this.get_configs_from_local()
        // }
        try {
            await model.ddb.call<DdbVoid>('dashboard_check_access', [ ], { urgent: true })
            await this.get_dashboard_configs()
        } catch (error) {
            this.show_error({ error })
            throw error
        }
        if (!this.config) {
            const id = genid()
            const new_dashboard_config = {
                id,
                name: String(id).slice(0, 4),
                permission: DashboardPermission.own,
                data: {
                    datasources: [ ],
                    variables: [ ],
                    canvas: {
                        widgets: [ ]
                    }
                }
            }
            this.set({
                config: new_dashboard_config,
                configs: [new_dashboard_config]
            })
        }
        
        let grid = GridStack.init({
            acceptWidgets: true,
            float: true,
            column: this.maxcols,
            row: this.maxrows,
            margin: 0,
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
        }, $div)
        
        grid.cellHeight(Math.floor(grid.el.clientHeight / this.maxrows))
        
        grid.enableMove(this.editing)
        grid.enableResize(this.editing)
        
        // 响应用户从外部添加新 widget 到 GridStack 的事件
        grid.on('dropped', async (event: Event, old_node: GridStackNode, node: GridStackNode) => {
            // old_widget 为 undefined
            
            const widget: Widget = {
                ...node,
                // 默认大小：宽度 2 ， 高度 3
                w: 2,
                h: 3,
                ref: createRef(),
                id: String(genid()),
                type: node.el.dataset.type as keyof typeof WidgetType,
            }
            
            // console.log('拖拽释放，添加 widget:', widget)
            
            this.add_widget(widget)
            
            grid.removeWidget(node.el)
        })
        
        // 响应 GridStack 中 widget 的位置或尺寸变化的事件
        grid.on('change', (event: Event, widgets: GridStackNode[]) => {
            // console.log('修改 widget 大小或位置:', widgets)
            
            if (widgets?.length)
                for (const widget of widgets)
                    Object.assign(
                        this.widgets.find(({ id }) => id === widget.id), 
                        widget
                    )
            else {
                // console.log('gridstack change 时 widgets 为空')
            }
        })
        
        // grid.on('resize', () => {
        //     console.log('resize')
        // })
        
        // grid.on('dragstop', () => {
        //     console.log('dragstop')
        // })
        
        // todo: throttle?
        window.addEventListener('resize', () => {
            grid.cellHeight(Math.floor(grid.el.clientHeight / this.maxrows))
        })
        
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        
        this.set({ grid, widget: null })
    }
    
    
    /** 执行 action，遇到错误时弹窗提示 
        - action: 需要弹框展示执行错误的函数
        - options?:
            - throw?: `true` 默认会继续向上抛出错误，如果不需要向上继续抛出
            - print?: `!throw` 在控制台中打印错误
        @example await model.execute(async () => model.xxx()) */
    async execute (action: Function, { throw: _throw = true, print }: { throw?: boolean, print?: boolean } = { }) {
        try {
            await action()
        } catch (error) {
            if (print ?? !_throw)
                console.error(error)
            
            this.show_error({ error })
            
            if (_throw)
                throw error
        }
    }
    
    
    show_error (options: ErrorOptions) {
        show_error(this.modal, options)
    }
    
    
    
    /** 传入 _delete === true 时表示删除传入的 config, 传入 null 代表清空当前的config，返回到 dashboard 管理界面 */
    // async update_config (config: DashBoardConfig, _delete = false) {
    //     this.set({ loading: true })
    //     const { config: config_, configs } = (() => {
    //         if (_delete) {
    //             const configs = this.configs.filter(c => c.id !== config.id)
                
    //             return {
    //                 config: configs[0] || this.generate_new_config(),
    //                 configs,
    //             }
    //         } else {
    //             let index = this.configs?.findIndex(c => c.id === config.id)
                
    //             return {
    //                 config,
                    
    //                 configs: index === -1 ?
    //                     [...this.configs, config]
    //                 :
    //                     this.configs ?  this.configs.toSpliced(index, 1, config) : [config],
    //             }
    //         }
    //     })()
        
    //     model.set_query('dashboard', String(config.id))
        
    //     this.set({
    //         config: config_,
            
    //         configs,
            
    //         variables: await import_variables(config_.data.variables),
            
    //         data_sources: await import_data_sources(config_.data.datasources),
            
    //         widgets: config_.data.canvas.widgets.map(widget => ({
    //             ...widget,
    //             ref: createRef()
    //         })) as any,
            
    //         widget: null,
    //     })
    //     this.set({ loading: false })
    //     console.log(t('dashboard 配置加载成功'))
    // }
    
    
    generate_new_config (id: number, name: string) {
        return {
            id,
            name,
            permission: DashboardPermission.own,
            data: {
                datasources: [ ],
                variables: [ ],
                canvas: {
                    widgets: [ ],
                }
            }
        }
    }
    
    
    dispose () {
        clear_data_sources()
        console.log('dispose')
        this.grid.destroy()
        this.grid = null
    }
    
    
    render_widgets () {
        let { grid, widgets } = this
        if (!grid)
            return
        
        grid.batchUpdate(true)
        
        grid.removeAll(false)
        
        for (let widget of widgets) {
            let $element = widget.ref.current
            
            assert($element)
            
            // 返回值为 GridItemHTMLElement 类型 (就是在 $element 这个 dom 节点上加了 gridstackNode: GridStackNode 属性)
            Object.assign(
                widget,
                grid.makeWidget($element).gridstackNode
            )
        }
        
        grid.batchUpdate(false)
    }
    
    
    add_widget (widget: Widget) {
        this.set({
            widget,
            widgets: [...this.widgets, widget]
        })
    }
    
    
    delete_widget (widget: Widget) {
        const widgets = this.widgets.filter(w => w !== widget)
        
        if (widget.source_id)
            unsubscribe_data_source(widget)
        
        this.set({
            widget: widgets[0],
            widgets
        })
    }
    
    
    update_widget (widget: Widget) {
        if (this.widgets.find(({ id }) => id === widget.id)) { 
            Object.assign(this.widgets.find(({ id }) => id === widget.id), widget)
            this.set({ widget })
        } 
    }
    
    
    set_editing (editing: boolean) {
        this.grid.enableMove(editing)
        this.grid.enableResize(editing)
        this.set({ editing })
    }
    
    
    async eval (code = this.sql_editor.getValue(), ddb = model.ddb, preview = false) {
        try {
            let ddbobj = await ddb.eval(
                code.replaceAll('\r\n', '\n')
            )
            if (model.verbose)
                console.log('=>', ddbobj.toString())
            
            if (
                (ddbobj.form === DdbForm.chart ||
                ddbobj.form === DdbForm.dict ||
                ddbobj.form === DdbForm.matrix ||
                ddbobj.form === DdbForm.set ||
                ddbobj.form === DdbForm.table ||
                ddbobj.form === DdbForm.vector) && preview
            )     
                this.set({
                    result: {
                        type: 'object',
                        data:  ddbobj
                    },
                }) 
            else if (preview)
                this.set({
                    result: null,
                })
            return ddbobj   
        } catch (error) {
            if (preview)
                this.set({
                    result: null,
                })
            throw error
        }
    }
    
    
    async execute_code (code = this.sql_editor.getValue(), ddb = model.ddb, preview = false): Promise<{
        type: 'success' | 'error'
        result: string | DdbObj<DdbValue>
    }> {
        try {
            const result = await this.eval(code, ddb, preview)
            return {
                type: 'success',
                result: result
            }
        } catch (error) {
            return {
                type: 'error',
                result: error.message
            }
        }
    }
    
    
    /** 获取分享的用户列表 */
    async get_user_list () {
        const users = ((await model.ddb.call<DdbObj>('dashboard_get_user_list')).value) as string[]
        this.set({ users: users })
    }
    
    
    async add_dashboard_config (config: DashBoardConfig, render: boolean = true) {
        this.set({ configs: [config, ...this.configs], config })
        const { id, name, permission, data } = config
        const params = new DdbDict(
            ({ id: new DdbLong(BigInt(id)), name, permission: new DdbInt(permission), data: JSON.stringify(data) }))
        await model.ddb.call<DdbVoid>('dashboard_add_config', [params], { urgent: true })
        if (render)
            await this.render_with_config(config)
    }
    
    
    async delete_dashboard_configs (dashboard_config_ids: number[], render: boolean = true) {
        const delete_ids = new Set(dashboard_config_ids)
        const filtered_configs = this.configs.filter(({ id }) => !delete_ids.has(id))
        this.set({ configs: filtered_configs, config: filtered_configs[0] })
        await model.ddb.call<DdbVoid>('dashboard_delete_configs', [new DdbDict({ ids: new DdbVectorLong(dashboard_config_ids) })], { urgent: true })
        if (filtered_configs.length && render)
            await this.render_with_config(filtered_configs[0])   
    }
    
    
    async update_dashboard_config (config: DashBoardConfig, render: boolean = true) {
        const index = this.configs.findIndex(({ id }) => id === config.id)
        this.set({ configs: this.configs.toSpliced(index, 1, config), config })
        const params = new DdbDict(
            ({ id: new DdbLong(BigInt(config.id)), data: JSON.stringify(config.data) })) 
        await model.ddb.call<DdbVoid>('dashboard_edit_config', [params], { urgent: true })
        if (render)
            await this.render_with_config(config)
    }
    
    
    async rename_dashboard (dashboard_id: number, new_name: string) {
        await model.execute(async () => {
            await model.ddb.call<DdbVoid>('dashboard_rename_config', [new DdbDict({ id: new DdbLong(BigInt(dashboard_id)), name: new_name })], { urgent: true })
        
            const index = this.configs.findIndex(({ id }) => id === dashboard_id)
            const config = this.configs[index]
            config.name = new_name
            this.set({ configs: this.configs.toSpliced(index, 1, config), config })
            await this.render_with_config(config)
        })
    }
    
    
    /** 根据 id 获取单个 DashboardConfig */
    async get_dashboard_config (id: number) {
        const data = (await model.ddb.call('dashboard_get_config', [new DdbLong(BigInt(id))], { urgent: true })).to_rows()
        return data.length ? { ...data[0], id: Number(data[0].id), data: JSON.parse(data[0].data) } : null
    }
    
    
    /** 从服务器获取 dashboard 配置 */
    async get_dashboard_configs () {
        const data = (await model.ddb.call<DdbVoid>('dashboard_get_config_list', [ ], { urgent: true })).to_rows()
        const configs =  data.map(cfg => ({ ...cfg, 
                                            id: Number(cfg.id), 
                                            data: JSON.parse(typeof cfg.data === 'string' ? 
                                                                                    JSON.parse(cfg.data)
                                                                                        : 
                                                                                    new TextDecoder().decode(cfg.data) ) }) as DashBoardConfig) 
        this.set({ configs })
        const dashboard_id = Number(new URLSearchParams(location.search).get('dashboard'))
        if (dashboard_id) {
            const config = configs.find(({ id }) =>  id === dashboard_id)
            if (config) {
                this.set({ config })
                await this.render_with_config(config)
            }
                
            else
                this.show_error({ error: new Error(t('当前 url 所指向的 dashboard 不存在')) })
        }
    }
    
    
    /** 从浏览器获取 dashboard 配置 */
    // async get_configs_from_local () {
    //     let configs = JSON.parse(localStorage.getItem(storage_keys.dashboards)) || [ ]
        
    //     this.set({ configs })
    //     const dashboard = Number(new URLSearchParams(location.search).get('dashboard'))
    //     if (dashboard) {
    //         const config = this.configs.find(({ id }) =>  id === dashboard)
    //         if (config)
    //             this.set({ config })
    //         else
    //             this.show_error({ error: new Error(t('当前 url 所指向的 dashboard 不存在')) })
    //     } 
    // }
    
    
    async render_with_config (config: DashBoardConfig) {
        this.set({ loading: true })
        
        this.set({ config,
                            
            variables: await import_variables(config.data.variables),
         
            data_sources: await import_data_sources(config.data.datasources),
            
            widgets: config.data.canvas.widgets.map(widget => ({
                ...widget,
                ref: createRef()
                })) as Widget[],
         
            widget: null,
            
         })
        
        for (let i in this.widgets) 
            await subscribe_data_source(this.widgets[i], this.widgets[i].source_id, false)
        
        this.set({ loading: false })
    }
    
    
    // /** 将配置持久化保存到浏览器 */
    // async save_configs_to_local () {
    //     localStorage.setItem(storage_keys.dashboards, JSON.stringify(this.configs))
    // }
    
    async share (dashboard_ids: number[], viewers: string[], editors: string[]) {
       await model.ddb.call<DdbVoid>('dashboard_share_configs',
            [new DdbDict({ 
                ids: new DdbVectorLong(dashboard_ids), 
                viewers: new DdbVectorString(viewers), 
                editors: new DdbVectorString(editors) 
            })], { urgent: true })
    }
    
    async revoke (id: number) {
        await model.ddb.call<DdbVoid>('dashboard_revoke_permission', [new DdbDict({ id: new DdbLong(BigInt(id)) })], { urgent: true })
    }
}


export let dashboard = window.dashboard = new DashBoardModel()


export interface DashBoardConfig {
    id: number
    
    name: string
    
    /** 当前用户是否有所有权, 被分享时 owned 为 false */
    permission: DashboardPermission
    
    data: {
         /** 数据源配置 */
        datasources: ExportDataSource[]
        
        /** 变量配置 */
        variables: ExportVariable[]
        
        /** 画布配置 */
        canvas: {
            widgets: any[]
        }
    }
}


/** dashboard 中我们自己定义的 Widget，继承了官方的 GridStackWidget，加上额外的业务属性 */
export interface Widget extends GridStackNode {
    /** 保存 dom 节点，在 widgets 配置更新时将 ref 给传给 react `<div>` 获取 dom */
    ref: React.MutableRefObject<GridItemHTMLElement>
    
    /** 图表类型 */
    type: keyof typeof WidgetType
    
    /** 数据源 id */
    source_id?: string
    
    /** 更新图表方法 */
    update_graph?: (data: DataType) => void
    
    /** 图表配置 */
    config?: (IHeatMapChartConfig | IChartConfig | ITableConfig | ITextConfig | IEditorConfig | IGaugeConfig | IOrderBookConfig) & {
        variable_ids?: string[]
        abandon_scroll?: boolean
        variable_cols?: number
        with_search_btn?: boolean
        padding?: {
            left: number
            right: number
            top: number
            bottom: number
        }
    }
}


export enum WidgetType {
    BAR = '柱状图',
    LINE = '折线图',
    PIE = '饼图',
    // POINT = '散点图',
    TABLE = '表格',
    OHLC = 'K 线',
    MIX = '混合图',
    // CANDLE = '蜡烛图',
    ORDER = '订单图',
    // NEEDLE = '数值针型图',
    // STRIP = '带图',
    // HEAT = '热力图',
    TEXT = '富文本',
    DESCRIPTIONS = '描述表',
    EDITOR = '编辑器',
    GAUGE = '仪表盘',
    RADAR = '雷达图',
    VARIABLE = '变量',
    SCATTER = '散点图',
    HEATMAP = '热力图'
}

export enum WidgetChartType { 
    BAR = 'BAR',
    LINE = 'LINE',
    MIX = 'MIX',
    PIE = 'PIE',
    // POINT = 'POINT',
    TABLE = 'TABLE',
    OHLC = 'OHLC',
    // CANDLE = 'CANDLE',
    ORDER = 'ORDER',
    // NEEDLE = 'NEEDLE',
    // STRIP = 'STRIP',
    // HEAT = 'HEAT'
    TEXT = 'TEXT',
    DESCRIPTIONS = 'DESCRIPTIONS',
    EDITOR = 'EDITOR',
    GAUGE = 'GAUGE',
    RADAR = 'RADAR',
    VARIABLE = 'VARIABLE',
    SCATTER = 'SCATTER',
    HEATMAP = 'HEATMAP'
}

export enum DashboardPermission {
    own = 0,
    edit = 1,
    view = 2
}

export const WidgetTypeWithoutDatasource = ['TEXT', 'EDITOR']


export type Result = { type: 'object', data: DdbObj<DdbValue> } | null
