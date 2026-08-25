import { Input, InputNumber, Modal, Select, Space } from 'antd'

import { t } from '@i18n'
import type { IMemoryEntry } from '@/agent/model/types.ts'
import { required_label } from '@/agent/settings/common.tsx'
import { memory_kind_options } from './types.ts'


export function MemoryEditModal ({
    visible,
    editing_memory_id,
    form_memory_kind,
    set_form_memory_kind,
    form_title,
    set_form_title,
    form_content,
    set_form_content,
    form_importance,
    set_form_importance,
    on_close,
    on_save,
}: {
    visible: boolean
    editing_memory_id: string
    form_memory_kind: IMemoryEntry['memoryKind']
    set_form_memory_kind: (kind: IMemoryEntry['memoryKind']) => void
    form_title: string
    set_form_title: (title: string) => void
    form_content: string
    set_form_content: (content: string) => void
    form_importance: number
    set_form_importance: (importance: number) => void
    on_close: () => void
    on_save: () => Promise<void>
}) {
    return <Modal
        title={editing_memory_id ? t('编辑记忆') : t('新增记忆')}
        open={visible}
        onCancel={on_close}
        onOk={on_save}
        okText={editing_memory_id ? t('更新') : t('新增')}
        width={640}
    >
        <Space direction='vertical' style={{ width: '100%' }}>
            <div>
                <div style={{ marginBottom: 4 }}>{t('主分类')}</div>
                <Select style={{ width: '100%' }} value={form_memory_kind} onChange={set_form_memory_kind} options={memory_kind_options} />
            </div>
            <div>
                <div style={{ marginBottom: 4 }}>{t('标题')}</div>
                <Input value={form_title} onChange={event => { set_form_title(event.target.value) }} placeholder={t('标题')} />
            </div>
            <div>
                <div style={{ marginBottom: 4 }}>{required_label(t('记忆内容'))}</div>
                <Input.TextArea value={form_content} onChange={event => { set_form_content(event.target.value) }} rows={5} placeholder={t('记忆内容')} />
            </div>
            <div>
                <span style={{ marginRight: 8 }}>{t('重要度')}</span>
                <InputNumber min={0} max={1} step={0.1} value={form_importance} onChange={value => { set_form_importance(value ?? 0.5) }} />
            </div>
        </Space>
    </Modal>
}
