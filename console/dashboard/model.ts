import { createRef } from 'react'

import { Model } from 'react-object-model'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'

import { DdbForm, DdbObj, DdbValue } from 'dolphindb/browser.js'

import { GridStack, type GridStackNode } from 'gridstack'

import { genid } from 'xshell/utils.browser.js'


import { t } from '../../i18n/index.js'
import { Monaco } from '../shell/Editor/index.js'
import { model } from '../model.js'
import { unsub_source, type DataType } from './storage/date-source-node.js'


/** dashboard 中我们自己定义的 Widget，继承了官方的 GridStackWidget，加上额外的业务属性 */
export interface Widget extends GridStackNode {
    /** 保存 dom 节点，在 widgets 配置更新时将 ref 给传给 react `<div>` 获取 dom */
    ref: React.MutableRefObject<HTMLDivElement>
    
    /** 图表类型 */
    type: keyof typeof WidgetType
    
    /** 数据源 id */
    source_id?: string
    
    /** 更新图表方法 */
    update_graph?: (data: DataType) => void
}


export enum WidgetType {
    BAR = '柱状图',
    LINE = '折线图',
    PIE = '饼图',
    POINT = '散点图',
    TABLE = '表格',
    OHLC = 'OHLC',
    CANDLE = '蜡烛图',
    ORDER = '订单图',
    NEEDLE = '数值针型图',
    STRIP = '带图',
    HEAT = '热力图'
}


type Result = { type: 'object', data: DdbObj<DdbValue> } | null

class DashBoardModel extends Model<DashBoardModel> {
    /** GridStack.init 创建的 gridstack 实例 */
    grid: GridStack
    
    widgets: Widget[] = [ ]
    
    widget: Widget
    
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
    
    
    /** 初始化 GridStack 并配置事件监听器 */
    init () {
        let grid = GridStack.init({
            acceptWidgets: true,
            float: true,
            column: this.maxcols,
            row: this.maxrows,
            margin: 0,
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
        })
        
        grid.cellHeight(Math.floor(grid.el.clientHeight / this.maxrows))
        
        // 响应用户从外部添加新 widget 到 GridStack 的事件
        grid.on('dropped', (event: Event, old_node: GridStackNode, node: GridStackNode) => {
            // old_widget 为 undefined
            
            const widget: Widget = {
                ...node,
                ref: createRef(),
                id: String(genid()),
                type: node.el.dataset.type as keyof typeof WidgetType
            }
            
            console.log('拖拽释放，添加 widget:', widget)
            
            this.add_widget(widget)
            
            grid.removeWidget(node.el)
        })
        
        // 响应 GridStack 中 widget 的位置或尺寸变化的事件
        grid.on('change', (event: Event, widgets: GridStackNode[]) => {
            console.log(event, widgets)
            
            // for (let node of items) 
            //     set_widgets(widgets => {
            //         let type: keyof typeof WidgetType = 'LINE'
            //         let widget_arr = widgets.filter(item => {
            //             if (node.id === item.id) 
            //                 type = item.type
            //             return node.id !== item.id
            //         })
            //         return [...widget_arr, { id: node.id, type, x: node.x, y: node.y, h: node.h, w: node.w }]
            //     })
        })
        
        // todo: throttle?
        window.addEventListener('resize', () => {
            grid.cellHeight(Math.floor(grid.el.clientHeight / this.maxrows))
        })
        
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        
        this.set({ grid })
    }
    
    
    dispose () {
        console.log('dispose')
        this.grid.destroy()
        this.grid = null
    }
    
    
    render_widgets () {
        let { grid, widgets } = this
        
        grid.batchUpdate(true)
        
        grid.removeAll(false)
        
        for (let widget of widgets)
            // 返回 GridItemHTMLElement 类型 (就是在 dom 节点上加了 gridstackNode: GridStackNode 属性)，好像也没什么用
            grid.makeWidget(widget.ref.current)
        
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
            unsub_source(widget)
        
        this.set({
            widget: widgets[0],
            widgets
        })
    }
    
    
    set_editing (editing: boolean) {
        this.grid.enableMove(!editing)
        this.grid.enableResize(!editing)
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
                ddbobj.form === DdbForm.vector ||
                ddbobj.form === DdbForm.scalar
            )
                this.set({
                    result: {
                        type: 'object',
                        data: ddbobj.form === DdbForm.scalar ? null : ddbobj
                    },
                })
                
        } catch (error) {
            this.set({
                result: null,
            })
            throw error
        } finally {
            this.set({ executing: false })
        }
    }
    
    
    async execute (): Promise<{
        type: 'success' | 'error'
        result: string | Result
    }> {
        if (dashboard.executing)
            model.message.warning(t('当前连接正在执行作业，请等待'))
        else 
            try {
                await this.eval()
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
}

export let dashboard = window.dashboard = new DashBoardModel()
