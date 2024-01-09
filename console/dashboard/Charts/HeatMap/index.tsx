import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import { dashboard, type Widget } from '../../model.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'
import { type IChartConfig } from '../../type.js'
import { convert_chart_config } from '../../utils.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { ChartField } from '../../ChartFormFields/type.js'
import { get_data_source } from '../../DataSource/date-source.js'

interface IProps { 
    widget: Widget
    data_source: any[]
    cols: string[]
}

export function HeatMap (props: IProps) { 
    const { widget } = props
    
    const node = get_data_source(widget.source_id[0])
    const { data } = node.use(['data'])
    
    const options = useMemo(() => { 
        return { }
    }, [ ])
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label失效
    // return <ReactEChartsCore
    //     echarts={echarts}
    //     notMerge={dashboard.editing}
    //     option={options}
    //     className='dashboard-line-chart'
    //     theme='my-theme'
    // />
    
    return <div />
}


export function HeatMapConfigForm ({ col_names }: { col_names: string[] }) {
    return <>
        <BasicFormFields type='chart' chart_fields={[ChartField.TOOLTIP]}/>
        <AxisFormFields col_names={col_names} single />
        <SeriesFormFields col_names={col_names} single/>
    </>
 }
