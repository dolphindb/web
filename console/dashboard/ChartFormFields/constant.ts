import { t } from '../../../i18n/index.js'
import { WidgetChartType, WidgetType } from '../model.js'

import { AxisType, ILineType, ITimeFormat, MarkPresetType, Position } from './type.js'

export const axis_type_options = [{
    label: t('数据轴'),
    value: AxisType.VALUE
},
{
    label: t('类目轴'),
    value: AxisType.CATEGORY
},
{
    label: t('时间轴'),
    value: AxisType.TIME,
},
{
    label: t('对数'),
    value: AxisType.LOG
}]

export const axis_position_options = [
    { value: Position.LEFT, label: t('左侧') },
    { value: Position.RIGHT, label: t('右侧') }
]

export const mark_point_options = [
    {
        value: MarkPresetType.MAX,
        label: t('最大值')
    },
    {
        value: MarkPresetType.MIN,
        label: t('最小值')
    }
]

export const mark_line_options = [...mark_point_options, {
    value: MarkPresetType.AVERAGE,
    label: t('平均值')
}]


export const line_type_options = [
    {
        value: ILineType.SOLID,
        label: t('实线')
    },
    {
        value: ILineType.DASHED,
        label: t('虚线')
    },
    {
        value: ILineType.DOTTED,
        label: t('点线')
    },
    
]


export const chart_type_options = [
    {
        label: WidgetType.BAR,
        value: WidgetChartType.BAR
    },
    {
        label: WidgetType.LINE,
        value:  WidgetChartType.LINE
    },
    {
        label: WidgetType.SCATTER,
        value: WidgetChartType.SCATTER
    }
]




export const format_time_options = Object.values(ITimeFormat).map(val => ({
    label: val,
    value: val
}))


// const TIME_RANGE_MAP = {
//     [ITimeFormat.DATE]: <String
// }
