import { Input } from 'antd'
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'
import type { ISession } from '@/agent/model/types.ts'

import { use_session_picker } from './useSessionPicker.ts'

export function SessionPicker ({ chat, open, session_id, on_select, on_close }: {
    chat: ChatModel
    open: boolean
    session_id: string
    on_select: (session: ISession) => void
    on_close: () => void
}) {
    const { agents, selected_agent, set_selected_agent, search, set_search, searching, rows } = use_session_picker(chat, open)
    
    return <div className='ai-session-switcher' onKeyDown={event => {
        if (event.key === 'Escape')
            if (searching)
                set_search('')
            else
                on_close()
    }}>
        <div className='ai-session-switcher-search-bar'>
            {searching && <button className='ai-session-switcher-back' aria-label={t('返回')} onClick={() => { set_search('') }}>
                <ArrowLeftOutlined />
            </button>}
            <Input
                className='ai-session-switcher-search'
                variant='borderless'
                prefix={<SearchOutlined />}
                placeholder={t('搜索会话')}
                value={search}
                allowClear
                onChange={event => { set_search(event.target.value) }}
            />
        </div>
        <div className='ai-session-switcher-body'>
            {!searching && <div className='ai-session-switcher-list ai-session-switcher-agents'>
                {agents.map(agent => <button
                    key={agent.agentId}
                    className={agent.agentId === selected_agent ? 'active' : undefined}
                    title={agent.agentName}
                    onClick={() => { set_selected_agent(agent.agentId) }}
                >
                    <span className='ai-session-switcher-name'>{agent.agentName}</span>
                </button>)}
            </div>}
            <div className='ai-session-switcher-list ai-session-switcher-sessions'>
                {rows.length ? rows.map(({ session, title }) => <button
                    key={session.sessionId}
                    className={session.sessionId === session_id ? 'active' : undefined}
                    title={title}
                    onClick={() => { on_select(session) }}
                >
                    <span className='ai-session-switcher-name'>{title}</span>
                    {session.updateTime && dayjs(session.updateTime).isValid() && <span className='ai-session-switcher-time'>
                        {dayjs(session.updateTime).format('M-D HH:mm')}
                    </span>}
                </button>) : <div className='ai-session-switcher-empty'>{t('暂无会话')}</div>}
            </div>
        </div>
    </div>
}
