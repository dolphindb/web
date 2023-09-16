import { Button, Modal } from 'antd'
import React, { useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import './index.sass'
import { use_modal } from 'react-object-model/modal'

export function RichText () {
  const [text, set_text] = useState('')
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
  
  return <>
    <Modal open={visible}
           footer={[ ]}
           onCancel={close}
           >
        <ReactQuill theme='snow' 
                    value={text} 
                    onChange={set_text}
                    modules={{
                      toolbar: toolbarOptions
                    }}/>
                     
    </Modal>
      {text === '' ?  <div className='empty-area'><Button onClick={open}>
                          添加文本
                      </Button>
                  </div> : <div dangerouslySetInnerHTML={{ __html: text }}
                                className='display-area'
                                onClick={open}/>
      }
    </>
}
