import './index.sass'

import { Button } from 'antd'
import { useMemo, useState } from 'react'
import { debounce } from 'lodash'

import { type Widget, dashboard } from '../../model.js'
import { Editor } from '../../../shell/Editor/index.js'

import { EditorFields } from '../../ChartFormFields/EditorFields.js'
import { type IEditorConfig } from '../../type.js'


export function DashboardEditor ({ widget }: { widget: Widget }) {
    const { config, widgets } = dashboard.use(['config', 'widgets'])
    const [code, set_code] = useState((widget?.config as IEditorConfig)?.code || '')
    
    async function save (code: string) {
        // 本地的 widgets 更新
        (widgets.find(({ id }) => id === widget.id).config as IEditorConfig).code = code
        
        // server 的 widgets 更新
        config.data.canvas.widgets.find(({ id }) => id === widget.id).config.code = code
        await dashboard.update_dashboard_config(config)
    }
    
    const save_debounced = useMemo(() => debounce(save, 1000, { leading: false, trailing: true }), [ ])
    
    return <div className='editor-container'>
        <h2>{(widget?.config as IEditorConfig)?.title || 'editor'}</h2>
        <div className='editor'>
            <Editor
                enter_completion
                value={code}
                on_change={async code => {
                    set_code(code)
                    await save_debounced(code)
                }}
                options={{
                    fixedOverflowWidgets: true
                }}
                theme='dark'
            />
        </div>
        <Button
            onClick={async () => {
                const { type, result } = await dashboard.execute_code(code)
                if (type === 'error')
                    throw new Error(result as string)
            }}
        >
            {(widget?.config as IEditorConfig)?.button_text || 'run'}
        </Button>
    </div>
}


export function EditorConfigForm () {
    return <>
            <EditorFields />
        </>
}
