export type WidgetOption = {
    id: string
    /** 图表类型 */
    type: string
    /** 横轴坐标 */
    x: number
    /** 纵轴坐标 */
    y: number
    /** 宽度 */
    w: number
    /** 高度 */
    h: number
    /** 更新图表方法 */
    updateGraph?: () => void
}


export const widget_nodes: WidgetOption[] = [ ]
