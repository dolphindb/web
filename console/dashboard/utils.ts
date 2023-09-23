import { NamePath } from 'antd/es/form/interface'
import { DdbObj, DdbForm, DdbType, nulls, DdbValue, format } from 'dolphindb'
import { is_decimal_null_value } from 'dolphindb/shared/utils/decimal-type.js'
import { isNil } from 'lodash'
import { assert } from 'xshell/utils.browser.js'

import { Widget } from './model.js'
import { AxisConfig, IChartConfig, ISeriesConfig } from './type.js'
import { DataSource } from './DataSource/date-source.js'
import { t } from '../../i18n/index.js'
import { MarkPresetType } from './ChartFormFields/type.js'
import { LeftCircleTwoTone } from '@ant-design/icons'

function formatter (type, value, le, index?, values?) {
    switch (type) {
        case DdbType.bool: {
            return value === nulls.int8 ?
                null
                :
                    Boolean(value)
        }
        case DdbType.char:
            return value === nulls.int8 ? null : value
        case DdbType.short:
            return value === nulls.int16 ? null : value
        case DdbType.int:
            return value
        case DdbType.date:
            return format(type, value, le)
        case DdbType.month:
            return format(type, value, le)
        case DdbType.time:
            return format(type, value, le)
        case DdbType.minute:
            return format(type, value, le)
        case DdbType.second:
            return format(type, value, le)
        case DdbType.datetime:
            return format(type, value, le)
        case DdbType.datehour:
            return value === nulls.int32 ? null : format(type, value, le)
        case DdbType.long:
        case DdbType.timestamp:
            return format(type, value, le)
        case DdbType.nanotime:
            return format(type, value, le)
        case DdbType.nanotimestamp:
            return value === nulls.int64 ? null : format(type, value, le)
        case DdbType.int128:
            return value === nulls.int128 ? null : value
        case DdbType.float:
            return value === nulls.float32 ? null : value
        case DdbType.double:
            return value === nulls.double ? null : value
        case DdbType.decimal32:
        case DdbType.decimal64:
        case DdbType.decimal128:
            return is_decimal_null_value(type, value) ? null : value
        case DdbType.ipaddr:
            return values.subarray(16 * index, 16 * (index + 1))
        case DdbType.symbol_extended: {
            const { base, data } = values
            return base[data[index]]
        }
        default:
            return value
    }
}

export function sql_formatter (obj: DdbObj<DdbValue>, max_line: number): Array<{}> {
    assert(obj.form === DdbForm.table, t('form 必须是 DdbForm.table, 否则不能 to_rows'))
    let rows = new Array()
    let start = obj.rows - max_line
    let le = obj.le
    for (let i = start >= 0 ? start : 0;  i < obj.rows;  i++) {
        let row = { }
        for (let j = 0;  j < obj.cols;  j++) {
            const { type, name, value: values } = obj.value[j] // column
            row[name] = formatter(type, values[i], le, i, values)
        }
        rows.push(row)
    }
    return rows
}

export function stream_formatter (obj: DdbObj<DdbValue>, max_line: number, cols: string[]): Array<{}> {
    let rows = new Array()
    let start = obj.value[0].rows - max_line
    for (let i = start >= 0 ? start : 0;  i < obj.value[0].rows;  i++) {
        let row = { }
        for (let j in cols) {
            const { type, le } = obj.value[j]
            row[cols[j]] = formatter(type, obj.value[j].value[i], le)
        }    
        rows.push(row)
    }
        
    
    return rows
}

export function get_cols (obj: DdbObj<DdbValue>): Array<string> {
    const cols = [ ]
    for (let i = 0;  i < obj.cols;  i++) 
        cols.push(obj.value[i].name)
    return cols
}

export function default_value_in_select (
    data_source_node: DataSource, 
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
    
    const { title, with_legend, with_tooltip, with_split_line, xAxis, series, yAxis, x_datazoom, y_datazoom } = config as IChartConfig
    
    function convert_data_zoom (x_datazoom: boolean, y_datazoom: boolean) { 
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
            show: with_split_line,
            lineStyle: {
                type: 'dashed',
                color: '#6E6F7A'
            }
        },
        logBase: axis.log_base || 10,
        position: axis.position,
        offset: axis.offset,
        alignTicks: true,
        id: index
    })
    
    function convert_series (series: ISeriesConfig) { 
        let mark_line_data = series?.mark_line?.map(item => { 
            if (item in MarkPresetType)
                return {
                    type: item,
                    name: item
                }
            else
                return { yAxis: item }
        }) || [ ]
        
        return {
            type: series.type?.toLowerCase(),
            name: series.name,
            symbol: 'none',
            stack: series.stack,
            stackStrategy: series.stack_strategy,
            // 防止删除yAxis导致渲染失败
            yAxisIndex: yAxis[series.yAxisIndex] ?  series.yAxisIndex : 0,
            data: data_source.map(item => item?.[series.col_name]),
            markPoint: {
                data: series?.mark_point?.map(item => ({
                    type: item,
                    name: item
                }))
            }, 
            markLine: {
                symbol: ['none', 'none'],
                data: mark_line_data
            },
            lineStyle: {
                type: series.line_type
            }
        }
    }
    
    
    return {
        legend: {
            show: with_legend,
            textStyle: {
                color: '#e6e6e6'
            }
        },
        tooltip: {
            show: with_tooltip,
            // 与图形类型相关，一期先写死
            trigger: 'axis',
            backgroundColor: '#1D1D1D',
            borderColor: '#333'
        },
        title: {
            text: title,
            textStyle: {
                color: '#e6e6e6',
            }
        },
        xAxis: convert_axis(xAxis),
        yAxis: yAxis.filter(item => !!item).map(convert_axis),
        series: series.filter(item => !!item).map(convert_series),
        dataZoom: convert_data_zoom(x_datazoom, y_datazoom)
    }
}


export function convert_list_to_options (list: string[]) { 
    return list.map(item => ({
        label: item,
        value: item,
        key: item,
    }))
}
