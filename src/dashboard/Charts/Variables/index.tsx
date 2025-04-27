import './index.scss'

import { VariableForm } from '../../GraphItem/VariableForm.js'
import type { GraphComponentProps } from '@/dashboard/graphs.js'

interface IVariableConfig { 
    title?: string
    title_size: number
    variable_ids?: string[]
    variable_cols: number
    with_search_btn: boolean
    search_btn_label?: string
    variable_form_label_col?: number
}


export function Variables ({ widget }: GraphComponentProps) { 
    const config = widget.config as IVariableConfig
    
    return <>
        {
            config?.title &&
                <div className='variable-title' style={{ fontSize: config.title_size ?? 18, fontWeight: 500 }}>
                    {config.title}
                </div>
        }
         <VariableForm
            className='variable-chart-wrapper'
            ids={config?.variable_ids}
            cols={config?.variable_cols}
            with_search_btn={config?.with_search_btn}
            search_btn_label={config?.search_btn_label }
            label_col={config?.variable_form_label_col ? Math.floor(config?.variable_form_label_col * 24 / 100) : 6}
        />
    </>
}
