import { type NamePath } from 'antd/es/form/interface'
import { type DdbObj, DdbForm, DdbType, nulls, type DdbValue, format, type InspectOptions } from 'dolphindb/browser.js'
import { is_decimal_null_value } from 'dolphindb/shared/utils/decimal-type.js'
import { isNil, isNumber, uniq } from 'lodash'

import { WidgetChartType, type Widget, dashboard } from './model.js'
import { type AxisConfig, type IChartConfig, type ISeriesConfig } from './type.js'
import { subscribe_data_source, type DataSource } from './DataSource/date-source.js'
import { AxisType, MarkPresetType } from './ChartFormFields/type.js'
import dayjs from 'dayjs'
import { find_variable_by_name, get_variable_value, subscribe_variable } from './Variable/variable.js'
import { createRef } from 'react'
import { genid } from 'xshell/utils.browser.js'


export function format_time (time: string, format: string) { 
    try {
        return dayjs(time).format(format || 'YYYY-MM-DD HH:mm:ss')
    } catch (e) { 
        return time
    }
}


function format_decimal (type: DdbType, values, index: number, options: InspectOptions): string {
    const { scale, data } = values
    const x = data[index]
    if (is_decimal_null_value(type, x))
        return options.nullstr ? 'null' : ''
    const s = String(x < 0 ? -x : x).padStart(scale, '0')
    const str = (x < 0 ? '-' : '') + (scale ? `${s.slice(0, -scale) || '0'}.${s.slice(-scale)}` : s)
    return str
}

function format_unit8 (type: DdbType, values, le: boolean, index: number, length: number, options: InspectOptions) {
    return format(type, (values as Uint8Array).subarray(length * index, length * (index + 1)), le, options)
}


function formatter (type: DdbType, values, le: boolean, index: number, options = { nullstr: false, grouping: false }) {
    const value = values[index]
    switch (type) {   
        case DdbType.decimal32:
            return format_decimal(type, values, index, options)
        case DdbType.decimal64:
            return format_decimal(type, values, index, options)
        case DdbType.decimal128:
            return format_decimal(type, values, index, options)
        case DdbType.ipaddr:
            return format_unit8(type, values, le, index, 16, options)
        case DdbType.point:
            return format_unit8(type, values, le, index, 2, options)
        case DdbType.int128:
            return format_unit8(type, values, le, index, 16, options)
        case DdbType.uuid:
            return format_unit8(type, values, le, index, 16, options)
        case DdbType.complex:
            return format_unit8(type, values, le, index, 2, options)
        case DdbType.symbol_extended: {
            const { base, data } = values
            return base[data[index]]
        }
        default:
            return format(type, value, le, options)
    }
}

export function sql_formatter (obj: DdbObj<DdbValue>, max_line: number): Array<{}> {
    switch (obj.form) {
        case DdbForm.table:
            const array_vectors = { }
            let rows = new Array()
            let le = obj.le
            for (let i = (max_line && obj.rows > max_line) ? obj.rows - max_line : 0;  i < obj.rows;  i++) {
                let row = { }
                for (let j = 0;  j < obj.cols;  j++) {
                    const { type, name, value: values } = obj.value[j] // column
                    if (type >= 64 && type < 128)
                        array_vectors[name] = obj.value[j]
                    else
                        row[name] = formatter(type, values, le, i)
                }
                rows.push(row)
            }
            
            for (let key in array_vectors) {
                const array_vector = array_vectors[key]
                const type = array_vector.type - 64
                const value = array_vector.value
                let offset = 0
                
                value[0].lengths.forEach((length: number, index: number) => {
                    let array = [ ]
                    
                    for (let i = offset;  i < offset + length;  i++) 
                        if (type === DdbType.decimal32 || type === DdbType.decimal64 || type === DdbType.decimal128) {
                            value[0].scale = value.scale
                            array.push(formatter(type, value[0], le, i, { nullstr: true, grouping: false }))
                        } 
                        else
                            array.push(formatter(type, value[0].data, le, i, { nullstr: true, grouping: false }))
                         
                    offset += length
                    rows[index][key] = '[' + array.map(item => item).join(',') + ']'
                })
            }
            
            return rows
        default:
            throw new Error('返回结果必须是table')
    }
    
}

