import './index.scss'
import { VariableForm } from '../../GraphItem/VariableForm.js'
import { type Widget } from '../../model.js'
import { useMemo } from 'react'

interface IProps { 
    widget: Widget
    data_source: any
}

interface IVariableConfig { 
    title?: string
    title_size: number
    variable_ids?: string[]
    variable_cols: number
    with_search_btn: boolean
}
export function Variables (props: IProps) { 
    
    const { widget } = props
    
    const config = useMemo(() => widget.config as IVariableConfig, [widget.config])
    
    return <>
        {config.title && <div className='variable-title' style={{ fontSize: config.title_size ?? 18, fontWeight: 500 }}>{config.title}</div>}
        <VariableForm className='variable-chart-wrapper' ids={config.variable_ids} cols={config.variable_cols} with_search_btn={config.with_search_btn} />
    </>
}
