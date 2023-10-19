import { type Widget, dashboard } from '../../model.js'
import { Editor } from '../../../shell/Editor/index.js'
import { Button } from 'antd'

import './index.sass'
import { useState } from 'react'
import { EditorFields } from '../../ChartFormFields/EditorFields.js'
import { type IEditorConfig } from '../../type.js'
import { get_widget_config } from '../../Header.js'
import { debounce } from 'lodash'

export function DashboardEditor ({ widget }: { widget: Widget }) {
    const { config } = dashboard.use(['config'])
    const { title, button_text, code: saved_code } = widget.config as IEditorConfig
    const [ code, set_code ] = useState(saved_code)
    
    async function save (code: string) {
        try {
            const new_widget = { ...get_widget_config(widget), config: { ...widget.config, code } }
            const index = config.data.canvas.widgets.findIndex(({ id }) => id === widget.id)
            const new_config = { ...config, data: { ...config.data, canvas: { widgets: config.data.canvas.widgets.toSpliced(index, 1, new_widget) } } }
            await dashboard.update_dashboard_config(new_config)
        } catch (error) {
            dashboard.show_error({ error })
            throw error
        }
    }
    
    const save_debounced = debounce(save, 500, { leading: false, trailing: true })
    
    return <div className='editor-container'>
        <h2>{title}</h2>
        <div className='editor'>
            <Editor enter_completion value={code} on_change={async code => {
                set_code(code)
                await save_debounced(code)
                }} theme='dark'/>
        </div>
        <Button onClick={async () => {
                    try {
                        const { type, result } = await dashboard.execute(code)
                        if (type === 'error')
                            throw new Error(result as string) 
                    } catch (error) {
                        dashboard.show_error({ error })
                    }
                }}>{button_text}</Button>
   
    </div>
}

export function EditorConfigForm ( ) {
    
    return <>
        <EditorFields />
    </>
}
