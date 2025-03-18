import './index.sass'
import 'react-quill-new/dist/quill.core.css'
import 'react-quill-new/dist/quill.snow.css'

import { Button, Modal } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import cn from 'classnames'

import { use_modal } from 'react-object-model/hooks.js'

import { t } from '@i18n'

import { model } from '@model'

import { type Widget, dashboard } from '@/dashboard/model.ts'
import type { ITextConfig } from '@/dashboard/type.ts'
import { variables } from '@/dashboard/Variable/variable.ts'
import { parse_text } from '@/dashboard/utils.ts'
import { InsertVariableBtn } from '@/dashboard/DataSource/InsertVariableBtn.tsx'


let ReactQuill: (typeof import('react-quill-new'))['default']

export function RichText ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const [display_text, set_display_text] = useState((widget.config as ITextConfig)?.value || '')
    const [edit_text, set_edit_text] = useState(display_text)
    
    const [quill_loaded, set_quill_loaded] = useState(Boolean(ReactQuill))
    
    const { visible, open, close } = use_modal()
    
    variables.use()
    
    const quill_ref = useRef<any>(undefined)
    
    const toolbar_options = useMemo(
        () => [
            ['bold', 'italic', 'underline', 'strike'], // toggled buttons
            ['blockquote', 'code-block'],
            
            [{ header: 1 }, { header: 2 }], // custom button values
            [{ color: [ ] }, { background: [ ] }], // dropdown with defaults from theme
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
            [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
            [{ direction: 'rtl' }], // text direction
            
            [{ size: ['small', false, 'large', 'huge'] }], // custom dropdown
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            
            [{ font: [ ] }],
            [{ align: [ ] }],
            
            ['clean'] // remove formatting button
        ],
        [ ]
    )
    
    const { editing, widget: current } = dashboard.use(['editing', 'widget'])
    
    const on_insert = useCallback((content: string) => {
        if (quill_ref?.current) {
            const editor = quill_ref?.current?.getEditor?.()
            
            const cursorPosition = editor?.getSelection()?.index
            
            editor?.insertText(cursorPosition, content)
            editor?.setSelection(cursorPosition + content.length)
        }
    }, [ ])
    
    
    useEffect(() => {
        (async () => {
            if (visible && !quill_loaded) {
                // @ts-ignore
                if (window.define?.amd)
                    // @ts-ignore
                    window.define.amd = false
                
                await import(/* webpackIgnore: true */ `${model.assets_root}vendors/react-quill-new/dist/react-quill.js`)
                
                ;({ default: ReactQuill } = await import('react-quill-new'))
                
                set_quill_loaded(true)
            }
        })()
    }, [visible])
    
    
    return <>
        <Modal
            open={visible}
            onCancel={() => {
                set_edit_text(display_text)
                close()
            }}
            okText={t('保存')}
            onOk={() => {
                set_display_text(edit_text)
                dashboard.update_widget({ ...widget, config: { variable_ids: [ ], value: edit_text } })
                close()
            }}
            className='rich-text'
        >
            <InsertVariableBtn className='rich-text-insert-btn' on_insert={on_insert} />
            
            { quill_loaded ? 
                <ReactQuill
                    ref={quill_ref}
                    theme='snow'
                    value={edit_text}
                    onChange={set_edit_text}
                    modules={{
                        toolbar: toolbar_options
                    }}
                />
            :
                <div>{t('正在加载 ReactQuill')} ···</div>
            }
        </Modal>
        
        { display_text === '' ?
            <div className='empty-area'>
                {editing && <Button onClick={open}>{t('添加文本')}</Button>}
            </div>
        :
            <div className='ql-container ql-snow rich-text-container'>
                <div
                    className={cn({
                        'edit-rich-text': true,
                        'edit-rich-text-hover': widget.id === current?.id && editing
                    })}
                    {... editing ? { onClick: open } : { } }
                >
                    <EditOutlined className='edit-rich-text-icon' />
                    {t('编辑文本')}
                </div>
                <div className='display-area ql-editor' dangerouslySetInnerHTML={{ __html: parse_text(display_text) }} />
            </div>
        }
    </>
}
