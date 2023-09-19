import { NamePath } from 'antd/es/form/interface'
import { DdbObj, formati, DdbVectorValue } from 'dolphindb'
import { isNil } from 'lodash'
import { Widget } from './model.js'
import { AxisConfig, IChartConfig, ISeriesConfig } from './type.js'
import type { DataSourceNodeType } from './storage/date-source-node.js'

export function formatter (obj: DdbObj<DdbVectorValue>, max_line: number): { name: string, data: Array<string> } {
    let length = obj.rows
    let result = {
        name: obj.name,
        data: [ ]
    }
    for (let i = 1;  i <= max_line && i <= length;  i++) 
        result.data.unshift(formati(obj, length - i))
    return result
}

export function default_value_in_select (
    data_source_node: DataSourceNodeType, 
    key: string, 
    select_list: { label: string, value: string }[]): string 
{
    return (data_source_node[key] && select_list.filter(item => item.value === data_source_node[key]).length) 
        ? data_source_node[key] 
        : select_list[0].value
}



export function concat_name_path (...paths: NamePath[]): NamePath {
    return ([ ] as NamePath).concat(...paths.filter(p => !isNil(p)))
}

export function convert_chart_config (widget: Widget, data_source: any[]) {
    const { config, type } = widget
    
    const convert_data_zoom = (x_datazoom: boolean, y_datazoom: boolean) => { 
        const total_data_zoom = [
            {
                id: 'dataZoomX',
                type: 'slider',
                xAxisIndex: [0],
                filterMode: 'filter',
                start: 0,
                end: 100
            },
            {
                id: 'dataZoomY',
                type: 'slider',
                yAxisIndex: [0],
                filterMode: 'empty',
                start: 0,
                end: 100
            }
        ]
        let data_zoom = [ ]
        if (x_datazoom)
            data_zoom.push(total_data_zoom[0])
        if (y_datazoom)
            data_zoom.push(total_data_zoom[1])
        return data_zoom
    }
    
    
    const convert_axis = (axis: AxisConfig, index?: number) => ({
        show: true,
        name: axis.name,
        type: axis.type,
        data: axis.col_name ? data_source.map(item => item?.[axis.col_name]) : [ ],
        splitLine: {
            show: true,
            lineStyle: {
                type: 'dashed',
            }
        },
        position: axis.position,
        offset: axis.offset,
        alignTicks: true,
        id: index
    })
    
    const convert_series = (series: ISeriesConfig ) => ({
        type: type.toLocaleLowerCase(),
        name: series.name,
        // 防止删除yAxis导致渲染失败
        yAxisIndex: yAxis[series.yAxisIndex] ?  series.yAxisIndex : 0,
        data: data_source.map(item => item?.[series.col_name]) 
    })
    
    const { title, with_legend, with_tooltip, xAxis, series, yAxis, x_datazoom, y_datazoom } = config as IChartConfig
    
    return {
        legend: {
            show: with_legend
        },
        tooltip: {
            show: with_tooltip,
            // 与图形类型相关，一期先写死
            trigger: 'axis',
        },
        title: {
            text: title
        },
        xAxis: convert_axis(xAxis),
        yAxis: yAxis.filter(item => !!item).map(convert_axis),
        series: series.filter(item => !!item).map(convert_series),
        dataZoom: convert_data_zoom(x_datazoom, y_datazoom)
    }
}
