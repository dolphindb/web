import { CloseOutlined } from '@ant-design/icons'


import { WidgetType, dashboard } from '../model.js'
import { DataSource } from '../DataSource/DataSource.js'
import { useEffect, useRef, useState } from 'react'
import { type Widget } from '../model.js'
import { graph_config } from '../graph-config.js'


// const data_source = [
//     {
//         Information_Analysis: 'IC_Kurtosis',
//         forward_returns_1D: -1.3663897860703,
//         forward_returns_5D: -0.899874962571775,
//         forward_returns_10D: -0.961722092888568
//     },
//     {
//         Information_Analysis: 'IC_Mean',
//         forward_returns_1D: -0.018521106425923,
//         forward_returns_5D: -0.01537811155309,
//         forward_returns_10D: -0.012038890802982
//     },
//     {
//         Information_Analysis: 'IC_Risk_Adjusted',
//         forward_returns_1D: -1.57135801576709,
//         forward_returns_5D: -0.644211235819795,
//         forward_returns_10D: -0.704757710057684
//     },
//     {
//         Information_Analysis: 'IC_Skew',
//         forward_returns_1D: 0.010593882632605,
//         forward_returns_5D: 0.085140436131539,
//         forward_returns_10D: -0.554826275329224
//     },
//     {
//         Information_Analysis: 'IC_Std',
//         forward_returns_1D: 0.011786687845852,
//         forward_returns_5D: 0.023871225303173,
//         forward_returns_10D: 0.017082311596132
//     },
//     {
//         Information_Analysis: 'IC_p_value',
//         forward_returns_1D: 0.000394625851186,
//         forward_returns_5D: 0.058367844671011,
//         forward_returns_10D: 0.04152199998498
//     },
//     {
//         Information_Analysis: 'IC_t_stat',
//         forward_returns_1D: -5.211605072021485,
//         forward_returns_5D: -2.136606931686401,
//         forward_returns_10D: -2.337416887283325
//     }
// ]

import { RichText } from '../Charts/RichText/index.js'


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current } = dashboard.use(['widget'])
    const [data_source, set_data_source] = useState([ ])
    
    useEffect(() => { 
        dashboard.update_widget({
            ...widget, update_graph: data => { 
                set_data_source(data)
                return data
        } })
    }, [ ])
    
    const GraphComponent = graph_config[widget.type].component
    
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    // 根据 id 判断当前选中的节点，防止因为对象引用地址不同导致的判断错误
    return <div className={`grid-stack-item-content ${widget.id === current.id ? 'grid-stack-item-active' : ''}`}>
        <div className='delete-graph' onClick={() => { dashboard.delete_widget(widget) }}>
            <CloseOutlined className='delete-graph-icon'/>
        </div>
        {
            widget.source_id && widget.config ? 
                <GraphComponent data_source={data_source} widget={widget} />
            :
                <div className='graph-content'>
                    <div className='title'>{WidgetType[widget.type]}</div>
                    <DataSource widget={widget}/>
                </div>
        }
        <div className='drag-icon' />
     </div>
}
