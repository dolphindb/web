import { createRef } from 'react'

import { Model } from 'react-object-model'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'

import { DdbForm, type DdbVoid, type DdbObj, type DdbStringObj, type DdbValue } from 'dolphindb/browser.js'

import { GridStack, type GridStackNode, type GridItemHTMLElement } from 'gridstack'

import { assert, genid } from 'xshell/utils.browser.js'

import type { MessageInstance } from 'antd/es/message/interface.js'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm.js'
import type { NotificationInstance } from 'antd/es/notification/interface.js'
import { import_data_sources } from './DataSource/date-source.js'

import { t } from '../../i18n/index.js'
import { Monaco } from '../shell/Editor/index.js'
import { model, show_error, type ErrorOptions } from '../model.js'
import { unsub_data_source, type DataType } from './DataSource/date-source.js'
import { IChartConfig, ITableConfig } from './type.js'


class DashBoardModel extends Model<DashBoardModel> {
    /** 所有 dashboard 的配置 */
    configs: DashBoardConfig[]
    
    /** 当前 dashboard 配置 */
    config: DashBoardConfig
    
    
    /** GridStack.init 创建的 gridstack 实例 */
    grid: GridStack
    
    /** 画布中所有的图表控件 */
    widgets: Widget[] = [ ]
    
    /** 当前选中的图表控件，焦点在画布时可能为 null (是否合理？不合理可以再加一个 focused 属性) */
    widget: Widget | null
    
    /** 编辑、预览状态切换 */
    editing = true
    
    // gridstack 仅支持 12 列以下的，大于 12 列需要手动添加 css 代码，详见 gridstack 的 readme.md
    // 目前本项目仅支持仅支持 <= 12
    maxcols = 12
    maxrows = 12
    
    monaco: Monaco
    
    editor: monacoapi.editor.IStandaloneCodeEditor
    
    result: Result
    
    executing = false
    
    
    // console/model.js 对应黑色主题的版本
    message: MessageInstance
    
    modal: Omit<ModalStaticFunctions, 'warn'>
    
    notification: NotificationInstance
    
    
    /** 初始化 GridStack 并配置事件监听器 */
    async init ($div: HTMLDivElement) {
        await this.get_configs()
        if (!this.config) {
            const new_dashboard_config = {
                id: genid(),
                name: 'dashboard_0',
                datasources: [ ],
                canvas: {
                    widgets: [ ],
                }
            }
            this.set({ config: new_dashboard_config, 
                       configs: [new_dashboard_config],
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
        
        // 响应用户从外部添加新 widget 到 GridStack 的事件
        grid.on('dropped', (event: Event, old_node: GridStackNode, node: GridStackNode) => {
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
            
            this.add_widget(widget)
            
            grid.removeWidget(node.el)
        })
        
        // 响应 GridStack 中 widget 的位置或尺寸变化的事件
        grid.on('change', (event: Event, widgets: GridStackNode[]) => {
            console.log('修改 widget 大小或位置:', widgets)
            
            for (const widget of widgets)
                Object.assign(
                    this.widgets.find(({ id }) => id === widget.id), 
                    widget
                )
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
        this.set({ grid })
    }
    
    
    async load_config () {
        await import_data_sources(this.config.datasources) 
        this.set({ widgets: this.config.canvas.widgets.map(widget => ({
            ...widget, 
            ref: createRef(), 
        })) as any  })
    }
    
    
    dispose () {
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
            unsub_data_source(widget)
        
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
    
    
    async eval (code = this.editor.getValue()) {
        this.set({ executing: true })
        
        try {
            let ddbobj = await model.ddb.eval(
                code.replaceAll('\r\n', '\n')
            )
            if (model.verbose)
                console.log('=>', ddbobj.toString())
            
            if (
                ddbobj.form === DdbForm.chart ||
                ddbobj.form === DdbForm.dict ||
                ddbobj.form === DdbForm.matrix ||
                ddbobj.form === DdbForm.set ||
                ddbobj.form === DdbForm.table ||
                ddbobj.form === DdbForm.vector
            )
                this.set({
                    result: {
                        type: 'object',
                        data:  ddbobj
                    },
                })
            else if (ddbobj.form === DdbForm.scalar)
                return ddbobj.value
                
        } catch (error) {
            this.set({
                result: null,
            })
            throw error
        } finally {
            this.set({ executing: false })
        }
    }
    
    
    async execute (code?: string): Promise<{
        type: 'success' | 'error'
        result: string | Result
    }> {
        if (dashboard.executing) {
            this.message.warning(t('当前连接正在执行作业，请等待'))
            return {
                type: 'error',
                result: '当时连接正在执行作业，无返回结果，请重新保存'
            }
        }
        
        else 
            try {
                await this.eval(code)
                return {
                    type: 'success',
                    result: this.result
                }
            } catch (error) {
                return {
                    type: 'error',
                    result: error.message
                }
            }
    }
    
    
    /** 从服务器获取 dashboard 配置 */
    async get_configs () {
        const configs: DashBoardConfig[] = JSON.parse(
            (await model.ddb.call<DdbStringObj>('get_dashboard_configs'))
                .value
        )
        
        this.set({
            configs,
            config: configs[0]
        })
    }
    
    
    /** 将配置持久化保存到服务器 */
    async save_configs () {
        await model.ddb.call<DdbVoid>('set_dashboard_configs', [JSON.stringify(this.configs)])
    }
    
    
    show_error (options: ErrorOptions) {
        show_error(this.modal, options)
    }
}


export let dashboard = window.dashboard = new DashBoardModel()


interface DashBoardConfig {
    id: number
    
    name: string
    /** 数据源配置 */
    datasources: {
        id: string
    }[ ]
    
    /** 画布配置 */
    canvas: {
        widgets: any[]
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
    config?: IChartConfig | ITableConfig
}


export enum WidgetType {
    BAR = '柱状图',
    LINE = '折线图',
    // PIE = '饼图',
    // POINT = '散点图',
    TABLE = '表格',
    OHLC = 'OHLC',
    // CANDLE = '蜡烛图',
    // ORDER = '订单图',
    // NEEDLE = '数值针型图',
    // STRIP = '带图',
    // HEAT = '热力图',
    TEXT = '富文本'
}

export enum WidgetChartType { 
    BAR = 'BAR',
    LINE = 'LINE',
    // PIE = 'PIE',
    // POINT = 'POINT',
    TABLE = 'TABLE',
    OHLC = 'OHLC',
    // CANDLE = 'CANDLE',
    // ORDER = 'ORDER',
    // NEEDLE = 'NEEDLE',
    // STRIP = 'STRIP',
    // HEAT = 'HEAT'
    TEXT = 'TEXT'
}


type Result = { type: 'object', data: DdbObj<DdbValue> } | null
