import './index.scss'

import { Modal, type ModalProps } from 'antd'
import { useRef, useState } from 'react'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'

export function DraggableModal (props: ModalProps) {
    const { title, ...others } = props
    
    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 })
    const draggleRef = useRef<HTMLDivElement>(null)
    
    function onStart (_event: DraggableEvent, uiData: DraggableData) {
        const { clientWidth, clientHeight } = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect)
            return
        setBounds({
          left: -targetRect.left + uiData.x,
          right: clientWidth - (targetRect.right - uiData.x),
          top: -targetRect.top + uiData.y,
          bottom: clientHeight - (targetRect.bottom - uiData.y),
        })
    }
    
    
    
    return <Modal
        {...others}
        modalRender={
            modal => <Draggable
                disabled={disabled}
                bounds={bounds}
                nodeRef={draggleRef}
                onStart={(event, uiData) => { onStart(event, uiData) }}
                >
                <div ref={draggleRef}>{modal}</div>
            </Draggable>
        }
        title={<div
            className='draggable-modal-title'
            onMouseOver={() => {
                if (disabled)
                    setDisabled(false)
                
              }}
            onMouseOut={() => {
                setDisabled(true)
            }}
            onFocus={() => { }}
            onBlur={() => { }}
        >
            {title}
        </div>}
    />
}
