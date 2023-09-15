import { CloseOutlined } from '@ant-design/icons'
import { GraphTypeName } from '../graph-types.js'
import { DataSource } from '../DataSource/DataSource.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { WidgetOption } from '../storage/widget_node.js'
import { GraphType } from '../graph-types.js'
import echarts from 'echarts'
import { unsub_source } from '../storage/date-source-node.js'

import { GridStack, GridStackNode } from 'gridstack'
import { graph_config } from '../graph-config.js'
import DBTable from '../Charts/Table.js'



const GraphMap = {
    [GraphType.TABLE]: DBTable
}

interface IProps { 
    actived: boolean
    item: WidgetOption
    el: GridStackNode
    grid: GridStack
}

export function GraphItem  (props: IProps) {
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    const { item, el, grid, actived } = props
    const GraphComponent = useMemo(() => graph_config[item.type].component, [ item.type ])
    
    
    const graph = useRef()
    const [data, set_data] = useState({ })
    
    console.log(data, 'data')
    
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
                    <GraphComponent />
                    <div className='title'>{GraphTypeName[item.type]}</div>
                    <DataSource widget_option={item}/>
                </div>
            </>
        }
        <div className='drag-icon' />
     </div>
}
