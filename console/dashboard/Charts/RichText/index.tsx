import { Button, Modal } from 'antd'
import React, { useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import { use_modal } from 'react-object-model/modal'
import { t } from '../../../../i18n/index.js'
import './index.sass'
import { type Widget, dashboard } from '../../model.js'
import { type ITextConfig } from '../../type.js'
import { EditOutlined } from '@ant-design/icons'
import cn from 'classnames'
import {  variables } from '../../Variable/variable.js'
import { parse_text } from '../../utils.js'
import { useRef } from 'react'
import { useCallback } from 'react'
import { InsertVariableBtn } from '../../DataSource/InsertVariableBtn.js'


export function RichText ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const [display_text, set_display_text] = useState((widget.config as ITextConfig).value || '')
    const [edit_text, set_edit_text] = useState(display_text)
    const { visible, open, close } = use_modal()
    const variable_obj = variables.use()
    
    const quill_ref = useRef<any>()
    
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
    
    let template_text = parse_text(display_text)
    
    const on_insert = useCallback((content: string) => { 
        if (quill_ref?.current) { 
            const editor = quill_ref?.current?.getEditor?.()
        
            const cursorPosition = editor?.getSelection()?.index
            
            editor?.insertText(cursorPosition, content)
            editor?.setSelection(cursorPosition + content.length)
        }
    }, [ ])
    
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
                    dashboard.update_widget( { ...widget, config: { variable_ids: [ ], value: edit_text } } )
                    close()
                }}
                className='rich-text'
        >
                <InsertVariableBtn className='rich-text-insert-btn' on_insert={on_insert} />
                <ReactQuill
                    ref={quill_ref}
                    theme='snow'
                    value={edit_text}
                    onChange={set_edit_text}
                    modules={{
                        toolbar: toolbar_options
                    }}
                />
            </Modal>
            {display_text === '' ? (
                <div className='empty-area'>
                    <Button onClick={editing && open}>{t('添加文本')}</Button>
                </div>
            ) : (
                <div className='ql-container ql-snow rich-text-container'>
                    <div
                        className={cn({
                            'edit-rich-text': true,
                            'edit-rich-text-hover': widget.id === current?.id && editing,
                        })}
                        onClick={editing && open}
                    >
                        <EditOutlined className='edit-rich-text-icon' />
                        编辑文本
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: template_text }} className='display-area ql-editor' />
                </div>
            )}
        </>
}
