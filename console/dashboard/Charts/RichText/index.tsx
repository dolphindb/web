import { Button, Modal } from 'antd'
import React, { useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import 'react-quill/dist/quill.core.css'
import { use_modal } from 'react-object-model/modal'
import { t } from '../../../../i18n/index.js'
import './index.sass'
import { type Widget, dashboard } from '../../model.js'
import { type ITextConfig } from '../../type.js'
import { EditOutlined } from '@ant-design/icons'
import cn from 'classnames'
import { find_variable_by_name, variables } from '../../Variable/variable.js'


export function parse_code (code: string): string {
    code = code.replace(/\{\{(.*?)\}\}/g, function (match, variable) {
        return get_variable_value(variable.trim())
    })
    return code
}

export function get_variable_value (variable_name: string): string {
    const variable = find_variable_by_name(variable_name)
    return variable?.value || `{{${variable_name}}}`
}

export function RichText ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const [display_text, set_display_text] = useState((widget.config as ITextConfig).value || '')
    const [edit_text, set_edit_text] = useState(display_text)
    const { visible, open, close } = use_modal()
    const variable_obj = variables.use()
    
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
    
    let template_text = display_text
    
    try {
        template_text = parse_code(display_text)
    } catch (error) {
        console.log(error)
        dashboard.message.error(error.message)
    }
    
    
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
                <ReactQuill
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
