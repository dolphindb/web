import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { Widget } from '../../model.js'
import { convert_chart_config } from '../../utils.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { IChartConfig } from '../../type.js'
import { Checkbox } from 'antd'


interface IProps { 
    widget: Widget
    data_source: any[]
}


export function Chart (props: IProps) {
    const { widget, data_source } = props
    const [selected_series, set_selected_series] = useState<string[]>([ ])
    
    const config = useMemo(() => widget.config as IChartConfig, [widget.config])
    
    useEffect(() => { 
        set_selected_series(config.series.map(item => item?.name))
    }, [ config ])
    
    const on_change_series = useCallback(checkedValue => { 
        set_selected_series(checkedValue)
    }, [ ])
    
    
    const options = useMemo(() => {
        const options = convert_chart_config(widget, data_source)
        // 增加数据过滤
        if (config.with_data_filter)
            return { ...options, series: options.series.filter(item => selected_series?.includes(item.name)) }
        // 无数据过滤直接展示所有series
        else
            return options
    },
    [config, data_source, selected_series])
    
        
    return <div className='chart-wrapper'>
        {config.with_data_filter &&
            <Checkbox.Group value={selected_series} onChange={on_change_series} className='chart-radio-group'>
                {config.series.map(item => <Checkbox key={item?.col_name} value={item?.name}>{item?.name}</Checkbox>)}
            </Checkbox.Group>
        }
        <ReactEChartsCore
            echarts={echarts}
            notMerge
            option={options}
            className='dashboard-line-chart'
            theme='my-theme'
        />
    
    </div>
}


export function ChartConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        <AxisFormFields col_names={col_names} />
        <SeriesFormFields col_names={col_names} />
    </>
}

