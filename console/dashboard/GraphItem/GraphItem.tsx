import { CloseOutlined } from '@ant-design/icons'


import { WidgetType, dashboard } from '../model.js'
import { DataSourceConfig } from '../DataSource/DataSourceConfig.js'
import { useMemo } from 'react'
import { type Widget } from '../model.js'
import { graph_config } from '../graph-config.js'

import ChartSvg from '../icons/chart.svg'
import { get_data_source } from '../DataSource/date-source.js'
import { t } from '../../../i18n/index.js' 
import cn from 'classnames'

import './index.scss'



function GraphComponent ({ widget }: { widget: Widget }) {
    
    const data_source_node = get_data_source(widget.source_id)
    const { data = [ ] } = data_source_node.use(['data'])
    
    const Component = useMemo(() => graph_config[widget.type].component, [widget.type])
    
    return <div className='graph-item-wrapper'>
        <Component data_source={data} widget={widget} />
    </div>
}


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current, editing } = dashboard.use(['widget', 'editing'])
  
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    // 根据 id 判断当前选中的节点，防止因为对象引用地址不同导致的判断错误
    return <div className={cn('grid-stack-item-content', {
        'grid-stack-item-active': widget.id === current?.id && editing
    })}>
        { editing && <div className='delete-graph'>
            {/* 选中时 hover 且当前有数据源时才能修改数据源 */}
            {
                widget.id === current?.id && widget.source_id &&
                <DataSourceConfig
                    className='edit-data-source-btn'
                    type='link'
                    widget={current}
                    text={t('编辑数据源')}
                />
            }
            <CloseOutlined className='delete-graph-icon' onClick={() => { dashboard.delete_widget(widget) }}/>
        </div> }
        {
            widget.source_id && widget.config ? 
                <GraphComponent widget={widget} />
            :
                <div className='graph-content'>
                    <div className='graph-title'>{WidgetType[widget.type]}</div>
                    <img src={ChartSvg} className='default-img'/>
                    <DataSourceConfig widget={widget}/>
                </div>
        }
        <div className='drag-icon' />
     </div>
}
