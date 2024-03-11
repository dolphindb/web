import { type NamePath } from 'antd/es/form/interface'
import { type DdbObj, DdbForm, DdbType, nulls, type DdbValue, format, type InspectOptions, type DdbMatrixValue } from 'dolphindb/browser.js'
import { is_decimal_null_value } from 'dolphindb/shared/utils/decimal-type.js'
import { isNil, isNumber, pickBy, uniq } from 'lodash'
import { createRef } from 'react'
import { genid } from 'xshell/utils.browser.js'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'

import { WidgetChartType, type Widget, dashboard, DashboardPermission } from './model.js'
import { type AxisConfig, type IChartConfig, type ISeriesConfig } from './type.js'
import { subscribe_data_source, type DataSource, get_data_source } from './DataSource/date-source.js'
import { AxisType, ILineType, MarkPresetType, ThresholdShowType, ThresholdType } from './ChartFormFields/type.js'
import { find_variable_by_name, get_variable_copy_infos, get_variable_value, paste_variables, subscribe_variable } from './Variable/variable.js'
import { t } from '../../i18n/index.js'
import { type DdbTable } from 'dolphindb'
import type { EChartsInstance } from 'echarts-for-react'
import { formati } from 'dolphindb'


export function format_time (time: string, format: string) {
    if (!format)
        return time
    try {
        return isNaN(dayjs(time).day()) ? dayjs(time, format).format(format)  : dayjs(time).format(format)
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

export function sql_formatter (obj: DdbObj<DdbValue>, max_line: number): any {
    switch (obj.form) {
        case DdbForm.matrix:
            // 行数、列数
            const { cols: col_num, rows: row_num, value } = obj
            // 行标签、列标签与数据
            const { cols: col_label, rows: row_babel, data } = value as DdbMatrixValue
            let matrix_data = [ ]
            for (let i = 0;  i < row_num;  i++) { 
                let row_data = [ ]
                for (let j = 0;  j < col_num;  j++)
                    row_data.push(data[i + row_num * j])
                matrix_data.push(row_data)
            }
            
            function convert_labels (num: number, obj) {
                if (!obj)
                    return null
                let labels = [ ]
                for (let i = 0;  i < num;  i++)  
                    labels.push(formati(obj, i))
                return labels        
            }
            return {
                data: matrix_data,
                col_labels: convert_labels(col_num, col_label) ?? Array.from(new Array(col_num).keys()),
                row_labels: convert_labels(row_num, row_babel) ?? Array.from(new Array(row_num).keys())
            }
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
            throw new Error('返回结果必须是 table 或 matrix')
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
    if (obj.form !== DdbForm.table)
        return [ ]
    const cols = [ ]
    for (let i = 0;  i < obj.cols;  i++) 
        cols.push(obj.value[i].name)
    return cols
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



export function concat_name_path (...paths: (NamePath | NamePath[])[]): NamePath {
    return paths.reduce((prev, p) => {
        if (isNil(p))
            return prev
        else if (Array.isArray(p))  
            return prev.concat(p)
        else
            return prev.concat([p])
    }, [ ])
}

/** type 表示轴类型，传入 0 的时候代表 X 轴，其余时候为 Y 轴 */
export function get_axis_range (type: number, echart_instance: EChartsInstance, idx: number) { 
    return echart_instance.getModel().getComponent(type === 0 ? 'xAxis' : 'yAxis', idx).axis.scale._extent
}

function get_data_source_cols (data_source_id, col) {
    return get_data_source(data_source_id).data.map(item => item[col])
} 

export function convert_chart_config (
    widget: Widget,
    data_source: any[],
    axis_range_map?: { [key: string]: { min: number, max: number } }
) {
    const { config } = widget
    
    const { title, title_size, splitLine, xAxis, series, yAxis, x_datazoom, y_datazoom, legend, animation, tooltip, thresholds = [ ] } = config as IChartConfig
    
    function convert_data_zoom (x_datazoom: boolean, y_datazoom: boolean) { 
        const total_data_zoom = [
            {
                id: 'dataZoomX',
                type: 'slider',
                show: true,
                xAxisIndex: [0],
                filterMode: 'filter',
                height: 24,
            },
            {
                id: 'dataZoomY',
                show: true,
                type: 'slider',
                yAxisIndex: [0],
                filterMode: 'empty',
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
            data = axis.col_name ? data_source.map(item => format_time(item?.[axis.col_name], axis.time_format)) : [ ]
        
        const axis_config = {
            show: true,
            name: axis.name,
            type: axis.type,
            interval: axis.interval,
            splitLine: {
                show: true,
                lineStyle: { 
                    type: 'dashed',
                    color: '#6E6F7A'
                },
                ...splitLine,
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
            },
            min: [AxisType.TIME, AxisType.VALUE].includes(axis.type) ? axis.min : undefined,
            max: [AxisType.TIME, AxisType.VALUE].includes(axis.type) ? axis.max : undefined
        }
        
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
        
        let data = [ ]
        
        // 多数据源的情况下，series 中会有 data_source_id 和 x_col_name，代表数据源 id 和 x 轴名称
        const { col_name, x_col_name, data_source_id, yAxisIndex } = series
        
        if (data_source_id) {
            // 多数据源的情况
            const x_data = get_data_source_cols(data_source_id, x_col_name).map(x => format_time(x, xAxis.time_format))
            const y_data = get_data_source_cols(data_source_id, col_name).map(y => format_time(y, yAxis[yAxisIndex]?.time_format))
            data = x_data.map((x, idx) => ([x, y_data[idx]]))
        } else  
            data = data_source.map(item => [format_time(item?.[xAxis.col_name], xAxis.time_format), item?.[series.col_name]])
        
        // {b} 代表 xAxis 中的 data，x 轴的数据现在都在 series 中，需要替换
        let end_label_formatter = series?.end_label_formatter
        if (end_label_formatter)
            end_label_formatter = end_label_formatter.replaceAll('{b}', '{@[0]}').replaceAll('{c}', '{@[1]}')
        
        return {
            type: series.type?.toLowerCase(),
            name: series.name,
            symbol: series.type === WidgetChartType.SCATTER ? series?.symbol ?? 'circle' : 'none',
            symbolSize: series.symbol_size ?? 10,
            stack: series.stack,
            endLabel: {
                show: series.end_label,
                formatter: end_label_formatter,
                color: '#fff',
                backgroundColor: 'inherit',
                padding: 4,
            },
            // endLabel 标签不重叠
            labelLayout: {
              moveOverlap: 'shiftY', 
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
                color: series.color,
                width: series.line_width
            },
            areaStyle: series.is_filled ? {
                opacity: series.opacity
            } : null
            
        }
    }
    
    let echarts_series = series.filter(Boolean).map(convert_series)
    const valid_thresholds = thresholds.filter(item => item && item.show_type !== ThresholdShowType.NONE)
    
    // 根据阈值，为 series 添加 markArea 或者 markLine
    for (let threshold of valid_thresholds)  
        // x 轴设置区域
        if (threshold.axis_type === 0) {
            // x 轴只有 1 个，所以直接更改第一个 series 的 markArea 或者 markLine 即可
            const idx = 0
            let valid_values = threshold.values.filter(item => item?.value && isFinite(item?.value))
            
            if (threshold.type === ThresholdType.PERCENTAGE && axis_range_map) {
                // 百分比分界需要计算 values 中实际的 value 值
                const { min = 0, max = 0 } = axis_range_map[`x_${threshold.axis}`] ?? { }
                valid_values = valid_values.map(item => ({ ...item, value: (max - min) * item.value / 100 + min }))
            }
            
            let mark_area_data = [ ]
            let mark_line_data = [ ]
            
            
            const sorted_values = valid_values.filter(Boolean).sort((a, b) => a.value - b.value)
            
            
            for (let i = 0;  i < sorted_values.length;  i++)  
                // 区域颜色分界
                if (threshold.show_type === ThresholdShowType.FILLED_REGION)
                    mark_area_data.push([
                        {
                            xAxis: sorted_values[i].value,
                            itemStyle: { color: sorted_values[i].color }
                        },
                        { xAxis: sorted_values[i + 1]?.value }
                    ]) 
                else
                    // 值颜色分界
                    mark_line_data.push({
                        xAxis: sorted_values[i].value,
                        lineStyle: {
                            color: sorted_values[i].color,
                            type: threshold.line_type ?? ILineType.SOLID,
                            width: threshold.line_width
                        }
                    })
            
            echarts_series[idx] = {
                ...echarts_series[idx],
                markArea:  { data: mark_area_data },
                markLine: { 
                    symbol: ['none', 'none'],
                    data: mark_line_data
                },
            } as any
        }
        else { 
            // 需要根据关联的 Y 轴找到第一个数据列，然后为此数据列设置 markArea 或者 markLine
            const idx = series.findIndex(item => item.yAxisIndex === threshold.axis)
            let valid_values = threshold.values.filter(item => isFinite(item?.value))
            
            if (threshold.type === ThresholdType.PERCENTAGE && axis_range_map) { 
                // 获取 Y 轴最大值，将阈值转化为绝对值
                const { min = 0, max = 0 } = axis_range_map[`y_${threshold.axis}`] ?? { }
                valid_values = valid_values.map(item => ({ ...item, value: (max - min) * item.value / 100 + min }))
            }
                
            let mark_area_data = [ ]
            let mark_line_data = [ ]
            const sorted_values = valid_values.sort((a, b) => a.value - b.value)
            
            for (let i = 0;  i < sorted_values.length;  i++)  
                // 区域颜色分界
                if (threshold.show_type === ThresholdShowType.FILLED_REGION)
                    mark_area_data.push([
                        {
                            yAxis: sorted_values[i].value,
                            itemStyle: { color: sorted_values[i].color }
                        },
                        { yAxis: sorted_values[i + 1]?.value }
                    ]) 
                else
                    // 值颜色分界
                    mark_line_data.push({
                        yAxis: sorted_values[i].value,
                        lineStyle: {
                            color: sorted_values[i].color,
                            type: threshold.line_type ?? ILineType.SOLID,
                            width: threshold.line_width
                        }
                    })
                    
            echarts_series[idx] = {
                ...echarts_series[idx],
                markArea: { data: mark_area_data },
                markLine: { 
                    symbol: ['none', 'none'],
                    data: mark_line_data
                },
            } as any
        }
    
    const options =  {
        animation,
        grid: {
            containLabel: true,
            left: 10,
            bottom: x_datazoom ? 50 : 10
        },
        legend: pickBy({
            show: true,
            textStyle: {
                color: '#e6e6e6',
                ...legend?.textStyle,
            },
            ...legend,
        }, v => !isNil(v) && v !== ''),
        tooltip: {
            show: true,
            ...tooltip,
            // 与图形类型相关，一期先写死
            trigger: 'axis',
            backgroundColor: '#060606',
            borderColor: '#060606',
            textStyle: {
                color: '#F5F5F5'
            },
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
        series: echarts_series,
        dataZoom: convert_data_zoom(x_datazoom, y_datazoom)
    }
    return options
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
        if (isFinite(val) && isNumber(decimal_places)) {
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


export function copy_widget (widget: Widget) { 
    if (!widget)
        return
    // 不直接 JSON.stringify(widget) 是因为会报错循环引用
    const copy_text = JSON.stringify({
        widget: {
            config: widget.config,
            type: widget.type,
            source_id: widget.source_id,
            x: widget.x,
            y: widget.y,
            w: widget.w,
            h: widget.h
        },
        ...get_variable_copy_infos(widget.config?.variable_ids || [ ])
    })
    try {
        copy(copy_text)
        dashboard.message.success(t('复制成功'))
     } catch (e) {
        dashboard.message.error(t('复制失败'))
    }
}


export async function paste_widget (event) { 
    try {
        const paste_widget = safe_json_parse((event.clipboardData).getData('text')).widget
        
        if (!paste_widget)
            return
        
        await paste_variables(event, true)
        
        const paste_widget_el = {
            ...paste_widget,
            ref: createRef(),
            id: String(genid()),
        }
        dashboard.add_widget(paste_widget_el)
        await subscribe_data_source(paste_widget_el, paste_widget_el.source_id)
    } catch (error) {
        dashboard.message.error(error.message)
    }
}


export function check_name (new_name: string) {
    if (!new_name.trim()) 
        return t('dashboard 名称不允许为空')
    else if (new_name.includes('/') || new_name.includes('\\')) 
        return t('dashboard 名称中不允许包含 "/" 或 "\\" ')
    else if (dashboard.configs.find(({ name, permission }) => name === new_name && permission === DashboardPermission.own)) 
        return t('名称重复，请重新输入')    
}


export function get_sql_col_type_map (obj: DdbTable): Record<string, DdbType> { 
    const col_type_map: Record<string, DdbType> = { } 
    for (let col_obj of obj.value)  
        col_type_map[col_obj.name] = col_obj.type
    return col_type_map
}


export async function get_streaming_col_type_map (table_name: string): Promise<Record<string, DdbType>> {
    const col_types_map: Record<string, DdbType> = { }
    const schema_table = (await dashboard.eval(`schema(${table_name})['colDefs']`)).value as DdbObj<DdbValue>[]
    
    const cols = schema_table.find(item => item.name === 'name').value as string[]
    const ddb_types = schema_table.find(item => item.name === 'typeInt').value as DdbType[]
    
    for (let i = 0;  i < cols.length;  i++)
        col_types_map[cols[i]] = ddb_types[i]
        
    return col_types_map
}
export function get_chart_data_type (chart_type: WidgetChartType) {
    switch (chart_type) { 
        case WidgetChartType.HEATMAP:
            return DdbForm.matrix
        default: 
            return DdbForm.table
    }
}
