import { CloseOutlined } from '@ant-design/icons'
import { GraphType, GraphTypeName } from '../graph-types.js'
import { DataSource } from '../DataSource/DataSource.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AxisConfig, ISeriesConfig, WidgetOption } from '../storage/widget_node.js'
import echarts from 'echarts'
import { unsub_source } from '../storage/date-source-node.js'

import { GridStack, GridStackNode } from 'gridstack'
import { graph_config } from '../graph-config.js'

interface IProps { 
    actived: boolean
    item: WidgetOption
    el: GridStackNode
    grid: GridStack
}

const convert_chart_config = (widget: WidgetOption, data_source: any[]) => {
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
    
    const convert_axis = (axis: AxisConfig) => ({
        show: true,
        name: axis.name,
        type: axis.type,
        data: axis.col_name ? data_source.map(item => item?.[axis.col_name]) : [ ],
        splitLine: {
            show: true,
            lineStyle: {
                type: 'dashed',
            }
        }
    })
    
    const convert_series = (series: ISeriesConfig ) => ({
        type: type.toLocaleLowerCase(),
        name: series.name,
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
        // yAxis: 
        series: config.series.map(convert_series),
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

export function GraphItem (props: IProps) {
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    const { item, el, grid, actived } = props
    console.log(item, 'item')
    const GraphComponent = useMemo(() => graph_config[item.type].component, [item.id])
    
    const graph = useRef()
    const [data, set_data] = useState({ })
    
    useEffect(() => {
        if (Object.keys(data).length) {
            let chart = echarts.init(graph.current)
            // 指定图表的配置项和数据
            const option = {
                title: {
                    text: 'ECharts 入门示例'
                },
                tooltip: { },
                legend: {
                    data: [data[0].name]
                },
                xAxis: {
                    data: data[1].data
                },
                yAxis: { },
                series: [
                    {
                        name: data[0].name,
                        type: item.type,
                        data: data[0].data
                    }
                ]
            }
            
            // 使用刚指定的配置项和数据显示图表。
            chart.setOption(option)
        }
    }, [data])
    
    // todo : 传入 datasource 组件，当获取数据后，调用该方法，将数据传递过来
    const getTableData = table_data => {
        set_data(table_data)
    }
    
    const options = useMemo(() => { 
        if (!item.config)
            return { }
        switch (item.type) { 
            case GraphType.TABLE:
                return { }
            default:
                return convert_chart_config(item, data_source)
        }
    }, [ item.id, item.config ])
    
    
    return <div 
                className={`grid-stack-item-content ${actived ? 'grid-stack-item-active' : ''}`} 
            >
        <div className='delete-graph' onClick={() => { 
            grid.removeWidget(el.el)
            // 取消订阅数据源 
            if (item.source_id)
                unsub_source(item)
        }}>
            <CloseOutlined className='delete-graph-icon'/>
        </div>
        {
            Object.keys(data).length ? 
            <div ref={graph} />
            :
            <>
                <div className='graph-content'>
                    <GraphComponent options={options} widget={item} />
                    <div className='title'>{GraphTypeName[item.type]}</div>
                    <DataSource widget_option={item}/>
                </div>
            </>
        }
        <div className='drag-icon' />
     </div>
}
