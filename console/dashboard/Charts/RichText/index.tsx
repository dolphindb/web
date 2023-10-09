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


function replace_variables (origin_string: string, variables: object) {
    const regex = /{{(.*?)}}/g
    let match = null
    let replaced_string = origin_string
    
    while ((match = regex.exec(origin_string)) !== null) {
        const full_match = match[0] // 完整的匹配，例如 "{{name}}"
        const variable_name = match[1].trim() // 提取变量名，例如 "name"
        const variable_value = variables[variable_name]
        
        // 如果找到变量值，则替换，否则保留原始字符串
        if (variable_value !== undefined)
            replaced_string = replaced_string.replace(full_match, variable_value)
    }
    
    return replaced_string
}

export function RichText ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const [display_text, set_display_text] = useState((widget.config as ITextConfig).value || '')
    const [edit_text, set_edit_text] = useState(display_text)
    const { visible, open, close } = use_modal()
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
    
    const variables = {
        name: 'rick',
        age: 18
    }
    
    const template_text = useMemo(() => replace_variables(display_text, variables), [display_text])
    
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
