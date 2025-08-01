import { createRef } from 'react'

import { Model } from 'react-object-model'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'

import { DdbForm, type DdbVoid, type DdbObj, type DdbValue, DdbVectorLong, DdbLong, DdbDict, DdbInt } from 'dolphindb/browser.js'

import { GridStack, type GridStackNode, type GridItemHTMLElement } from 'gridstack'

import { assert, genid } from 'xshell/utils.browser.js'

import type { MessageInstance } from 'antd/es/message/interface.d.ts'
import type { HookAPI as ModalHookAPI } from 'antd/es/modal/useModal/index.d.ts'
import type { NotificationInstance } from 'antd/es/notification/interface.d.ts'

import { t } from '@i18n'

import { model, show_error, storage_keys } from '../model.js'
import type { Monaco } from '../components/Editor/index.js'
import type { FormatErrorOptions } from '../components/GlobalErrorBoundary.js'

import { type DataSource, type ExportDataSource, import_data_sources, unsubscribe_data_source, type DataType, clear_data_sources } from './DataSource/date-source.js'
import { type IEditorConfig, type IChartConfig, type ITableConfig, type ITextConfig, type IGaugeConfig, type IHeatMapChartConfig, type IOrderBookConfig } from './type.ts'
import type { IConfigurationConfig } from './Charts/Configuration/index.tsx'
import { type Variable, import_variables, type ExportVariable } from './Variable/variable.js'
import { DASHBOARD_SHARED_SEARCH_KEY } from './constant.ts'


/** 0 表示隐藏dashboard（未查询到结果、 server 版本为 v1 或 language 非中文），1 表示没有初始化，2 表示已经初始化，3 表示为控制节点 */
export enum InitedState {
    hidden = 0,
    uninited = 1,
    inited = 2,
    control_node = 3,
    unlogined = 4
}

export class DashBoardModel extends Model<DashBoardModel> {
    /** dashboard 初始化状态 */
    inited_state = InitedState.hidden
    
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
    
    /** 保存提示 */
    save_confirm = false
    
    // gridstack 仅支持 12 列以下的，大于 12 列需要手动添加 css 代码，详见 gridstack 的 readme.md
    // 目前本项目仅支持仅支持 <= 12
    maxcols = 12
    maxrows = 12
    
    show_config_modal = true
    
    /** 是否开启自动保存 */
    auto_save = localStorage.getItem(storage_keys.dashboard_autosave) === '1'
    
    monaco: Monaco
    
    sql_editor: monacoapi.editor.IStandaloneCodeEditor
    
    filter_column_editor: monacoapi.editor.IStandaloneCodeEditor
    
    filter_expression_editor: monacoapi.editor.IStandaloneCodeEditor
    
    variable_editor: monacoapi.editor.IStandaloneCodeEditor
    
    result: Result
    
    // console/model.js 对应黑色主题的版本
    message: MessageInstance
    
    modal: ModalHookAPI
    
    notification: NotificationInstance
    
    
    /** 初始化 GridStack 并配置事件监听器 */
    async init ($div: HTMLDivElement) {
        let grid = GridStack.init({
            //  gridstack 有 bug ，当 grid 没有 2*3 的连续空间时，再拖入一个会使所有 widget 无法 change，暂时通过计算面积阻止拖入，后续无限行数时不会再有此问题
            acceptWidgets: () => {
                let current_page_count = this.config?.data?.canvas?.page_count ?? 1 
                const max_rows = this.maxrows * current_page_count
                const max_columns = 12
                const canvas = Array.from({ length: max_columns }, () => Array(max_rows).fill(0))
                
                this.widgets.forEach(widget => {
                    for (let i = widget.x;  i < widget.x + widget.w;  i++)
                        for (let j = widget.y;  j < widget.y + widget.h;  j++)
                            canvas[i][j] = 1
                })
                
                // 使用动态规划记录每个位置上的连续空白格子数量
                const dp = Array.from({ length: max_columns }, () => Array(max_rows).fill(0))
                for (let i = 0;  i < max_columns;  i++)
                    for (let j = 0;  j < max_rows;  j++)
                        if (canvas[i][j] === 0) 
                            dp[i][j] = (j > 0 ? dp[i][j - 1] : 0) + 1
                        
                            
                    
                // 检查是否有符合条件的3x2空白区域
                for (let i = 0;  i < max_columns - 1;  i++) 
                    for (let j = 0;  j <= max_rows - 1;  j++)
                        if (dp[i][j] >= 3 && dp[i + 1][j] >= 3)
                            return true
                console.log('格子不够')
                console.log('canvas', canvas)
                console.log('dp', dp)        
                return false
            },
            float: true,
            column: this.maxcols,
            row: 0,
            margin: 0,
            draggable: { scroll: true },
            resizable: { handles: 'n,e,se,s,w' },
        }, $div)
        
        grid.cellHeight(Math.floor((window.innerHeight - 50) / this.maxrows))
        
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
                type: node.el.dataset.type as WidgetChartType,
            }
            
