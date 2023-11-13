import './index.scss'

import { CloseOutlined, CopyOutlined } from '@ant-design/icons'


import { WidgetChartType, WidgetType, WidgetTypeWithoutDatasource, dashboard } from '../model.js'
import { DataSourceConfig } from '../DataSource/DataSourceConfig.js'
import { useMemo, useRef } from 'react'
import { type Widget } from '../model.js'
import { graph_config } from '../graph-config.js'

import ChartSvg from '../icons/chart.svg'
import { get_data_source } from '../DataSource/date-source.js'
import { t } from '../../../i18n/index.js' 
import cn from 'classnames'
import { VariableForm } from './VariableForm.js'
import { Button } from 'antd'
import { copy_widget } from '../utils.js'
import { workerData } from 'worker_threads'

function get_padding_style (padding: { left: number, right: number, top: number, bottom: number }) { 
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
    
    return <div
            style={{ padding: get_padding_style(widget.config?.padding) }}
            className={cn('graph-item-wrapper', {
                'overflow-visible-wrapper': widget.type === WidgetChartType.EDITOR || widget.type === WidgetChartType.OHLC
            })}
        >
        
        {
            (widget.type !== WidgetChartType.VARIABLE && widget.config) &&
            <VariableForm
                ids={widget.config.variable_ids}
                cols={widget.config.variable_cols}
                with_search_btn={widget.config.with_search_btn}
            />
        }
        
        <div className={cn('graph-component', {
            'graph-item-wrapper-abandon-scroll': widget.config?.abandon_scroll
        }) }>
            <Component data_source={data} widget={widget} />
        </div>
    </div>
}


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current, editing } = dashboard.use(['widget', 'editing'])
    
    console.log(widget.source_id, 'id')
    
    // 是否为选中状态
    const is_active = useMemo(() => current?.id === widget?.id, [widget, current])
    
    const ref = useRef<HTMLDivElement>()
    
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    return <div
        ref={ref}
        className={cn('grid-stack-item-content', {
        'grid-stack-item-active': is_active && editing
    })}>
        {editing && <div className={cn('delete-graph', {
            'with-edit-btn': is_active
        }) }>
            {
                is_active && !WidgetTypeWithoutDatasource.includes(widget.type) && widget.source_id &&
                <DataSourceConfig
                    className='edit-data-source-btn'
                    type='link'
                    widget={current}
                    text={t('编辑数据源')}
                />
            }
            {
                is_active && <Button icon={<CopyOutlined />} className='edit-data-source-btn' type='link' onClick={ () => { copy_widget(widget) }}  >
                    {t('复制') }
                </Button>
            }
            <CloseOutlined className='delete-graph-icon' onClick={() => { dashboard.delete_widget(widget) }}/>
        </div> }
        {
            (widget.config && widget.source_id) || WidgetTypeWithoutDatasource.includes(widget.type) ? 
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
