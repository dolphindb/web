import { Button, Input, Space, Typography } from 'antd'

import { t } from '@i18n'
import type { IPublicMemory } from '@/agent/model/types.ts'
import { format_browser_time } from '@/agent/dolphinx/common.tsx'


const { Text } = Typography


export function PublicMemoryView ({
    public_memory,
    public_content,
    set_public_content,
    public_editing,
    can_manage_memory,
    public_loading,
    public_saving,
    public_dirty,
    on_cancel_editing,
    on_confirm_clear,
    on_confirm_save,
    on_load_public,
    on_open_editing,
}: {
    public_memory: IPublicMemory | null
    public_content: string
    set_public_content: (content: string) => void
    public_editing: boolean
    can_manage_memory: boolean
    public_loading: boolean
    public_saving: boolean
    public_dirty: boolean
    on_cancel_editing: () => void
    on_confirm_clear: () => void
    on_confirm_save: () => void
    on_load_public: () => void
    on_open_editing: () => void
}) {
    return <div style={{ maxWidth: 880 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <Space wrap>
                <Text type='secondary'>{t('{{count}} / {{limit}} tokens', { count: public_memory?.estimatedTokens ?? 0, limit: public_memory?.tokenLimit ?? '-' })}</Text>
                {public_memory?.updatedBy && <Text type='secondary'>{t('更新人：{{user}}', { user: public_memory.updatedBy })}</Text>}
                {public_memory?.updateTime && <Text type='secondary'>{format_browser_time(public_memory.updateTime)}</Text>}
            </Space>
            <Space wrap>
                {can_manage_memory && public_editing
                    ? <>
                        <Button disabled={public_saving} onClick={on_cancel_editing}>{t('取消')}</Button>
                        <Button danger loading={public_saving} onClick={on_confirm_clear}>{t('清空')}</Button>
                        <Button type='primary' loading={public_saving} disabled={!public_dirty} onClick={on_confirm_save}>{t('保存')}</Button>
                    </>
                    : <>
                        <Button loading={public_loading} onClick={on_load_public}>{t('刷新')}</Button>
                        {can_manage_memory && <>
                            <Button disabled={public_loading} onClick={on_open_editing}>{t('编辑')}</Button>
                            <Button danger loading={public_saving} onClick={on_confirm_clear}>{t('清空')}</Button>
                        </>}
                    </>}
            </Space>
        </div>
        <Input.TextArea
            value={public_content}
            onChange={event => {
                if (public_editing)
                    set_public_content(event.target.value)
            }}
            rows={14}
            disabled={public_loading || public_saving}
            readOnly={!public_editing}
            placeholder={t('公共记忆内容')}
        />
    </div>
}