            this.add_widget(widget)
            
            grid.removeWidget(node.el)
        })
        
        // 响应 GridStack 中 widget 的位置或尺寸变化的事件
        grid.on('change', (event: Event, widgets: GridStackNode[]) => {
            if (widgets?.length)
                for (const widget of widgets) {
                    const past_widget = this.widgets.find(({ id }) => id === widget.id)
                    if (!past_widget)
                        continue
                    
                    if (
                        this.config?.data?.canvas?.auto_expand === false
                        && widget.y + widget.h - 1 >= (this.config?.data?.canvas?.page_count ?? 1) * 12
                    )
                        grid.update(widget.el, { y: past_widget.y, h: past_widget.h })
                    
                    Object.assign(past_widget, widget)
                }
            this.check_and_change_page()
        })
        
        window.addEventListener('resize', this.on_resize)
        
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        
        this.set({ grid, widget: null })
    }
    
    
    on_resize = () => { 
        let { grid } = this
        if (grid)
            grid.cellHeight(Math.floor((window.innerHeight - 50) / this.maxrows))
    }
    
    check_available_for_reduce_page_count (target: number) {
        let current_page_count = this.config?.data?.canvas?.page_count ?? 1 
        if (target >= current_page_count)
            return true
        for (const widget of this.widgets) 
            if (widget.y + widget.h > target * 12) {
                model.message.warning(t('部分页面仍有图表存在，请确保所有图表已移除后再调整页面数'))
                return false
            }
        return true
    }
    
    check_and_change_page () {
        let bottom_row = 0
        for (const widget of this.widgets) 
            if (widget.y + widget.h > bottom_row)
                bottom_row = widget.y + widget.h
        
        this.update_page_count(
            Math.ceil((bottom_row + 1) / 12)
        )
    }
    
    
    show_error (options: FormatErrorOptions) {
        show_error(this.modal, options)
    }
    
    
    generate_new_config (id: number, name: string, data?: DashboardData) {
        return {
            id,
            name,
            owner: model.username,
            permission: DashboardPermission.own,
            data: data ?? {
                datasources: [ ],
                variables: [ ],
                canvas: {
                    widgets: [ ],
                    page_count: 1,
                    auto_expand: true
                }
            }
        }
    }
    
    
    dispose () {
        console.log('dashboard.dispose')
        
        window.removeEventListener('resize', this.on_resize)
        this.editing = true
        
        clear_data_sources()
        // 当前选中图表时删除，再次进入会报错，因为没有清空 widget
        this.widget = null
        
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
        
        this.check_and_change_page()
    }
    
    
    delete_widget (widget: Widget) {
        const widgets = this.widgets.filter(w => w !== widget)
        
        if (widget.source_id)
            unsubscribe_data_source(widget)
        
        this.set({
            widget: widgets[0],
            widgets
        })
        
        this.check_and_change_page()
    }
    
    
    update_widget (widget: Widget) {
        if (this.widgets.find(({ id }) => id === widget.id)) { 
            Object.assign(this.widgets.find(({ id }) => id === widget.id), widget)
            this.set({ widget })
        }
        
        this.check_and_change_page()
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
            
            if (preview)
                this.set({
                    result: {
                        type: 'object',
                        data: ddbobj
                    }
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
    
    
    async execute_code (
        code = this.sql_editor.getValue(), 
        ddb = model.ddb, 
        preview = false
    ): Promise<{
        type: 'success' | 'error'
        result: string | DdbObj<DdbValue>
    }> {
        try {
            const result = await this.eval(code, ddb, preview)
            return {
                type: 'success',
                result
            }
        } catch (error) {
            return {
                type: 'error',
                result: error.message
            }
        }
    }
    
    
    /** 获取分享的用户列表 */
    // async get_user_list () {
    //     const users = ((await model.ddb.call<DdbObj>('dashboard_get_user_list')).value) as string[]
    //     this.set({ users: users })
    // }
    
    
    async add_dashboard_config (config: DashBoardConfig, render: boolean = true) {
        this.set({ configs: [config, ...this.configs], config })
        const { id, name, permission, data } = config
        const params = new DdbDict(
            ({ id: new DdbLong(id), name, permission: new DdbInt(permission), data: JSON.stringify(data) }))
        await model.ddb.call<DdbVoid>('dashboard_add_config', [params])
        if (render)
            await this.render_with_config(config)
    }
    
    
    async delete_dashboard_configs (dashboard_config_ids: number[], render: boolean = true) {
        const delete_ids = new Set(dashboard_config_ids)
        const filtered_configs = this.configs.filter(({ id }) => !delete_ids.has(id))
        this.set({ configs: filtered_configs, config: filtered_configs[0] })
        await model.ddb.call<DdbVoid>('dashboard_delete_configs', [new DdbDict({ ids: new DdbVectorLong(dashboard_config_ids) })])
        if (filtered_configs.length && render)
            await this.render_with_config(filtered_configs[0])   
    }
    
    
    async update_dashboard_config (config: DashBoardConfig) {
        const index = this.configs.findIndex(({ id }) => id === config.id)
        this.set({ configs: this.configs.toSpliced(index, 1, config), config })
        const params = new DdbDict(
            ({ id: new DdbLong(config.id), data: JSON.stringify(config.data) })) 
        await model.ddb.call<DdbVoid>('dashboard_edit_config', [params])
    }
    
    
    async rename_dashboard (dashboard_id: number, new_name: string) {
        await model.ddb.call<DdbVoid>('dashboard_rename_config', [new DdbDict({ id: new DdbLong(dashboard_id), name: new_name })])
    
        const index = this.configs.findIndex(({ id }) => id === dashboard_id)
        const config = this.configs[index]
        config.name = new_name
        this.set({ configs: this.configs.toSpliced(index, 1, config), config })
    }
    
    
    /** 根据 id 获取单个 DashboardConfig */
    async get_dashboard_config (id: number): Promise<DashBoardConfig> {
        const data = await model.ddb.invoke('dashboard_get_config', [{ id: String(id) }])
        
        const res: any = data.length
            ? ({
                  ...data[0],
                  id: Number(data[0].id),
                  data: JSON.parse(JSON.parse(data[0].data))
              } as DashBoardConfig)
            : null
        
        // datasource 历史数据默认类型为表格
        return {
            ...res,
            data: {
                ...res.data,
                datasources: res?.data?.datasources.map(item => ({ type: DdbForm.table, ...item }))
            }
        }
}
    
    
    /** 从服务器获取 dashboard 配置 */
    async get_dashboard_configs () {
        const configs = (await model.ddb.invoke('dashboard_get_config_list') || [ ])
            .map(cfg => {
                // 有些只需要 parse 一次，有些需要 parse 两次
                let data = typeof cfg.data === 'string' ?  JSON.parse(cfg.data) : new TextDecoder().decode(cfg.data)
                data = typeof data === 'string' ? JSON.parse(data) : data
                return { 
                    ...cfg, 
                    id: Number(cfg.id), 
                    data: {
                        ...data,
                        // 历史数据的数据源类型统一修改为表格类型
                        datasources: data.datasources.map(item => ({ type: DdbForm.table, ...item }))
                    }
                } as DashBoardConfig
            })
        this.set({ configs })
    }
    
    
    async render_with_config (config: DashBoardConfig) {
        this.set({ loading: true })
        
        this.set({
            config,
            
            variables: await import_variables(config.data.variables),
         
            data_sources: await import_data_sources(config.data.datasources),
            
            widgets: config.data.canvas.widgets.map(widget => ({
                ...widget,
                source_id: typeof widget.source_id === 'string' ? Array.of(widget.source_id) : widget.source_id,
                ref: createRef()
                })) as Widget[],
         
            widget: null,
            
         })
         
        model.goto(`/dashboard/${config.id}/`)
        
        this.set({ loading: false })
    }
    
    
    return_to_overview () {
        clear_data_sources()
        
        dashboard.set({ config: null, save_confirm: false })
        
        model.goto('/dashboard/', { queries: { preview: null, [DASHBOARD_SHARED_SEARCH_KEY]: null  } })
        
        model.set({ sider: true, header: true })
    }
    
    on_preview () {
        dashboard.set_editing(false)
        model.set_query('preview', '1')
    }
    
    on_set_auto_expand ( auto_expand: boolean) {
        this.set({
            config: {
                ...this.config,
                data: {
                    ...this.config.data,
                    canvas: {
                        ...this.config.data.canvas,
                        auto_expand
                    }
                }
            }
        })
    }
    
    update_page_count (page_count: number) {
        // 如果 page_count 减少，要看看减少的页面上面有没有组件，有的话就弹窗不允许减少
        if (!this.check_available_for_reduce_page_count(page_count))
            return
        
        if (this.config.data.canvas.auto_expand === false) 
            return
        
        this.set({
            config: {
                ...this.config,
                data: {
                    ...this.config.data,
                    canvas: { ...this.config.data.canvas, page_count }
                }
            }
        })
        
        this.update_css_for_element_height(page_count)
    }
    
    update_css_for_element_height (page_count: number, style_sheet_id = 'dynamic-grid-styles') { // 添加默认 ID
        // 计算高度值
        let height_value = page_count === 1
            ? '100% !important'
            : `calc(${page_count * 100}vh - ${page_count * 50}px) !important`
        if (page_count === 1) 
            height_value = '100% !important'
        
        // 创建新的样式表
        let style_sheet = document.getElementById(style_sheet_id)
        
        // 如果没有找到，则创建一个新的样式表并添加 ID
        if (!style_sheet) {
            style_sheet = document.createElement('style')
            style_sheet.id = style_sheet_id
            document.head.appendChild(style_sheet)
        }
        
        // 设置样式表的内容
        style_sheet.innerHTML = `.grid-stack { height: ${height_value}; max-height: ${height_value}; }`
    }
}


export let dashboard = window.dashboard = new DashBoardModel()


export interface DashBoardConfig {
    id: number
    
    name: string
    
    owner: string
    
    /** 当前用户是否有所有权, 被分享时 owned 为 false */
    permission: DashboardPermission
    
    data: DashboardData
}

export interface DashboardData {
     /** 数据源配置 */
     datasources: ExportDataSource[]
        
     /** 变量配置 */
     variables: ExportVariable[]
     
     /** 画布配置 */
     canvas: {
         widgets: any[]
         page_count?: number
         auto_expand?: boolean | undefined
     }
}


/** dashboard 中我们自己定义的 Widget，继承了官方的 GridStackWidget，加上额外的业务属性 */
export interface Widget extends GridStackNode {
    /** 保存 dom 节点，在 widgets 配置更新时将 ref 给传给 react `<div>` 获取 dom */
    ref: React.RefObject<GridItemHTMLElement>
    
    /** 图表类型 */
    type: WidgetChartType
    
    /** 数据源 id */
    source_id?: string[]
    
    /** 更新图表方法 */
    update_graph?: (data: DataType) => void
    
    /** 图表配置 */
    config?: (IHeatMapChartConfig | IChartConfig | ITableConfig | ITextConfig | IEditorConfig | IGaugeConfig | IOrderBookConfig | IConfigurationConfig) & {
        variable_ids?: string[]
        variable_cols?: number
        with_search_btn?: boolean
        search_btn_label?: string
        variable_form_label_col?: number
        padding?: {
            left: number
            right: number
            top: number
            bottom: number
        }
    }
    
    /** 在 graph-item 渲染组件和配置组件之间通过 widget 传递数据 */
    data?: any
}


export enum WidgetType {
    BAR = '柱状图',
    LINE = '折线图',
    PIE = '饼图',
    TABLE = '表格',
    OHLC = 'K 线',
    MIX = '混合图',
    ORDER = '订单图',
    TEXT = '富文本',
    DESCRIPTIONS = '描述表',
    EDITOR = '编辑器',
    GAUGE = '仪表盘',
    RADAR = '雷达图',
    VARIABLE = '变量',
    SCATTER = '散点图',
    COMPOSITE_GRAPH = '多源图',
    HEATMAP = '热力图',
    CONFIGURATION = '组态图',
}

export enum WidgetChartType { 
    BAR = 'BAR',
    LINE = 'LINE',
    MIX = 'MIX',
    PIE = 'PIE',
    TABLE = 'TABLE',
    OHLC = 'OHLC',
    ORDER = 'ORDER',
    TEXT = 'TEXT',
    DESCRIPTIONS = 'DESCRIPTIONS',
    EDITOR = 'EDITOR',
    GAUGE = 'GAUGE',
    RADAR = 'RADAR',
    VARIABLE = 'VARIABLE',
    SCATTER = 'SCATTER',
    HEATMAP = 'HEATMAP',
    COMPOSITE_GRAPH = 'COMPOSITE_GRAPH',
    CONFIGURATION = 'CONFIGURATION',
}

export enum DashboardPermission {
    own = 0,
    edit = 1,
    view = 2
}

export const WidgetTypeWithoutDatasource = ['TEXT', 'EDITOR', WidgetChartType.VARIABLE]


export type Result = { type: 'object', data: DdbObj<DdbValue> } | null
