import { Button, Input, Space, Typography } from 'antd'

import { t } from '@i18n'
import type { IPublicMemory } from '@/agent/model/types.ts'


const { Text } = Typography


export function PublicMemoryView ({
    public_memory,
    public_content,
    set_public_content,
    public_loading,
    public_saving,
    public_dirty,
    on_reset,
    on_confirm_clear,
    on_confirm_save,
}: {
    public_memory: IPublicMemory | null
    public_content: string
    set_public_content: (content: string) => void
    public_loading: boolean
    public_saving: boolean
    public_dirty: boolean
    on_reset: () => void
    on_confirm_clear: () => void
    on_confirm_save: () => void
}) {
    const has_saved_content = Boolean(public_memory?.content?.trim())
    const estimated_tokens = public_memory?.estimatedTokens ?? 0
    const token_limit = public_memory?.tokenLimit
    const is_over_limit = token_limit ? estimated_tokens > token_limit : false
    
    return <div style={{ maxWidth: 880 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <Text type={is_over_limit ? 'danger' : 'secondary'} style={{ fontSize: 13 }}>
                {t('{{count}} / {{limit}} tokens', { count: estimated_tokens, limit: token_limit ?? '-' })}
            </Text>
        </div>
        <Input.TextArea
            value={public_content}
            onChange={event => { set_public_content(event.target.value) }}
            autoSize={{ minRows: 10, maxRows: 18 }}
            disabled={public_loading || public_saving}
            placeholder={t('请输入公共记忆内容，保存后将注入该 Agent 下所有用户的后续对话上下文...')}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div>
                {has_saved_content && <Button
                    danger
                    loading={public_saving}
                    onClick={on_confirm_clear}
                >
                    {t('清空公共记忆')}
                </Button>}
            </div>
            <Space>
                {public_dirty && <Button
                    disabled={public_saving}
                    onClick={on_reset}
                >
                    {t('撤销修改')}
                </Button>}
                <Button
                    type='primary'
                    loading={public_saving}
                    disabled={!public_dirty}
                    onClick={on_confirm_save}
                >
                    {t('保存')}
                </Button>
            </Space>
        </div>
    </div>
}
