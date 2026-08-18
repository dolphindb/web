import { Button, Input, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import { form_error_alert, required_label } from '@/agent/settings/common.tsx'
import type { SkillOverrides } from './types.ts'


export function SkillCreateForm ({
    form_error,
    skill_file,
    set_skill_file,
    overrides,
    set_overrides,
    loading,
    on_cancel,
    on_submit,
}: {
    form_error: string
    skill_file: File | null
    set_skill_file: (file: File | null) => void
    overrides: SkillOverrides
    set_overrides: React.Dispatch<React.SetStateAction<SkillOverrides>>
    loading: boolean
    on_cancel: () => void
    on_submit: () => Promise<void>
}) {
    return <div style={{ marginBottom: 16 }}>
        {form_error_alert(form_error)}
        <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(<>{t('技能包')} (ZIP)</>)}</div>
            <Upload
                accept='.zip'
                maxCount={1}
                beforeUpload={file => {
                    set_skill_file(file)
                    return false
                }}
                onRemove={() => { set_skill_file(null) }}
            >
                <Button icon={<UploadOutlined />}>{t('选择 ZIP 文件')}</Button>
            </Upload>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                {t('ZIP 包须包含 SKILL.md 入口文件（含 YAML frontmatter 元数据和 Markdown 指令体）')}
            </div>
        </div>
        <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>{t('覆盖元数据（可选，覆盖 SKILL.md 中的同名字段）')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('名称')}</div>
                <Input
                    value={overrides.name}
                    onChange={e => { set_overrides({ ...overrides, name: e.target.value }) }}
                    placeholder={t('例如: search-database')}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('显示名称')}</div>
                <Input
                    value={overrides.displayName}
                    onChange={e => { set_overrides({ ...overrides, displayName: e.target.value }) }}
                    placeholder={t('例如: 数据库搜索')}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('分类')}</div>
                <Input
                    value={overrides.category}
                    onChange={e => { set_overrides({ ...overrides, category: e.target.value }) }}
                    placeholder={t('例如: database')}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('版本')}</div>
                <Input
                    value={overrides.version}
                    onChange={e => { set_overrides({ ...overrides, version: e.target.value }) }}
                    placeholder={t('例如: 1.0.0')}
                />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                <Input.TextArea
                    value={overrides.description}
                    onChange={e => { set_overrides({ ...overrides, description: e.target.value }) }}
                    placeholder={t('技能描述，会作为 Agent 调用技能时的参考信息')}
                    rows={3}
                />
            </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={on_cancel}>{t('取消')}</Button>
            <Button type='primary' loading={loading} onClick={on_submit}>{t('注册')}</Button>
        </div>
    </div>
}
