import { Collapse, type CollapseProps, Form, InputNumber, Select } from 'antd'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { type Widget } from '../../model.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import { useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { convert_chart_config, convert_list_to_options } from '../../utils.js'

interface IProps { 
    widget: Widget
    data_source: any[]
}

export function Scatter (props: IProps) {
    const { data_source, widget } = props
    
    // const options = useMemo(() => {
    //     return {
            
    //      }
    // }, [ ])
    
    console.log(data_source, 'data_source')
    
    console.log(convert_chart_config(widget, data_source), 'config')
    
    return <ReactEChartsCore
        echarts={echarts}
        notMerge
        option={convert_chart_config(widget, data_source)}
        className='dashboard-line-chart'
        theme='my-theme'
    />
    
}

export function ScatterConfigForm ({ col_names }: { col_names: string[] }) {
    
    const col_options = useMemo(() => convert_list_to_options(col_names), [col_names])
    
    return <>
        <BasicFormFields type='chart' />
        <AxisFormFields col_names={col_names} />
        <SeriesFormFields col_names={col_names}/>
        {/* <Collapse items={[
            {
                key: 'series',
                label: '数据列',
                forceRender: true,
                children: <Form.List name='series'>
                    {(fields, { add, remove }) => { 
                        const series = Form.useWatch('series')
                        const items: CollapseProps['items'] = fields.map(field => ({
                            label: series?.[field.name]?.name || `数据列 ${field.name + 1}`,
                            key: field.name,
                            forceRender: true,
                            children: <>
                                <Form.Item name="">
                                    <Select options={convert_list_to_options(col_names)} />
                                    
                                </Form.Item>
                            </>,
                            
                        }))
                        
                        return <Collapse items={items} />
                        
                    } }
                    
                </Form.List>
            }
        ] } /> */}
    </>
}
