import { type Widget, dashboard } from '../../model.js'
import { Editor } from '../../../shell/Editor/index.js'
import { Button } from 'antd'

import './index.sass'
import { useState } from 'react'
import { EditorFields } from '../../ChartFormFields/EditorFields.js'
import { type IEditorConfig } from '../../type.js'

export function DashboardEditor ({ widget }: { widget: Widget }) {
    const { title, button_text } = widget.config as IEditorConfig
    const [ code, set_code ] = useState('')
    
    return <div className='editor-container'>
       
        <h2>{title}</h2>
        <div className='editor'>
            <Editor enter_completion value={code} on_change={set_code} theme='dark'/>
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
