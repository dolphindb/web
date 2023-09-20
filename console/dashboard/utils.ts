import { NamePath } from 'antd/es/form/interface'
import { DdbObj, DdbForm, DdbType, nulls, DdbValue, format } from 'dolphindb'
import { is_decimal_null_value } from 'dolphindb/shared/utils/decimal-type.js'
import { isNil } from 'lodash'
import { assert } from 'xshell/utils.browser.js'

import { Widget } from './model.js'
import { AxisConfig, IChartConfig, ISeriesConfig } from './type.js'
import { DataSourceNode } from './storage/date-source-node.js'
import { t } from '../../i18n/index.js'

export function formatter (obj: DdbObj<DdbValue>, max_line: number): Array<{}> {
    assert(obj.form === DdbForm.table, t('form 必须是 DdbForm.table, 否则不能 to_rows'))
    let rows = new Array()
    let start = obj.rows - max_line
    let le = obj.le
    for (let i = start >= 0 ? start : 0;  i < obj.rows;  i++) {
        let row = { }
        for (let j = 0;  j < obj.cols;  j++) {
            const { type, name, value: values } = obj.value[j] // column
            switch (type) {
                case DdbType.bool: {
                    const value = values[i]
                    row[name] = value === nulls.int8 ?
                        null
                        :
                            Boolean(value)
                    break
                }
                case DdbType.char:
                    row[name] = values[i] === nulls.int8 ? null : values[i]
                    break
                case DdbType.short:
                    row[name] = values[i] === nulls.int16 ? null : values[i]
                    break
                case DdbType.int:
                    row[name] = values[i]
                    break
                case DdbType.date:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.month:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.time:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.minute:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.second:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.datetime:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.datehour:
                    row[name] = values[i] === nulls.int32 ? null : format(type, values[i], le)
                    break
                case DdbType.long:
                case DdbType.timestamp:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.nanotime:
                    row[name] = format(type, values[i], le)
                    break
                case DdbType.nanotimestamp:
                    row[name] = values[i] === nulls.int64 ? null : format(type, values[i], le)
                    break
                case DdbType.int128:
                    row[name] = values[i] === nulls.int128 ? null : values[i]
                    break
                case DdbType.float:
                    row[name] = values[i] === nulls.float32 ? null : values[i]
                    break
                case DdbType.double:
                    row[name] = values[i] === nulls.double ? null : values[i]
                    break
                case DdbType.decimal32:
                case DdbType.decimal64:
                case DdbType.decimal128:
                    row[name] = is_decimal_null_value(type, values[i]) ? null : values[i]
                    break
                case DdbType.ipaddr:
                    row[name] = values.subarray(16 * i, 16 * (i + 1))
                    break
                case DdbType.symbol_extended: {
                    const { base, data } = values
                    row[name] = base[data[i]]
                    break
                }
                default:
                    row[name] = values[i]
            }
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
    data_source_node: DataSourceNode, 
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
        logBase: axis.log_base || 10,
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
