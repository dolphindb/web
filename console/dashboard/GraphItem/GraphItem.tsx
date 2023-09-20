import { CloseOutlined } from '@ant-design/icons'


import { WidgetType, dashboard } from '../model.js'
import { DataSource } from '../DataSource/DataSource.js'
import { useEffect, useMemo, useState } from 'react'
import { type Widget } from '../model.js'
import { graph_config } from '../graph-config.js'

import ChartSvg from '../../icons/chartIcon.svg'
import { get_data_source_node } from '../storage/date-source-node.js'

import './index.scss'

const GraphComponent = ({ widget }: { widget: Widget }) => {
    const data_source_node = get_data_source_node(widget.source_id)
    
    const { data = [ ] } = data_source_node.use(['data'])
    console.log(data, 'data')
    
    const Component = useMemo(() => graph_config[widget.type].component, [widget.type])
    
    return <Component data_source={data} widget={widget} />
}


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current } = dashboard.use(['widget'])
    
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    // 根据 id 判断当前选中的节点，防止因为对象引用地址不同导致的判断错误
    return <div className={`grid-stack-item-content ${widget.id === current?.id ? 'grid-stack-item-active' : ''}`}>
        <div className='delete-graph' onClick={() => { dashboard.delete_widget(widget) }}>
            <CloseOutlined className='delete-graph-icon'/>
        </div>
        {
            widget.source_id && widget.config ? 
                <GraphComponent widget={widget} />
            :
                <div className='graph-content'>
                    <div className='graph-title'>{WidgetType[widget.type]}</div>
                    <img src={ChartSvg} className='default-img'/>
                    <DataSource widget={widget} />
                </div>
        }
        <div className='drag-icon' />
     </div>
}
