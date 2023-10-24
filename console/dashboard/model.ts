import { createRef } from 'react'

import { Model } from 'react-object-model'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'

import { DdbForm, type DdbVoid, type DdbObj, type DdbValue, DdbVectorLong, DdbVectorString, DdbLong, DdbDict } from 'dolphindb/browser.js'

import { GridStack, type GridStackNode, type GridItemHTMLElement } from 'gridstack'

import { assert, genid } from 'xshell/utils.browser.js'

import type { MessageInstance } from 'antd/es/message/interface.js'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm.js'
import type { NotificationInstance } from 'antd/es/notification/interface.js'

import { t } from '../../i18n/index.js'
import { model, show_error, type ErrorOptions, storage_keys } from '../model.js'
import { type Monaco } from '../shell/Editor/index.js'

import { type DataSource, type ExportDataSource, import_data_sources, unsubscribe_data_source, type DataType, clear_data_sources } from './DataSource/date-source.js'
import { type IEditorConfig, type IChartConfig, type IDescriptionsConfig, type ITableConfig, type ITextConfig, type IGaugeConfig } from './type.js'
import { type Variable, import_variables, type ExportVariable } from './Variable/variable.js'
import { load_styles } from './utils.js'


export class DashBoardModel extends Model<DashBoardModel> {
    /** 所有 dashboard 的配置 */
    configs: DashBoardConfig[]
    
    /** 当前 dashboard 配置 */
    config: DashBoardConfig
    
    /** 可分享的用户 */
    users_to_share: string[]
    
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
    
    executing = false
    
    
    // console/model.js 对应黑色主题的版本
    message: MessageInstance
    
    modal: Omit<ModalStaticFunctions, 'warn'>
    
