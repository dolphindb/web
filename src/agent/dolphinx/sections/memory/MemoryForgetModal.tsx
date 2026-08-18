import { Modal, Select } from 'antd'

import { t } from '@i18n'
import type { ISession } from '@/agent/model.ts'


export function MemoryForgetModal ({
    visible,
    forget_sessions,
    forget_session_id,
    set_forget_session_id,
    forget_loading,
    on_close,
    on_forget,
}: {
    visible: boolean
    forget_sessions: ISession[]
    forget_session_id: string
    set_forget_session_id: (id: string) => void
    forget_loading: boolean
    on_close: () => void
    on_forget: () => Promise<void>
}) {
    return <Modal
        title={t('忘记会话记忆')}
        open={visible}
        onCancel={on_close}
        onOk={on_forget}
        confirmLoading={forget_loading}
        okText={t('忘记')}
    >
        <Select
            style={{ width: '100%' }}
            value={forget_session_id || undefined}
            onChange={set_forget_session_id}
            placeholder={t('选择会话')}
            options={forget_sessions.map(session => ({
                value: session.sessionId,
                label: session.title || session.sessionId,
            }))}
        />
    </Modal>
}
