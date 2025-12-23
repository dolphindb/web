import type * as echarts from 'echarts'

import { useMemo } from 'react'

import { Collapse, Form, InputNumber } from 'antd'

import { t } from '@i18n'

import { max, min } from 'lodash'

import { BoolRadioGroup } from '@components/BoolRadioGroup/index.js'
import { StringColorPicker } from '@components/StringColorPicker/index.js'

import { AxisItem } from '@/dashboard/ChartFormFields/BasicChartFields.js'
import { BasicFormFields } from '@/dashboard/ChartFormFields/BasicFormFields.js'
import { ChartField } from '@/dashboard/ChartFormFields/type.js'
import { get_data_source } from '@/dashboard/DataSource/date-source.js'
import type { IChartConfig, MatrixData } from '@/dashboard/type.js'
import { format_time, parse_text } from '@/dashboard/utils.js'
import { DashboardEchartsComponent } from '@/dashboard/components/EchartsComponent.js'
import type { GraphComponentProps, GraphConfigProps } from '@/dashboard/graphs.ts'


export function HeatMap ({ widget }: GraphComponentProps) { 
    const config = widget.config as IChartConfig
    
    const node = get_data_source(widget.source_id[0])
    const { data } = node.use(['data'])
    
    const option = useMemo(() => { 
        const { series } = config
         
        const { data: matrix_data = [ ], row_labels = [ ], col_labels = [ ] } = data as unknown as MatrixData
        
        
        let chart_data = [ ]
        let flatten_data = [ ]
        for (let j = 0;  j < matrix_data.length;  j++)
            for (let i = 0;  i < matrix_data[j].length;  i++) {
                chart_data.push([i, j, matrix_data[j][i]])
                flatten_data.push(matrix_data[j][i])
            }
                
        
        const y_data = row_labels.map(label => format_time(label, config.yAxis[0]?.time_format))
        const x_data = col_labels.map(label => format_time(label, config.xAxis.time_format))
        
        const min_data = min(flatten_data) ?? 0
        const max_data = max(flatten_data) ?? 10
        
        const yAxis = config?.yAxis?.[0]
        const xAxis = config?.xAxis
        
        return {
            grid: {
                bottom: 60,
                containLabel: true
            },
            title: {
                show: !!config?.title,
                text: parse_text(config?.title ?? ''),
                textStyle: {
                    color: '#e6e6e6',
                    fontSize: config?.title_size || 18,
                },
                left: 0
            },
            tooltip: {
                ...config.tooltip,
                trigger: 'item',
                backgroundColor: '#060606',
                borderColor: '#060606',
                textStyle: {
                    color: '#F5F5F5'
                },
                confine: true,
                formatter: params => {
                    const [x_idx, y_idx, value] = params.data
                    const title = `<div>${x_data[x_idx]}<div/>`
                    const item = params.marker + y_data[y_idx] + `<span style="font-weight: 600; display: inline-block; margin-left: 8px;">${value}</span>`
                    return title + item
                }
                
            },
            xAxis: {
                type: 'category',
                data: x_data,
                name: xAxis?.name,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: xAxis?.axis_color || '#6E6F7A',
                    }
                },
                axisLabel: {
                    color: () => xAxis?.font_color || '#6E6F7A',
                    fontSize: xAxis?.fontsize || 12
                },
                nameTextStyle: {
                    fontSize: xAxis?.fontsize ?? 12
                }
                
            },
            yAxis: {
                type: 'category',
                data: y_data,
                name: yAxis?.name,
                show: true,
                offset: 2,
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: yAxis?.axis_color || '#6E6F7A',
                        type: 'solid',
                        width: 2,
                    }
                },
                axisLabel: {
                    color: () => yAxis?.font_color || '#6E6F7A',
                    fontSize: yAxis?.fontsize || 12
                },
                nameTextStyle: {
                    fontSize: yAxis?.fontsize ?? 12,
                },
            },
            visualMap: {
                min: series[0].min ?? Math.floor(min_data),
                max: series[0].max ?? Math.ceil(max_data),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%',
                textStyle: {
                    color: '#6C6D77'
                },
                inRange: {
                    color: [series[0].in_range?.color?.low || '#EBE1E1', series[0].in_range?.color?.high || '#983430'] 
                }
            },
            series: [{
                name: series[0].name,
                type: 'heatmap',
                data: chart_data,
                label: {
                    show: series[0].with_label
                },
            }]
        } as echarts.EChartsOption
    }, [widget.config, data])
    
    console.log(option, 'optioons')
    
    return <DashboardEchartsComponent options={option} not_merge/>
}


const axis_hidden_fields = ['col_name', 'type', 'min', 'max', 'with_zero', 'interval', 'position', 'offset', 'time_format']

export function HeatMapConfigForm ({ data_source: { cols } }: GraphConfigProps) {
    return <>
        <BasicFormFields type='chart' chart_fields={[ChartField.TOOLTIP]}/>        
        <Collapse items={[
            {
                key: 'x_axis',
                    label: t('X 轴配置'),
                    children: <AxisItem name_path='xAxis' col_names={cols} hidden_fields={axis_hidden_fields}/>,
                forceRender: true,
            },
            {
                key: 'y_axis',
                label: t('Y 轴配置'),
                children: <Form.List name='yAxis' initialValue={[{ }]}>
                    {fields => fields.map(field => <AxisItem 
                        key={field.name} 
                        name_path={field.name} 
                        col_names={cols} 
                        list_name='yAxis' 
                        hidden_fields={axis_hidden_fields}
                    />)}
                </Form.List>,
                forceRender: true,
            },
            {
            forceRender: true,
            label: t('图配置'),
            children: <>
                <Form.List name='series' initialValue={[{ }]}>
                    {fields => fields.map(field => <div key={field.name}>
                        <Form.Item label={t('阴暗色')} name={[field.name, 'in_range', 'color', 'low']} initialValue='#EBE1E1'>
                            <StringColorPicker />
                        </Form.Item>
                        <Form.Item label={t('明亮色')} name={[field.name, 'in_range', 'color', 'high']} initialValue='#983430'>
                            <StringColorPicker />
                        </Form.Item>
                        <Form.Item label={t('最小值')} name={[field.name, 'min']}>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item label={t('最大值')} name={[field.name, 'max']}>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item label={t('展示标签')} name={[field.name, 'with_label']} initialValue={false}>
                            <BoolRadioGroup />
                        </Form.Item>
                    </div>)}
                </Form.List>
            </>
        }]} />
    </>
 }
