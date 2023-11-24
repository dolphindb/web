import './index.sass'

import { Button } from 'antd'
import { useMemo, useState } from 'react'
import { debounce } from 'lodash'

import { type Widget, dashboard } from '../../model.js'
import { Editor } from '../../../shell/Editor/index.js'

import { EditorFields } from '../../ChartFormFields/EditorFields.js'
import { type IEditorConfig } from '../../type.js'
import { get_widget_config } from '../../Header.js'


export function DashboardEditor ({ widget }: { widget: Widget }) {
    const { config } = dashboard.use(['config'])
    const [code, set_code] = useState((widget?.config as IEditorConfig)?.code || '')
    
    async function save (code: string) {
        await dashboard.execute(async () => {
            const new_widget = { ...get_widget_config(widget), config: { ...widget.config, code } }
            const index = config.data.canvas.widgets.findIndex(({ id }) => id === widget.id)
            const new_config = {
                ...config,
                data: { ...config.data, canvas: { widgets: config.data.canvas.widgets.toSpliced(index, 1, new_widget) } }
            }
            await dashboard.update_dashboard_config(new_config, false)
        })
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
                theme='dark'
            />
        </div>
        <Button
            onClick={async () =>
                dashboard.execute(async () => {
                    const { type, result } = await dashboard.execute_code(code)
                    if (type === 'error')
                        throw new Error(result as string)
                })
            }
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
