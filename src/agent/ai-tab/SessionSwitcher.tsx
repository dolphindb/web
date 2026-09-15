import './SessionSwitcher.sass'

import { useEffect, useRef, useState } from 'react'
import { Dropdown } from 'antd'

import { t } from '@i18n'
import { get_chat_model } from '@/agent/model.ts'
import { shell } from '@/shell/model.ts'
import { SessionPicker } from './SessionPicker.tsx'

export function SessionSwitcher ({ session_id, title, on_rename }: {
    session_id: string
    title: string
    on_rename: () => void
}) {
    const chat = get_chat_model(session_id)
    const { agent_id } = chat.use(['agent_id'])
    const [open, set_open] = useState(false)
    const click_timer = useRef<ReturnType<typeof setTimeout>>(undefined)
    
    useEffect(() => {
        set_open(false)
        return () => { clearTimeout(click_timer.current) }
    }, [session_id, agent_id])
    
    return <Dropdown
        open={open}
        onOpenChange={value => {
            if (!value)
                set_open(false)
        }}
        trigger={['click']}
        placement='bottom'
        popupRender={() => <SessionPicker
            chat={chat}
            open={open}
            session_id={session_id}
            on_close={() => { set_open(false) }}
            on_select={session => {
                set_open(false)
                shell.bind_ai_tab_session(session_id, session.sessionId, session.title || t('新会话'), shell.itab)
            }}
        />}
    >
        <div
            className='ai-toolbar-title ai-session-switcher-trigger'
            title={title}
            role='button'
            tabIndex={0}
            onClick={() => {
                // 等待双击判定，避免改名时同时展开会话列表。
                clearTimeout(click_timer.current)
                click_timer.current = setTimeout(() => { set_open(!open) }, 300)
            }}
            onDoubleClick={() => {
                clearTimeout(click_timer.current)
                set_open(false)
                on_rename()
            }}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    set_open(value => !value)
                }
            }}
        >{title}</div>
    </Dropdown>
}
