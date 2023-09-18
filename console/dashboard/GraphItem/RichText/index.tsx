import { Button, Modal } from 'antd'
import React, { useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import 'react-quill/dist/quill.core.css'
import { use_modal } from 'react-object-model/modal'
import './index.sass'


function replaceVariables (origin_string: string, variables: object) {
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

export function RichText () {
  const [edit_edit, set_edit_text] = useState('')
  const [display_text, set_display_text] = useState('')
  const { visible, open, close } = use_modal()
  const  toolbarOptions = useMemo(() => [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],
  
    [{ header: 1 }, { header: 2 }],               // custom button values
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ script: 'sub' }, { script: 'super' }],      // superscript/subscript
    [{ indent: '-1' }, { indent: '+1' }],          // outdent/indent
    [{ direction: 'rtl' }],                         // text direction
  
    [{ size: ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
  
    [{ color: [ ] }, { background: [ ] }],          // dropdown with defaults from theme
    [{ font: [ ] }],
    [{ align: [ ] }],
  
    ['clean']                                         // remove formatting button
  ], [ ])
  
  const variables = {
    name: 'rick',
    age: 18
  }
  
  const template_text = useMemo(() => 
    replaceVariables(display_text, variables), 
  [display_text])
  
  return <>
    <Modal open={visible}
           onCancel={() => { set_edit_text(display_text)
                             close() }}
           okText='保存'
           closeIcon={false}
           onOk={() => { set_display_text(edit_edit)
                        close() }}
           >
        <ReactQuill theme='snow'
                    value={edit_edit} 
                    onChange={set_edit_text}
                    
                    modules={{
                      toolbar: toolbarOptions
                    }}/>
                     
    </Modal>
      {display_text === '' ?  
                      <div className='empty-area'>
                        <Button onClick={open}>
                          添加文本
                        </Button>
                      </div> 
                          : 
                      <div className='ql-container ql-snow'>
                        <div dangerouslySetInnerHTML={{ __html: template_text }}
                             className='display-area ql-editor'
                             onClick={open}/>
                      </div>
      }
    </>
}
