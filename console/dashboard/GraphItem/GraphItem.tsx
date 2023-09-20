import { CloseOutlined } from '@ant-design/icons'


import { WidgetType, dashboard } from '../model.js'
import { DataSource } from '../DataSource/DataSource.js'
import { useMemo } from 'react'
import { type Widget } from '../model.js'
import { graph_config } from '../graph-config.js'

import ChartSvg from '../icons/chart.svg'
import { get_data_source_node } from '../storage/date-source-node.js'
import { t } from '../../../i18n/index.js'

import './index.scss'


const GraphComponent = ({ widget }: { widget: Widget }) => {
    const data_source_node = get_data_source_node(widget.source_id)
    const { data = [ ] } = data_source_node.use(['data'])
    
    const Component = useMemo(() => graph_config[widget.type].component, [widget.type])
    
    return <Component data_source={data} widget={widget} />
}


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current, editing } = dashboard.use(['widget', 'editing'])
  
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    // 根据 id 判断当前选中的节点，防止因为对象引用地址不同导致的判断错误
    return <div className={`grid-stack-item-content ${widget.id === current?.id ? 'grid-stack-item-active' : ''}`}>
        { editing && <div className='delete-graph'>
            {/* 选中时 hover 且当前有数据源时才能修改数据源 */}
            {widget.id === current?.id && widget.source_id && <DataSource className='edit-data-source-btn' type='link' widget={current} text={t('编辑数据源')} />}
            <CloseOutlined className='delete-graph-icon' onClick={() => { dashboard.delete_widget(widget) }}/>
        </div>
        }
        {
            widget.source_id && widget.config ? 
                <GraphComponent widget={widget} />
            :
                <div className='graph-content'>
                    <div className='graph-title'>{WidgetType[widget.type]}</div>
                    <img src={ChartSvg} className='default-img'/>
                    <DataSource widget={widget}/>
                </div>
        }
        <div className='drag-icon' />
     </div>
}
