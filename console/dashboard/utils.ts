import { type NamePath } from 'antd/es/form/interface'
import { type DdbObj, DdbForm, DdbType, nulls, type DdbValue, format } from 'dolphindb/browser.js'
import { is_decimal_null_value } from 'dolphindb/shared/utils/decimal-type.js'
import { isNil } from 'lodash'

import { type Widget } from './model.js'
import { type AxisConfig, type IChartConfig, type ISeriesConfig } from './type.js'
import { type DataSource } from './DataSource/date-source.js'
import { t } from '../../i18n/index.js'
import { AxisType, MarkPresetType } from './ChartFormFields/type.js'
import dayjs from 'dayjs'
import { get_variable_value, subscribe_variable } from './Variable/variable.js'


export function format_time (time: string, format: string) { 
    try {
        return dayjs(time).format(format)
    } catch (e) { 
        return time
    }
}

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
    switch (obj.form) {
        case DdbForm.table:
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
        default:
            throw new Error('form 必须是 DdbForm.table')
    }
    
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

export function parse_code (data_source: DataSource, type: 'code' | 'filter_column' | 'filter_expression'): string {
    try {
        let code = data_source[type].replace(/\{\{(.*?)\}\}/g, function (match, variable) {
            subscribe_variable(data_source, variable)
            return get_variable_value(variable.trim())
        })
        return code
    } catch (error) {
        throw error
    }
}



export function concat_name_path (...paths: NamePath[]): NamePath {
    return ([ ] as NamePath).concat(...paths.filter(p => !isNil(p)))
}

export function convert_chart_config (widget: Widget, data_source: any[]) {
    const { config, type } = widget
    
    const { title, title_size, with_legend, with_tooltip, with_split_line, xAxis, series, yAxis, x_datazoom, y_datazoom } = config as IChartConfig
    
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
    
    
    function convert_axis (axis: AxisConfig, index?: number) {
        let data = axis.col_name ? data_source.map(item => item?.[axis.col_name]) : [ ]
        
        if (axis.time_format)  
            data = data.map(item => format_time(item, axis.time_format))
            
        return {
            show: true,
            name: axis.name,
            type: axis.type,
            data,
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
        }
    }
    
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
        
        
        let data = data_source.map(item => item?.[series.col_name])
        
        if (xAxis.type === AxisType.TIME)  
            data = data_source.map(item => [dayjs(item?.[xAxis.col_name]).format('YYYY-MM-DD HH:mm:ss'), item?.[series.col_name]])
        
        if (xAxis.type === AxisType.VALUE || xAxis.type === AxisType.LOG)  
            data  = data_source.map(item => [item[xAxis.col_name], item[series.col_name]])
        
           
        
        return {
            type: series.type?.toLowerCase(),
            name: series.name,
            symbol: 'none',
            stack: series.stack,
            // 防止删除yAxis导致渲染失败
            yAxisIndex: yAxis[series.yAxisIndex] ?  series.yAxisIndex : 0,
            data,
            markPoint: {
                data: series?.mark_point?.map(item => ({
                    type: item,
                    name: item
                }))
            }, 
            itemStyle: {
                color: series.color,
            },
            markLine: {
                symbol: ['none', 'none'],
                data: mark_line_data
            },
            lineStyle: {
                type: series.line_type,
                color: series.color
            }
        }
    }
    
    
    return {
        grid: {
            containLabel: true,
            left: 0,
            bottom: 0
        },
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
            backgroundColor: '#060606',
            borderColor: '#060606',
            textStyle: {
                color: '#F5F5F5'
            }
        },
        title: {
            text: title,
            textStyle: {
                color: '#e6e6e6',
                fontSize: title_size || 18,
            }
        },
        xAxis: convert_axis(xAxis),
        yAxis: yAxis.filter(item => !!item).map(convert_axis),
        series: series.filter(item => !!item).map(convert_series),
        dataZoom: convert_data_zoom(x_datazoom, y_datazoom)
    }
}


export function convert_list_to_options (list: (string | number)[]) { 
    return list.map(item => ({
        label: item,
        value: item,
        key: item,
    }))
}


export function to_chart_data (data: DdbValue, datatype: DdbType) {
    switch (datatype) {
        case DdbType.int:
            return data === nulls.int32 ? null : Number(data)
            
        case DdbType.short:
            return data === nulls.int16 ? null : Number(data)
            
        case DdbType.float:
            return data === nulls.float32 ? null : Number(data)
            
        case DdbType.double:
            return data === nulls.double ? null : Number(data)
            
        case DdbType.long:
            return data === nulls.int64 ? null : Number(data)
            
        default:
            return Number(data)
    }
}


export function safe_json_parse (val) { 
    try {
        return JSON.parse(val)
    } catch (e) { 
        return val
    }
}


export function format_number (val: any, decimal_places, is_thousandth_place) {
    let value = val
    try {
        if ((typeof val === 'number' || !isNaN(Number(val))) && typeof decimal_places === 'number') {
            // 0 不需要格式化
            if (Number(val) === 0)
                return 0
            value = val.toFixed(decimal_places)
        }
        else if (typeof val === 'string') {
            const arr = safe_json_parse(val)
            if (Array.isArray(arr))
                value = JSON.stringify(arr.map(item => format_number(item, decimal_places, is_thousandth_place))).replace(/\"/g, '')
        }
        if (is_thousandth_place)
            if (value.toString().includes('.'))
                value = value.toString().replace(/\B(?=(\d{3})+(?=\.))/g, ',')
            else
                value = value.toString().replace(/\B(?=(\d{3})+$)/g, ',')
    } catch { }
    
    return value
        
}
