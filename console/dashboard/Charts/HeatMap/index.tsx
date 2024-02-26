import { AxisFormFields } from '../../ChartFormFields/BasicChartFields.js'
import { dashboard, type Widget } from '../../model.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'

import { useMemo } from 'react'
import { convert_chart_config, format_time } from '../../utils.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { ChartField } from '../../ChartFormFields/type.js'
import { get_data_source } from '../../DataSource/date-source.js'
import { Collapse, Form, InputNumber } from 'antd'
import { t } from '../../../../i18n/index.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { type MatrixData, type IChartConfig, type ISeriesConfig } from '../../type.js'

interface IProps { 
    widget: Widget
    data_source: any[]
    cols: string[]
}

export function HeatMap (props: IProps) { 
    const { widget } = props
    
    const config = widget.config as IChartConfig
    
    const node = get_data_source(widget.source_id[0])
    const { data } = node.use(['data'])
    
    const options = useMemo(() => { 
        const default_options = convert_chart_config({ ...widget, config: { ...widget.config, series: [ ] } }, [ ])
        const { series } = config
         
        const { data: matrix_data = [ ], row_labels = [ ], col_labels = [ ] } = data as unknown as MatrixData
        
        let chart_data = [ ]
        for (let j = 0;  j < matrix_data.length;  j++)
            for (let i = 0;  i < matrix_data[j].length;  i++)  
                chart_data.push([i, j, matrix_data[j][i]])
            
        return {
            ...default_options,
            grid: {
                ...default_options.grid,
                bottom: '15%'
            },
            tooltip: {
                ...default_options.tooltip,
                trigger: 'item'
            },
            xAxis: {
                ...default_options.xAxis,
                type: 'category',
                data: col_labels.map(label => format_time(label, config.xAxis.time_format))
            },
            yAxis: [{
                ...default_options.yAxis[0],
                type: 'category',
                data: row_labels.map(label => format_time(label, config?.yAxis[0]?.time_format))
            }],
            visualMap: {
                min: series[0].min ?? 0,
                max: series[0].max ?? 10,
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
        }
    }, [widget.config, data])
    
    console.log(options, 'options')
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label失效
    return <ReactEChartsCore
        echarts={echarts}
        notMerge={dashboard.editing}
        option={options}
        className='dashboard-line-chart'
        theme='my-theme'
    />
}


export function HeatMapConfigForm ({ col_names }: { col_names: string[] }) {
    return <>
        <BasicFormFields type='chart' chart_fields={[ChartField.TOOLTIP]}/>
        <AxisFormFields col_names={col_names} single />
        <Collapse items={[{
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
                        <Form.Item label={t('最小值')} name={[field.name, 'min']} initialValue={0}>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item label={t('最大值')} name={[field.name, 'max']} initialValue={10}>
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
