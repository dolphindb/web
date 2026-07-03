import './SettingsModal.sass'

import { CloseOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Button, Modal, Spin, Tabs, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from './model.ts'
import type { IBuiltinInitResult } from './model.ts'
import { get_builtin_init_action } from './builtin-init.ts'
import type { BuiltinInitAction } from './builtin-init.ts'
import { DolphinXAdminTab, DolphinXUserTab, MemoryManagementTab } from './DolphinXUserSettings.tsx'
import { AgentTab } from './settings/AgentTab.tsx'
import { LlmConfigTab } from './settings/LlmConfigTab.tsx'
import { McpTab } from './settings/McpTab.tsx'
import { SkillsTab } from './settings/SkillsTab.tsx'


const { Text } = Typography

const builtin_summary_labels: [keyof NonNullable<IBuiltinInitResult['summary']>, string][] = [
    ['createdAgents', t('新建 Agent')],
    ['createdSkills', t('新建 Skill')],
    ['updatedSkills', t('更新 Skill')],
    ['createdBindings', t('新建绑定')],
    ['skippedExisting', t('跳过已有')],
    ['skippedUnchanged', t('跳过未变化')],
    ['skippedUserModified', t('跳过用户修改')],
    ['failed', t('失败')],
]


function stringify_error_detail (value: unknown) {
    if (value instanceof Error)
        return [
            value.message,
            value.stack,
            value.cause instanceof Error ? value.cause.stack : value.cause ? String(value.cause) : '',
        ].filter(Boolean).join('\n\n')
    if (typeof value === 'string')
        return value
    if (is_builtin_init_result(value))
        return format_builtin_init_error(value)
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

function show_builtin_init_error (title: string, detail: unknown) {
    model.show_error({
        title,
        body: stringify_error_detail(detail),
    })
}

function format_builtin_version (value?: string) {
    return value || t('暂无版本信息')
}


function format_builtin_failure_resource (item: NonNullable<IBuiltinInitResult['lastFailures']>[number]) {
    return item.resourceKey || item.resourceId || item.resourceType || '-'
}


function format_builtin_item_action (action?: string) {
    if (action === 'CREATED')
        return t('新建')
    if (action === 'UPDATED')
        return t('更新')
    if (action === 'BOUND')
        return t('绑定')
    return action || '-'
}


function show_builtin_notice (action: BuiltinInitAction) {
    return ['upgrade', 'partial', 'invalid'].includes(action)
}


function get_builtin_notice_label (action: BuiltinInitAction) {
    if (action === 'upgrade')
        return t('内置资源升级')
    if (action === 'partial')
        return t('初始化部分成功')
    if (action === 'invalid')
        return t('初始化资源有问题')
    return ''
}


function get_builtin_notice_description (action: BuiltinInitAction) {
    if (action === 'upgrade')
        return t('检测到内置 Agent 或 Skill 可升级，请执行升级。')
    if (action === 'partial')
        return t('存在失败或冲突项，可继续初始化。')
    if (action === 'invalid')
        return t('当前内置资源 manifest 缺失、无法解析或校验失败。')
    return ''
}


function merge_builtin_preview_status (status: IBuiltinInitResult | null, preview: IBuiltinInitResult | null) {
    if (!preview)
        return status
    if (!status)
        return preview
    return {
        ...status,
        ...preview,
        state: status?.state || preview.state,
        appliedManifestVersion: status?.appliedManifestVersion || preview.appliedManifestVersion,
        availableManifestVersion: status?.availableManifestVersion || preview.availableManifestVersion,
    }
}


function is_builtin_init_result (value: unknown): value is IBuiltinInitResult {
    return Boolean(value && typeof value === 'object' && ('state' in value || 'summary' in value || 'lastFailures' in value))
}


function format_builtin_init_error (result: IBuiltinInitResult) {
    const top_level_error = Boolean(result.errorCode || result.message)
    const lines = [
        result.state ? `${t('状态')}: ${result.state}` : '',
        result.errorCode ? `${t('错误码')}: ${result.errorCode}` : '',
        result.message || '',
    ].filter(Boolean)
    
    if (result.summary) {
        const summary = builtin_summary_labels
            .map(([key, label]) => result.summary?.[key] === undefined ? '' : `${label}: ${result.summary[key]}`)
            .filter(Boolean)
            .join('，')
        if (summary)
            lines.push(`${t('摘要')}: ${summary}`)
    }
    
    const failures = result.lastFailures || [ ]
    if (!top_level_error && failures.length) {
        lines.push('', t('最近失败项'))
        failures.slice(0, 5).forEach((item, index) => {
            lines.push(`${index + 1}. ${format_builtin_failure_resource(item)}`)
            lines.push(`   ${[item.resourceType, item.action, item.status].filter(Boolean).join(' / ') || '-'}`)
            if (item.errorCode || item.message)
                lines.push(`   ${[item.errorCode, item.message].filter(Boolean).join(': ')}`)
        })
        if (failures.length > 5)
            lines.push(t('失败项过多，仅展示前 5 条'))
    }
    
    return lines.join('\n')
}


function BuiltinStatusDetail ({ status, show_errors = false }: { status: IBuiltinInitResult | null, show_errors?: boolean }) {
    if (!status)
        return null
    const summary = status.summary
    const summary_items = summary
        ? builtin_summary_labels
            .map(([key, label]) => ({ label, value: summary[key] }))
            .filter(item => item.value !== undefined && item.value !== null)
        : [ ]
    const changed_items = (status.items || [ ])
        .filter(item => item.status === 'SUCCESS' && ['CREATED', 'UPDATED', 'BOUND'].includes(item.action || ''))
    const error_text = [status.errorCode, status.message].filter(Boolean).join(': ')
    const failures = status.lastFailures || [ ]
    const display_failures = error_text ? [ ] : failures
        
    return <div className='ai-builtin-status-detail'>
        <div className='ai-builtin-status-row'>
            <Text type='secondary'>{t('状态')}</Text>
            <span>{status.state || '-'}</span>
        </div>
        <div className='ai-builtin-status-row'>
            <Text type='secondary'>{t('当前版本')}</Text>
            <span>{format_builtin_version(status.appliedManifestVersion || status.manifestVersion)}</span>
        </div>
        <div className='ai-builtin-status-row'>
            <Text type='secondary'>{t('可升级版本')}</Text>
            <span>{format_builtin_version(status.availableManifestVersion || status.manifestVersion)}</span>
        </div>
        {summary_items.length > 0 && <div className='ai-builtin-status-row'>
            <Text type='secondary'>{t('摘要')}</Text>
            <div className='ai-builtin-summary'>
                {summary_items.map(item =>
                    <span key={item.label} className='ai-builtin-summary-item'>{item.label}: {item.value}</span>
                )}
            </div>
        </div>}
        {status.items && <div className='ai-builtin-status-row'>
            <Text type='secondary'>{t('升级内容')}</Text>
            <div className='ai-builtin-summary'>
                {changed_items.length
                    ? changed_items.map((item, index) =>
                        <span key={`${item.resourceType}-${item.resourceKey}-${index}`} className='ai-builtin-summary-item'>
                            {format_builtin_item_action(item.action)} {item.resourceType || ''} {format_builtin_failure_resource(item)}
                        </span>
                    )
                    : <span className='ai-builtin-summary-item'>{t('无变更')}</span>
                }
            </div>
        </div>}
        {show_errors && <div className='ai-builtin-status-row'>
            <Text type='secondary'>{t('错误信息')}</Text>
            <div className='ai-builtin-errors'>
                {error_text && <div className='ai-builtin-error-item'>{error_text}</div>}
                {display_failures.map((item, index) =>
                    <div key={`${item.resourceType}-${item.resourceKey}-${index}`} className='ai-builtin-error-item'>
                        {[format_builtin_failure_resource(item), item.resourceType, item.action, item.status].filter(Boolean).join(' / ')}
                        {(item.errorCode || item.message) && <div>{[item.errorCode, item.message].filter(Boolean).join(': ')}</div>}
                    </div>
                )}
                {!error_text && !display_failures.length && <div className='ai-builtin-error-item'>-</div>}
            </div>
        </div>}
    </div>
}


export function SettingsModal () {
    const { settings_visible, can_manage_agents } = chat_model.use(['settings_visible', 'can_manage_agents'])
    const { admin, v3 } = model.use(['admin', 'v3'])
    const [builtin_status, set_builtin_status] = useState<IBuiltinInitResult | null>(null)
    const [checking_builtin, set_checking_builtin] = useState(false)
    const [initializing_builtin, set_initializing_builtin] = useState(false)
    const [previewing_builtin, set_previewing_builtin] = useState(false)
    const [builtin_notice_visible, set_builtin_notice_visible] = useState(false)
    const [builtin_preview_status, set_builtin_preview_status] = useState<IBuiltinInitResult | null>(null)
    const [show_builtin_errors, set_show_builtin_errors] = useState(false)
    const [builtin_action_result, set_builtin_action_result] = useState<IBuiltinInitResult | null>(null)
    const [builtin_action_result_type, set_builtin_action_result_type] = useState<BuiltinInitAction>('none')
    const can_manage_agent = admin || can_manage_agents
    
    useEffect(() => {
        if (settings_visible && !v3)
            chat_model.set({ settings_visible: false })
    }, [settings_visible, v3])
    
    useEffect(() => {
        if (!settings_visible || !v3)
            return
        let disposed = false
        chat_model.agent.load_agents()
            .catch(error => { console.error('Load Agent list failed:', error) })
        set_checking_builtin(true)
        chat_model.llm.load_builtin_init_status(admin)
            .then(result => {
                if (!disposed)
                    set_builtin_status(result)
            })
            .catch(error => {
                console.error('Load built-in Agent/Skill init status failed:', error)
                if (!disposed)
                    set_builtin_status(null)
            })
            .finally(() => {
                if (!disposed)
                    set_checking_builtin(false)
            })
        return () => { disposed = true }
    }, [settings_visible, admin])
    
    const builtin_action = get_builtin_init_action(builtin_status)
    const show_builtin_init = checking_builtin || builtin_action === 'initialize'
    const show_builtin_notice_card = builtin_notice_visible && (show_builtin_notice(builtin_action) || Boolean(builtin_action_result))
    const builtin_display_status = builtin_action_result || merge_builtin_preview_status(builtin_status, builtin_preview_status)
    if (!v3)
        return null
    
    async function open_builtin_notice () {
        set_builtin_action_result(null)
        set_builtin_action_result_type('none')
        set_builtin_notice_visible(true)
        set_builtin_preview_status(null)
        set_show_builtin_errors(builtin_action === 'invalid')
        if (!admin || !['upgrade', 'partial'].includes(builtin_action))
            return
        set_previewing_builtin(true)
        try {
            const result = await chat_model.llm.init_builtins({ dryRun: true, includeDetails: true })
            set_builtin_preview_status(result)
        } catch (error) {
            console.error('Preview built-in Agent/Skill init failed:', error)
            set_builtin_preview_status(null)
        } finally {
            set_previewing_builtin(false)
        }
    }
    async function initialize_builtins () {
        set_initializing_builtin(true)
        const action = get_builtin_init_action(builtin_status)
        try {
            const result = await chat_model.llm.init_builtins({ dryRun: false, includeDetails: true })
            set_builtin_status(result)
            const result_action = get_builtin_init_action(result)
            if (result_action === 'none') {
                if (action === 'upgrade' || action === 'partial') {
                    set_builtin_action_result(result)
                    set_builtin_action_result_type(action)
                    set_show_builtin_errors(false)
                } else {
                    set_builtin_notice_visible(false)
                    message.success(t('初始化完成'))
                }
                await chat_model.agent.load_agents()
            } else if (show_builtin_notice(action)) {
                set_builtin_action_result(null)
                set_builtin_preview_status(result)
                set_show_builtin_errors(true)
                set_builtin_notice_visible(true)
            } else {
                console.warn('Built-in Agent/Skill init finished but is not ready:', result)
                show_builtin_init_error(action === 'upgrade' ? t('AI 内置资源升级未完成') : t('AI 内置资源初始化未完成'), result)
            }
        } catch (error) {
            console.error('Built-in Agent/Skill init failed:', error)
            show_builtin_init_error(action === 'upgrade' ? t('AI 内置资源升级失败') : t('AI 内置资源初始化失败'), error)
        } finally {
            set_initializing_builtin(false)
        }
    }
    
    return <Modal
        title={<div className='ai-settings-modal-title'>
            <span>{t('AI 设置')}</span>
            {!checking_builtin && show_builtin_notice(builtin_action) && <Button
                type='link'
                size='small'
                className='ai-builtin-upgrade-entry'
                onClick={open_builtin_notice}
            >
                {get_builtin_notice_label(builtin_action)}
            </Button>}
        </div>}
        open={settings_visible}
        onCancel={() => {
            set_builtin_notice_visible(false)
            set_builtin_preview_status(null)
            set_show_builtin_errors(false)
            set_builtin_action_result(null)
            set_builtin_action_result_type('none')
            chat_model.set({ settings_visible: false })
        }}
        footer={null}
        width='min(1440px, calc(100vw - 48px))'
        className='ai-settings-modal'
        destroyOnHidden
    >
        <div className='ai-settings-modal-content'>
            <Tabs
                className='ai-settings-tabs'
                destroyOnHidden
                items={[
                    ...can_manage_agent ? [{
                        key: 'agent',
                        label: t('Agent 管理'),
                        children: <AgentTab />,
                    }] : [ ],
                    ...admin ? [{
                        key: 'llm',
                        label: t('模型配置'),
                        children: <LlmConfigTab />,
                    },
                    {
                        key: 'skills',
                        label: t('技能管理'),
                        children: <SkillsTab />,
                    }] : [ ],
                    {
                        key: 'memory',
                        label: t('记忆管理'),
                        children: <MemoryManagementTab can_manage_memory={can_manage_agent} />,
                    },
                    ...can_manage_agent ? [{
                        key: 'mcp',
                        label: t('MCP 管理'),
                        children: <McpTab can_manage_mcp={can_manage_agent} />,
                    }] : [ ],
                    {
                        key: 'user',
                        label: t('个人中心'),
                        children: <DolphinXUserTab admin={admin} />,
                    },
                    ...admin
                        ? [{
                            key: 'admin',
                            label: t('用户管理'),
                            children: <DolphinXAdminTab />,
                        }]
                        : [ ],
                ]}
            />
            {(show_builtin_init || show_builtin_notice_card) && <div
                className='ai-builtin-mask'
                onClick={() => {
                    if (show_builtin_notice_card) {
                        set_builtin_notice_visible(false)
                        set_builtin_preview_status(null)
                        set_show_builtin_errors(false)
                        set_builtin_action_result(null)
                        set_builtin_action_result_type('none')
                    }
                }}
            >
                <div
                    className={`ai-builtin-card${show_builtin_notice_card ? ' ai-builtin-card-detail' : ''}`}
                    onClick={event => { event.stopPropagation() }}
                >
                    {checking_builtin
                        ? <Spin />
                        : <>
                            {show_builtin_notice_card && <Button
                                type='text'
                                size='small'
                                className='ai-builtin-close'
                                aria-label={t('关闭')}
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    set_builtin_notice_visible(false)
                                    set_builtin_preview_status(null)
                                    set_show_builtin_errors(false)
                                    set_builtin_action_result(null)
                                    set_builtin_action_result_type('none')
                                }}
                            />}
                            <div className='ai-builtin-title'>{builtin_action_result ? builtin_action_result_type === 'upgrade' ? t('内置资源升级成功') : t('初始化完成') : show_builtin_notice_card ? get_builtin_notice_label(builtin_action) : t('需要初始化 AI 内置资源')}</div>
                            {!builtin_action_result && <Text type='secondary'>{show_builtin_notice_card ? get_builtin_notice_description(builtin_action) : t('首次使用 AI 前，需要初始化内置 Agent 和 Skill。')}</Text>}
                            {show_builtin_notice_card && (previewing_builtin
                                ? <Spin className='ai-builtin-preview-loading' />
                                : <BuiltinStatusDetail status={builtin_display_status} show_errors={show_builtin_errors || builtin_action === 'invalid'} />)}
                            <div className='ai-builtin-actions'>
                                {builtin_action_result
                                    ? <Button type='primary' size='large' onClick={() => {
                                        set_builtin_notice_visible(false)
                                        set_builtin_preview_status(null)
                                        set_show_builtin_errors(false)
                                        set_builtin_action_result(null)
                                        set_builtin_action_result_type('none')
                                    }}>{t('确认')}</Button>
                                    : builtin_action === 'invalid'
                                        ? null
                                    : admin
                                        ? <Button type='primary' size='large' loading={initializing_builtin} onClick={initialize_builtins}>{builtin_action === 'upgrade' ? t('升级') : builtin_action === 'partial' ? t('继续初始化') : t('一键初始化')}</Button>
                                    : <Text type='danger'>{builtin_action === 'upgrade' ? t('请联系管理员处理 AI 内置资源') : t('请联系管理员完成初始化')}</Text>
                                }
                            </div>
                        </>
                    }
                </div>
            </div>}
        </div>
    </Modal>
}