    notification: NotificationInstance
    
    
    /** 初始化 GridStack 并配置事件监听器 */
    async init ($div: HTMLDivElement) {
        try {
            await this.get_dashboard_configs()
        } catch (error) {
            await this.get_configs_from_local()
        }
        if (!this.config) {
            const id = genid()
            const new_dashboard_config = {
                id,
                name: String(id).slice(0, 4),
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
            
            console.log('拖拽释放，添加 widget:', widget)
            
            if (widget.type === 'TEXT')
                await Promise.all([
                    import('react-quill'),
                    load_styles('./vendors/react-quill/dist/quill.snow.css'),
                    load_styles('./vendors/react-quill/dist/quill.core.css')
                ])
            
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
    
    
    /** 传入 _delete === true 时表示删除传入的 config, 传入 null 代表清空当前的config，返回到 dashboard 管理界面 */
    async update_config (config: DashBoardConfig, _delete = false) {
        this.set({ loading: true })
        const { config: config_, configs } = (() => {
            if (_delete) {
                const configs = this.configs.filter(c => c.id !== config.id)
                
                return {
                    config: configs[0] || this.generate_new_config(),
                    configs,
                }
            } else {
                let index = this.configs?.findIndex(c => c.id === config.id)
                
                return {
                    config,
                    
                    configs: index === -1 ?
                        [...this.configs, config]
                    :
                        this.configs ?  this.configs.toSpliced(index, 1, config) : [config],
                }
            }
        })()
        
        model.set_query('dashboard', String(config.id))
        
        this.set({
            config: config_,
            
            configs,
            
            variables: await import_variables(config_.data.variables),
            
            data_sources: await import_data_sources(config_.data.datasources),
            
            widgets: config_.data.canvas.widgets.map(widget => ({
                ...widget,
                ref: createRef()
            })) as any,
            
            widget: null,
        })
        this.set({ loading: false })
        console.log(t('dashboard 配置加载成功'))
    }
    
    
    generate_new_config (id?: number, name?: string) {
        const id_ = id || genid()
        return {
            id,
            name: name || String(id_).slice(0, 4),
            owned: true,
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
    
    
    async eval (code = this.sql_editor.getValue(), preview = false) {
        this.set({ executing: true })
        
        try {
            let ddbobj = await model.ddb.eval(
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
            return ddbobj   
        } catch (error) {
            if (preview)
                this.set({
                    result: null,
                })
            throw error
        } finally {
            this.set({ executing: false })
        }
    }
    
    
    async execute (code = this.sql_editor.getValue(), queue = true, preview = false): Promise<{
        type: 'success' | 'error' | 'warn'
        result: string | DdbObj<DdbValue>
    }> {
        if (dashboard.executing && !queue) 
            // this.message.warning(t('当前连接正在执行作业，请等待'))
            return {
                type: 'warn',
                result: '当时连接正在执行作业，无返回结果'
            }
        else 
            try {
                const result = await this.eval(code, preview)
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
    async get_users_to_share () {
        try {
            let users = ((await model.ddb.call<DdbObj>('get_users_to_share')).value) as string[]
            this.set({ users_to_share: users })
        } catch (error) {
            console.log('get_users_to_share error:', error)
            this.set({ users_to_share: [ ] })
        }
        
    }
    
    
    async add_dashboard_config (config: DashBoardConfig) {
        await this.save_configs_to_local()
        const params = new DdbDict(
                ({ ...config, id: new DdbLong(BigInt(config.id)), data: JSON.stringify(config.data) }))
        try {
            await model.ddb.call<DdbVoid>('add_dashboard_config', [params], { urgent: true })
        } catch (error) {
            console.log('add dashboard error:', error)
        } 
    }
    
    
    async delete_dashboard_configs (dashboard_config_ids: number[]) {
        await this.save_configs_to_local()
        try {
            await model.ddb.call<DdbVoid>('delete_dashboard_configs', [new DdbVectorLong(dashboard_config_ids)], { urgent: true })
        } catch (error) {
            console.log('delete dashboard error:', error)
        }
    }
    
    
    async update_dashboard_config (config: DashBoardConfig) {
        await this.save_configs_to_local()
        const params = new DdbDict(
            ({ ...config, id: new DdbLong(BigInt(config.id)), data: JSON.stringify(config.data) })) 
        try {
            await model.ddb.call<DdbVoid>('update_dashboard_config', [params], { urgent: true })
        } catch (error) {
            console.log('update dashboard error:', error)
        }
    }
    
    
    /** 根据 id 获取单个 DashboardConfig */
    async get_dashboard_config (id: number) {
        return model.ddb.call('get_dashboard_config', [new DdbLong(BigInt(id))], { urgent: true })
    }
    
    
    /** 从服务器获取 dashboard 配置 */
    async get_dashboard_configs () {
        if (new URLSearchParams(location.search).get('local') === '1') 
            await this.get_configs_from_local()
        else {
            const data = await (await model.ddb.call<DdbVoid>('get_dashboard_configs', [ ], { urgent: true })).to_rows()
            this.set({ configs: data.map(cfg => ({ ...cfg, id: Number(cfg.id), data: JSON.parse(cfg.data) }) as DashBoardConfig) })
            const dashboard = Number(new URLSearchParams(location.search).get('dashboard'))
            if (dashboard) {
                const config = this.configs.find(({ id }) =>  id === dashboard)
                if (config)
                    await this.update_config(config)
                else
                    this.show_error({ error: new Error(t('当前 url 所指向的 dashboard 不存在')) })
            }  
        }
    }
    
    
    /** 从浏览器获取 dashboard 配置 */
    async get_configs_from_local () {
        let configs = JSON.parse(localStorage.getItem(storage_keys.dashboards)) || [ ]
        
        this.set({ configs })
        const dashboard = Number(new URLSearchParams(location.search).get('dashboard'))
        if (dashboard) {
            const config = this.configs.find(({ id }) =>  id === dashboard)
            if (config)
                await this.update_config(config)
            else
                this.show_error({ error: new Error(t('当前 url 所指向的 dashboard 不存在')) })
        } 
    }
    
    
    /** 将配置持久化保存到浏览器 */
    async save_configs_to_local () {
        localStorage.setItem(storage_keys.dashboards, JSON.stringify(this.configs))
    }
    
    async share (dashboard_ids: number[], receivers: string[]) {
        /** 
        将 dashboard_ids 数组中的 dashboard 分享给 receivers 数组中的每一位用户，
        并存储到每一位 receiver 的 dashboard 数组中， 在后续调用 get_configs 拉取 receiver 的 dashboard 时，
        需要将分享过来的 dashboard 一起返回，并且将 owner 的值设置为 false
        */
       await model.ddb.call<DdbVoid>('share_dashboard_configs',
            [new DdbVectorLong(dashboard_ids), new DdbVectorString(receivers)], { urgent: true })
    }
    
    show_error (options: ErrorOptions) {
        show_error(this.modal, options)
    }
}


export let dashboard = window.dashboard = new DashBoardModel()


export interface DashBoardConfig {
    id: number
    
    name: string
    
    /** 当前用户是否有所有权, 被分享时 owned 为 false */
    owned?: boolean
    
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
    config?: (IChartConfig | ITableConfig | ITextConfig | IEditorConfig | IGaugeConfig) & {
        variable_ids: string[]
        abandon_scroll?: boolean
        variable_cols?: number
        with_search_btn?: boolean
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
    GAUGE = '仪表盘'
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
    GAUGE = 'GAUGE'
}


export type Result = { type: 'object', data: DdbObj<DdbValue> } | null
