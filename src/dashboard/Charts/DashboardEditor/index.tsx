import './index.sass'

import { Button } from 'antd'
import { useMemo, useRef, useState } from 'react'
import { debounce } from 'lodash'

import { Editor } from '@components/Editor/index.tsx'
import { type Widget, dashboard } from '@/dashboard/model.ts'
import { EditorFields } from '@/dashboard/ChartFormFields/EditorFields.tsx'
import { type IEditorConfig } from '@/dashboard/type.ts'
import { get_editor_value, type CodeEditor } from '@components/Editor/MonacoEditor.tsx'
import { editor } from 'monaco-editor'


export function DashboardEditor ({ widget }: { widget: Widget }) {
    const { config, widgets } = dashboard.use(['config', 'widgets'])
    
    let reditor = useRef<CodeEditor>(undefined)
    
    async function save (code: string) {
        // 本地的 widgets 更新
        (widgets.find(({ id }) => id === widget.id).config as IEditorConfig).code = code
        
        // server 的 widgets 更新
        const server_widget = config.data.canvas.widgets.find(({ id }) => id === widget.id)
        if (server_widget) {
            server_widget.config.code = code
            await dashboard.update_dashboard_config(config)
        }
    }
    
    const save_debounced = useMemo(() => debounce(save, 1000, { leading: false, trailing: true }), [ ])
    
    return <div className='editor-container'>
        <h2>{(widget?.config as IEditorConfig)?.title || 'editor'}</h2>
        <div className='editor'>
            <Editor
                theme='dark'
                enter_completion
                on_change={code => {
                    save_debounced(code)
                }}
                on_loaded={(monaco, editor) => {
                    reditor.current = editor
                    editor.setValue((widget?.config as IEditorConfig)?.code || '')
                }}
            />
        </div>
        <Button
            onClick={async () => {
                const { type, result } = await dashboard.execute_code(
                    get_editor_value(
                        reditor.current))
                
                if (type === 'error')
                    throw new Error(result as string)
            }}
        >
            {(widget?.config as IEditorConfig)?.button_text || 'run'}
        </Button>
    </div>
}


export function EditorConfigForm () {
    return <EditorFields />
}
