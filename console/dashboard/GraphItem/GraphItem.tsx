import './index.scss'

import { CloseOutlined, CopyOutlined } from '@ant-design/icons'


import { WidgetChartType, WidgetType, WidgetTypeWithoutDatasource, dashboard } from '../model.js'
import { DataSourceConfig } from '../DataSource/DataSourceConfig.js'
import { useEffect, useMemo, useRef } from 'react'
import { type Widget } from '../model.js'
import { graph_config } from '../graph-config.js'

import ChartSvg from '../icons/chart.svg'
import { get_data_source } from '../DataSource/date-source.js'
import { t } from '../../../i18n/index.js' 
import cn from 'classnames'
import { VariableForm } from './VariableForm.js'
import { Button } from 'antd'
import { copy_widget } from '../utils.js'

function get_padding (padding: { left: number, right: number, top: number, bottom: number }) { 
    if (!padding)
        padding = {
            left: 12,
            right: 12,
            top: 12,
            bottom: 12
        }
    return `${padding.top ?? 0}px ${padding.right ?? 0}px ${padding.bottom ?? 0}px ${padding.left ?? 0}px`
}

function GraphComponent ({ widget }: { widget: Widget }) {
    
    const data_source_node = get_data_source(widget.source_id)
    
    const { data = [ ] } = data_source_node.use(['data'])
    
    
    const Component = useMemo(() => graph_config[widget.type].component, [widget.type])
    
    return <div style={{ padding: get_padding(widget.config?.padding) } } className={cn('graph-item-wrapper', {
        'overflow-visible-wrapper': widget.type === WidgetChartType.EDITOR || widget.type === WidgetChartType.OHLC
    }) }>
        {(widget.type !==  WidgetChartType.VARIABLE && widget.config) && <VariableForm ids={widget.config.variable_ids} cols={widget.config.variable_cols} with_search_btn={widget.config.with_search_btn} /> }
        <div className={cn('graph-component', {
            'graph-item-wrapper-abandon-scroll': widget.config?.abandon_scroll
        }) }>
            <Component data_source={data} widget={widget} />
        </div>
    </div>
}


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current, editing } = dashboard.use(['widget', 'editing'])
    
    useEffect(() => { 
        async function copy () { 
            await copy_widget(widget)
        }
        
        // 仅当前 widget 为选中状态才进行监听
        if (current?.id === widget?.id)
            window.addEventListener('copy', copy)
        
        return () => { window.removeEventListener?.('copy', copy) }
    }, [current, widget])
    
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    // 根据 id 判断当前选中的节点，防止因为对象引用地址不同导致的判断错误
    return <div className={cn('grid-stack-item-content', {
        'grid-stack-item-active': widget.id === current?.id && editing
    })}>
        { editing && <div className='delete-graph'>
            {/* 选中时 hover 且当前有数据源时才能修改数据源 */}
            {
                widget.id === current?.id && widget.source_id && !WidgetTypeWithoutDatasource.includes(widget.type) &&
                <DataSourceConfig
                    className='edit-data-source-btn'
                    type='link'
                    widget={current}
                    text={t('编辑数据源')}
                />
            }
            {
                (widget?.id === current?.id) && <Button icon={<CopyOutlined />} className='edit-data-source-btn' type='link' onClick={ () => { copy_widget(widget) }}  >
                    {t('复制') }
                </Button>
            }
            <CloseOutlined className='delete-graph-icon' onClick={() => { dashboard.delete_widget(widget) }}/>
        </div> }
        {
            (widget.config && widget.source_id) ||  WidgetTypeWithoutDatasource.includes(widget.type) ? 
                <GraphComponent widget={widget} />
            :
                <div className='graph-content'>
                    <div className='graph-title'>{WidgetType[widget.type]}</div>
                    <img src={ChartSvg} className='default-img'/>
                    <DataSourceConfig widget={widget}/>
                </div>
        }
        <div className={cn({ 'drag-icon': editing }) } />
     </div>
}
