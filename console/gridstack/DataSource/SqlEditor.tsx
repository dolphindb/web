import { CloseOutlined } from '@ant-design/icons'

import { Editor } from '../../shell/Editor/index.js'
import { DataView } from '../../shell/DataView.js'

import { shell } from '../../shell/model.js'

export function SqlEditor ({ show_preview, close_preview }: { show_preview: boolean, close_preview: () => void }) {
    shell.term = shell.term || new window.Terminal()
    return <>
        <div className='data-source-config-sqleditor'>
            <div className='data-source-config-sqleditor-main' style={{  height: (show_preview ? '40%' : '100%') }}>
                <Editor 
                    enter_completion
            
                    on_mount={(editor, monaco) => {
                        shell.set({ editor, monaco })
                    }}
                />
            </div>
            {show_preview
                ? <div className='data-source-config-preview'>
                    <div className='data-source-config-preview-config'>
                        <div className='data-source-config-preview-config-tag'>
                            数据预览
                        </div>
                        <div className='data-source-config-preview-config-close' onClick={close_preview}>
                            <CloseOutlined/>
                            关闭
                        </div>
                    </div>
                    <div className='data-source-config-preview-main'>
                        <DataView type='dashboard'/>
                    </div>
                </div>
                : <></>
            }
        </div>
    </>
}
