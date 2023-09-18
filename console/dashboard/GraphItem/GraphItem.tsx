import { CloseOutlined } from '@ant-design/icons'


import { WidgetType, dashboard } from '../model.js'
import { DataSource } from '../DataSource/DataSource.js'
import { useEffect, useRef, useState } from 'react'
import { type Widget } from '../model.js'
import { graph_config } from '../graph-config.js'
import { AxisConfig, ISeriesConfig } from '../type.js'

const convert_chart_config = (widget: Widget, data_source: any[]) => {
    const { config, type } = widget
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
    if (config.x_datazoom)
        data_zoom.push(total_data_zoom[0])
    if (config.y_datazoom)
        data_zoom.push(total_data_zoom[1])
    
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
        position: axis.position,
        offset: axis.offset,
        alignTicks: true,
        id: index
    })
    
    const convert_series = (series: ISeriesConfig ) => ({
        type: type.toLocaleLowerCase(),
        name: series.name,
        yAxisIndex: series.yAxisIndex,
        data: data_source.map(item => item?.[series.col_name]) 
    })
    
    return {
        legend: {
            show: config.with_legend
        },
        tooltip: {
            show: config.with_tooltip,
            // 与图形类型相关，一期先写死
            trigger: 'axis',
        },
        title: {
            text: config.title
        },
        xAxis: convert_axis(config.xAxis),
        yAxis: config.yAxis.filter(item => !!item).map(convert_axis),
        series: config.series.filter(item => !!item).map(convert_series),
        dataZoom: data_zoom
    }
}

const data_source = [
    {
        Information_Analysis: 'IC_Kurtosis',
        forward_returns_1D: -1.3663897860703,
        forward_returns_5D: -0.899874962571775,
        forward_returns_10D: -0.961722092888568
    },
    {
        Information_Analysis: 'IC_Mean',
        forward_returns_1D: -0.018521106425923,
        forward_returns_5D: -0.01537811155309,
        forward_returns_10D: -0.012038890802982
    },
    {
        Information_Analysis: 'IC_Risk_Adjusted',
        forward_returns_1D: -1.57135801576709,
        forward_returns_5D: -0.644211235819795,
        forward_returns_10D: -0.704757710057684
    },
    {
        Information_Analysis: 'IC_Skew',
        forward_returns_1D: 0.010593882632605,
        forward_returns_5D: 0.085140436131539,
        forward_returns_10D: -0.554826275329224
    },
    {
        Information_Analysis: 'IC_Std',
        forward_returns_1D: 0.011786687845852,
        forward_returns_5D: 0.023871225303173,
        forward_returns_10D: 0.017082311596132
    },
    {
        Information_Analysis: 'IC_p_value',
        forward_returns_1D: 0.000394625851186,
        forward_returns_5D: 0.058367844671011,
        forward_returns_10D: 0.04152199998498
    },
    {
        Information_Analysis: 'IC_t_stat',
        forward_returns_1D: -5.211605072021485,
        forward_returns_5D: -2.136606931686401,
        forward_returns_10D: -2.337416887283325
    }
]

import { RichText } from './RichText/index.js'


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current } = dashboard.use(['widget'])
    
    const GraphComponent = graph_config[widget.type].component
    
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    
    const graph = useRef()
    const [data, set_data] = useState({ key: 'key' })
    
    // todo : 传入 datasource 组件，当获取数据后，调用该方法，将数据传递过来
    const getTableData = table_data => {
        set_data(table_data)
    }
    
    
    return <div className={`grid-stack-item-content ${widget === current ? 'grid-stack-item-active' : ''}`}>
        <div className='delete-graph' onClick={() => { dashboard.delete_widget(widget) }}>
            <CloseOutlined className='delete-graph-icon'/>
        </div>
        {
            true ? 
                <RichText/>
            :
                <div className='graph-content'>
                    <div className='title'>{WidgetType[widget.type]}</div>
                    <DataSource widget={widget}/>
                </div>
        }
        <div className='drag-icon' />
     </div>
}
