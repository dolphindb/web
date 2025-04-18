import './index.scss'

import { CloseOutlined, CopyOutlined } from '@ant-design/icons'


import { useMemo, useRef } from 'react'

import cn from 'classnames'

import { Button } from 'antd'

import { WidgetChartType, WidgetType, WidgetTypeWithoutDatasource, dashboard, type Widget } from '../model.js'
import { DataSourceConfig } from '../DataSource/DataSourceConfig.js'
import { graph_config } from '../graph-config.js'

import ChartSvg from '../icons/chart.svg'
import { get_data_source } from '../DataSource/date-source.js'
import { t } from '../../../i18n/index.js'
 

import { copy_widget } from '../utils.ts'

import { VariableForm } from './VariableForm.js'


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
    // 普通图表 source_id 内只有一项，只需要取第一项，复合图表才会有多项
    const data_source_node = get_data_source(widget.source_id?.[0])
    
    const { data = [ ], cols = [ ], type_map = { } } = data_source_node.use(['data', 'cols', 'type_map'])
    
    const Component = graph_config[widget.type].component
    
    const { variable_cols, with_search_btn, search_btn_label, variable_form_label_col } = widget.config ?? { }
    
    return <div
        style={widget.type === WidgetChartType.CONFIGURATION 
            ? undefined
            : { padding: get_padding_style(widget.config?.padding) }}
        className={cn('graph-item-wrapper', {
            'overflow-visible-wrapper': widget.type === WidgetChartType.EDITOR || widget.type === WidgetChartType.OHLC,
            'configuration-wrapper': widget.type === WidgetChartType.CONFIGURATION
        })}
    >
        {
            widget.type !== WidgetChartType.VARIABLE && widget.config && <VariableForm
                ids={widget.config.variable_ids}
                cols={variable_cols}
                with_search_btn={with_search_btn}
                search_btn_label={search_btn_label}
                label_col={variable_form_label_col ? Math.floor(variable_form_label_col * 24 / 100) : 6 }
            />
        }
        
        <div className='graph-component'>
            <Component data_source={data} widget={widget} col_names={cols} type_map={type_map} />
        </div>
    </div>
}


export function GraphItem  ({ widget }: { widget: Widget }) {
    const { widget: current, editing } = dashboard.use(['widget', 'editing'])
    
    // 是否为选中状态
    const is_active = useMemo(() => current?.id === widget?.id, [widget, current])
    
    const ref = useRef<HTMLDivElement>(undefined)
    
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
               is_active &&  <div className='widget-type'>{t(WidgetType[widget.type])}</div>
            }
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
                    <div className='graph-title'>{t(WidgetType[widget.type])}</div>
                    <img src={ChartSvg} className='default-img'/>
                    {dashboard.editing && <DataSourceConfig widget={widget}/>}
                </div>
        }
        <div className={cn({ 'drag-icon': editing })} />
     </div>
}
