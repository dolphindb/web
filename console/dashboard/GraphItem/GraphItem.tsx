import { CloseOutlined } from '@ant-design/icons'

import type { GridStack, GridStackNode } from 'gridstack'

import { WidgetType } from '../model.js'
import { DataSource } from '../DataSource/DataSource.js'
import { useEffect, useRef, useState } from 'react'
import { type Widget } from '../model.js'
import echarts from 'echarts'
import { unsub_source } from '../storage/date-source-node.js'


export function GraphItem  ({ widget, node, grid, actived }: { widget: Widget, node: GridStackNode, grid: GridStack, actived: boolean }) {
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    
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
                        type: widget.type,
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
    
    
    return <div className={`grid-stack-item-content ${actived ? 'grid-stack-item-active' : ''}`}>
        <div className='delete-graph' onClick={() => { 
            grid.removeWidget(node.el)
            
            // 取消订阅数据源 
            if (widget.source_id)
                unsub_source(widget)
        }}>
            <CloseOutlined className='delete-graph-icon'/>
        </div>
        {
            Object.keys(data).length ? 
                <div ref={graph} />
            :
                <div className='graph-content'>
                    <div className='title'>{WidgetType[widget.type]}</div>
                    <DataSource widget={widget}/>
                </div>
        }
        <div className='drag-icon' />
     </div>
}