export function stream_formatter (obj: DdbObj<DdbValue>, max_line: number, cols: string[]): Array<{}> {
    let rows = new Array()
    let array_vectors = { }
    for (let i = (max_line && obj.value[0].rows > max_line) ? obj.value[0].rows - max_line : 0;  i < obj.value[0].rows;  i++) {
        let row = { }
        for (let j in cols) {
            const { type, le } = obj.value[j]
            if (type >= 64 && type < 128)
                array_vectors[cols[j]] = obj.value[j]
            else
                row[cols[j]] = formatter(type, obj.value[j].value, le, i)
        }    
        rows.push(row)
    }
    
    for (let key in array_vectors) {
        const array_vector = array_vectors[key]
        const type = array_vector.type - 64
        const value = array_vector.value
        const le = value.le
        let offset = 0
        
        value[0].lengths.forEach((length: number, index: number) => {
            let array = [ ]
            
            for (let i = offset;  i < offset + length;  i++) 
                if (type === DdbType.decimal32 || type === DdbType.decimal64 || type === DdbType.decimal128) {
                    value[0].scale = value.scale
                    array.push(formatter(type, value[0], le, i, { nullstr: true, grouping: false }))
                } 
                else
                    array.push(formatter(type, value[0].data, le, i, { nullstr: true, grouping: false }))
                 
            offset += length
            rows[index][key] = '[' + array.map(item => item).join(',') + ']'
        })
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

export function parse_text (code: string): string {
    code = code.replace(/\{\{(.*?)\}\}/g, function (match, variable) {
        const variable_ = find_variable_by_name(variable.trim())
        return variable_?.value || `{{${variable.trim()}}}`
    })
    return code
}


export function parse_code (code: string, data_source?: DataSource): string {
    try {
        code = code.replace(/\{\{(.*?)\}\}/g, function (match, variable) {
            if (data_source)
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
    const { config } = widget
    
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
        let data = undefined
        // 类目轴下需要定义类目数据, 其他轴线类型下 data 不生效
        if (axis.type === AxisType.CATEGORY)
            data = axis.col_name ? data_source.map(item => item?.[axis.col_name]) : [ ]
        
        const axis_config =  {
            show: true,
            name: axis.name,
            type: axis.type,
            splitLine: {
                show: with_split_line,
                lineStyle: {
                    type: 'dashed',
                    color: '#6E6F7A'
                }
            },
            axisLabel: {
                formatter: axis.type === AxisType.CATEGORY && (value => { 
                    if (axis.time_format)
                        return format_time(value, axis.time_format)
                    else
                        return value
                })
                
            },
            logBase: axis.log_base || 10,
            position: axis.position,
            offset: axis.offset,
            alignTicks: true,
            id: index,
            scale: !axis.with_zero ?? false,
            nameTextStyle: {
                fontSize: axis.fontsize ?? 12
            }
        }
        
        if (axis.type === AxisType.CATEGORY)
            return { ...axis_config, data: uniq(data || [ ]) }
        else
            return axis_config
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
        
        // 时间轴情况下，series为二维数组，且每项的第一个值为 x轴对应的值，第二个值为 y轴对应的值，并且需要对时间进行格式化处理
        if (xAxis.type === AxisType.TIME)  
            data = data_source.map(item => [format_time(item?.[xAxis.col_name], xAxis.time_format), item?.[series.col_name]])
            
        // x 轴和 y 轴均为数据轴或者对数轴的情况下或者散点图，series 的数据为二维数组，每一项的第一个值为x的值，第二个值为y的值
        if (([AxisType.VALUE, AxisType.LOG].includes(xAxis.type) && [AxisType.VALUE, AxisType.LOG].includes(yAxis[series.yAxisIndex].type)) || series.type === WidgetChartType.SCATTER)  
            data  = data_source.map(item => [item[xAxis.col_name], item[series.col_name]])
        
        if (isNumber(series.threshold?.value))  
            data = data.map(item => ({
                value: item,
                itemStyle: {
                    color: item > series.threshold.value ? series.threshold?.high_color : series.threshold?.low_color
                }
            }))
        
        return {
            type: series.type?.toLowerCase(),
            name: series.name,
            symbol: series?.symbol || 'none',
            symbolSize: series.symbol_size,
            stack: series.stack,
            endLabel: {
                show: series.end_label,
                formatter: series.name
            },
            
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
            left: 10,
            bottom: 10
        },
        legend: {
            show: with_legend,
            top: 25,
            left: 160,
            textStyle: {
                color: '#e6e6e6',
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
            text: parse_text(title ?? ''),
            textStyle: {
                color: '#e6e6e6',
                fontSize: title_size || 18,
            }
        },
        xAxis: convert_axis(xAxis),
        yAxis: Array.isArray(yAxis) ? yAxis.filter(item => !!item).map(convert_axis) : convert_axis(yAxis),
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
        if (!isNaN(Number(val)) && typeof decimal_places === 'number') {
            // 0 不需要格式化
            if (Number(val) === 0)
                return 0
            value = Number(val).toFixed(decimal_places)
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


export async function load_styles (url: string) {
    for (const link of Array.from(document.querySelectorAll('link[rel="stylesheet"]')))
        if (link.getAttribute('href') === url)
            return
    
    return new Promise((resolve, reject) => {
        let link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        link.onload = resolve
        link.onerror = reject
        document.head.appendChild(link)
    })
}


export async function copy_widget (widget: Widget) { 
    if (!widget)
        return
    const copy_text = JSON.stringify({
        config: widget.config,
        type: widget.type,
        source_id: widget.source_id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h
    })
    try {
        await navigator.clipboard.writeText(copy_text)
        dashboard.message.success('复制成功')
     } catch (e) {
        dashboard.message.error('复制失败')
     }
}


export async function paste_widget (e) { 
    const paste_widget = safe_json_parse((e.clipboardData).getData('text'))
    if (paste_widget?.type) { 
        const paste_widget_el = {
            ...paste_widget,
            ref: createRef(),
            id: genid(),
        }
        dashboard.add_widget(paste_widget_el)
        await subscribe_data_source(paste_widget, paste_widget.source_id)
    }
}
