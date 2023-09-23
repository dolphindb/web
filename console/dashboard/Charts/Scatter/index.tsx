import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget } from '../../model.js'
import { convert_chart_config, convert_list_to_options } from '../../utils.js'
import { useMemo } from 'react'
import { Collapse, Form, Select } from 'antd'



interface IProps { 
    widget: Widget
    data_source: any[]
}



export function DBScatter (props: IProps) { 
    const { widget, data_source } = props
    
    const options = useMemo(() =>
        convert_chart_config(widget, data_source),
    [widget.config, data_source])
    
    return <ReactEChartsCore
        echarts={echarts}
        notMerge
        option={options}
        className='dashboard-line-chart'
        theme='my-theme'
    />
}


export function ScatterConfigForm (props: { col_names: string[] }) { 
    const { col_names = [ ] } = props
    
    const ValueSelect = useMemo(() => <>
        <Form.Item name={['value_select', 'x']}>
            <Select options={convert_list_to_options(col_names)} />
        </Form.Item>
        <Form.Item name={['value_select', 'y']}>
            <Select options={convert_list_to_options(col_names)} />
        </Form.Item>
    </>, [col_names])
    
    return <>
        <BasicFormFields type='chart' />
        <Collapse items={[{
            key: 'basic',
            label: '数据选择',
            children: ValueSelect,
            forceRender: true
        }]} />
    </>
}

