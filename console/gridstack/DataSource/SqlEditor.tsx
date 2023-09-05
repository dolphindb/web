import { CloseOutlined } from '@ant-design/icons'
import { Editor } from '../../shell/Editor/index.js'

export function SqlEditor ({ show_preview, close_preview }) {
    return <>
        <div className='data-source-config-sqleditor'>
            <div className='data-source-config-sqleditor-main' style={{  height: (show_preview ? '40%' : '100%') }}>
                <Editor />
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
                        sqlpreview
                    </div>
                </div>
                : <></>
            }
        </div>
    </>
}
