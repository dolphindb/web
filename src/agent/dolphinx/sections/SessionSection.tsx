import { useEffect, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Empty, Input, Modal, Popconfirm, Space, Switch, Table, Tooltip, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { shell } from '@/shell/model.ts'

import { chat_model, get_chat_model } from '@/agent/model.ts'
import type { ISession } from '@/agent/model.ts'
import {
    AgentListLayout,
    format_browser_time,
    format_file_size,
    page_total,
    show_error,
    use_agent_options,
    use_valid_agent_selection,
} from '@/agent/dolphinx/common.tsx'


const { Text } = Typography


export function SessionSection () {
    const { agent_id, options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [sessions, set_sessions] = useState<ISession[]>([ ])
    const [session_page, set_session_page] = useState(1)
    const [session_page_size, set_session_page_size] = useState(20)
    const [session_total, set_session_total] = useState(0)
    const [summary_session, set_summary_session] = useState<ISession | null>(null)
    const [editing_session, set_editing_session] = useState<ISession | null>(null)
    const [editing_title, set_editing_title] = useState('')
    const [summary_instructions, set_summary_instructions] = useState('')
    const [force_summary, set_force_summary] = useState(false)
    const [summary, set_summary] = useState('')
    const [generating_summary, set_generating_summary] = useState(false)
    const [triggering_session_id, set_triggering_session_id] = useState('')
    const [memory_enabled, set_memory_enabled] = useState(false)
    const [memory_settings_loading, set_memory_settings_loading] = useState(false)
    const [loading, set_loading] = useState(false)
    const summary_modal = use_modal()
    const title_modal = use_modal()
    use_valid_agent_selection(options, selected_agent_id, set_selected_agent_id, agent_id)
    
    async function load_sessions (page = session_page, page_size = session_page_size, known_total?: number) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const offset = (page - 1) * page_size
            const result = await chat_model.session.list_sessions({
                agentId: selected_agent_id,
                offset,
                limit: page_size + 1,
            })
            const items = result.items.slice(0, page_size)
            if (items.length === 0 && page > 1) {
                await load_sessions(page - 1, page_size, (page - 1) * page_size)
                return
            }
            const stats = await Promise.all(items.map(session => chat_model.session.load_session_workspace_stats(session.sessionId)))
            set_sessions(items.map((session, index) => stats[index] ? { ...session, ...stats[index] } : session))
            set_session_page(page)
            set_session_page_size(page_size)
            set_session_total(known_total ?? page_total(result.offset ?? offset, items.length, result.items.length > page_size, result.total))
        } catch (error) {
            show_error(error, t('加载会话失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        if (selected_agent_id) {
            load_sessions(1, session_page_size)
            load_memory_settings()
        } else
            set_memory_enabled(false)
    }, [selected_agent_id])
    
    async function load_memory_settings () {
        if (!selected_agent_id)
            return
        set_memory_settings_loading(true)
        try {
            const settings = await chat_model.memory.get_personal_settings(selected_agent_id)
            set_memory_enabled(settings.personalMemoryEnabled)
        } catch (error) {
            set_memory_enabled(false)
            show_error(error, t('加载记忆设置失败'))
        } finally {
            set_memory_settings_loading(false)
        }
    }
    
    async function delete_session (session_id: string) {
        if (!session_id)
            return
        try {
            await chat_model.session.delete_session(session_id)
            message.success(t('删除成功'))
            await load_sessions()
        } catch (error) {
            show_error(error, t('删除会话失败'))
        }
    }
    
    async function save_session_title () {
        if (!editing_session)
            return
        const title = editing_title.trim()
        if (!title) {
            message.warning(t('请输入标题'))
            return
        }
        try {
            await chat_model.session.update_session_title(editing_session.sessionId, title)
            message.success(t('保存成功'))
            title_modal.close()
            set_editing_session(null)
            await load_sessions()
        } catch (error) {
            show_error(error, t('保存失败'))
        }
    }
    
    async function generate_summary () {
        if (!summary_session)
            return
        set_generating_summary(true)
        try {
            const result = await chat_model.session.generate_session_summary(summary_session.sessionId, {
                instructions: summary_instructions || undefined,
                force: force_summary,
            })
            set_summary(result.content || '')
            message.success(t('摘要已生成'))
        } catch (error) {
            show_error(error, t('摘要生成失败'))
        } finally {
            set_generating_summary(false)
        }
    }
    
    async function trigger_session_memory (session: ISession) {
        if (!memory_enabled)
            return
        set_triggering_session_id(session.sessionId)
        try {
            await chat_model.memory.trigger_personal_session_pipeline(session.sessionId)
            message.success(t('记忆任务已触发'))
        } catch (error) {
            show_error(error, t('触发记忆任务失败'))
        } finally {
            set_triggering_session_id('')
        }
    }
    
    function open_summary_modal (session: ISession) {
        set_summary_session(session)
        set_summary('')
        set_summary_instructions('')
        set_force_summary(false)
        summary_modal.open()
    }
    
    function open_title_modal (session: ISession) {
        set_editing_session(session)
        set_editing_title(session.title || '')
        title_modal.open()
    }
    
    async function restore_session (session: ISession) {
        if (chat_model.agent_id !== session.agentId)
            chat_model.agent.select_agent(session.agentId)
        chat_model.set({ sessions: [session, ...chat_model.sessions.filter(item => item.sessionId !== session.sessionId)] })
        get_chat_model(session.sessionId).set({
            agent_id: session.agentId,
            sessions: [session],
            selected_llm_config_id: session.llmConfigId || '',
        })
        const added = await shell.add_ai_tab(session.sessionId, session.title || t('新会话'))
        if (!added)
            return
        chat_model.set({ settings_visible: false })
        if (model.view !== 'shell')
            model.goto('/shell/')
    }
    
    const show_workspace_size = sessions.some(session => session.workspaceSize !== undefined)
    const memory_trigger_disabled = memory_settings_loading || !memory_enabled
    
    return <>
        <AgentListLayout
            detail_title={t('个人会话')}
            list_subtitle={t('选择需要管理会话的 Agent')}
            options={options}
            selected_agent_id={selected_agent_id}
            set_selected_agent_id={set_selected_agent_id}
            actions={<Button loading={loading} onClick={() => { load_sessions() }}>{t('刷新')}</Button>}
        >
            <Table
                size='small'
                rowKey='sessionId'
                loading={loading}
                dataSource={sessions}
                pagination={{
                    current: session_page,
                    pageSize: session_page_size,
                    total: session_total,
                    showSizeChanger: true,
                    onChange: load_sessions,
                }}
                tableLayout='fixed'
                scroll={{ x: show_workspace_size ? 960 : 840 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无会话')} /> }}
                columns={[
                    {
                        title: t('标题'),
                        dataIndex: 'title',
                        width: 260,
                        ellipsis: true,
                        render: (value: string, session: ISession) => <Text
                            ellipsis={{ tooltip: value }}
                            style={{ display: 'block', color: '#1677ff', cursor: 'pointer' }}
                            onClick={async () => {
                                try {
                                    await restore_session(session)
                                } catch (error) {
                                    show_error(error, t('恢复会话失败'))
                                }
                            }}
                        >{value}</Text>,
                    },
                    {
                        title: t('更新时间'),
                        dataIndex: 'updateTime',
                        width: 190,
                        render: format_browser_time,
                    },
                    ...show_workspace_size ? [{
                        title: t('工作区'),
                        width: 120,
                        render: (_: unknown, session: ISession) => session.workspaceSize === undefined
                            ? '-'
                            : <Text title={t('{{count}} 个文件', { count: session.workspaceFileCount ?? 0 })}>
                                {format_file_size(session.workspaceSize)}
                            </Text>,
                    }] : [ ],
                    {
                        title: t('操作'),
                        width: 380,
                        render: (_: unknown, session: ISession) => <Space size={4}>
                            <Button size='small' onClick={() => { open_title_modal(session) }}>{t('改标题')}</Button>
                            <Button size='small' onClick={() => { open_summary_modal(session) }}>{t('生成摘要')}</Button>
                            <Tooltip title={!memory_settings_loading && !memory_enabled ? t('请先启用记忆后再触发记忆提取') : ''}>
                                <span>
                                    <Button
                                        size='small'
                                        loading={triggering_session_id === session.sessionId}
                                        disabled={memory_trigger_disabled}
                                        onClick={() => { trigger_session_memory(session) }}
                                    >
                                        {t('触发记忆提取')}
                                    </Button>
                                </span>
                            </Tooltip>
                            <Popconfirm title={t('确定删除此会话？')} okButtonProps={{ danger: true }} onConfirm={() => delete_session(session.sessionId)}>
                                <Button danger size='small'>{t('删除')}</Button>
                            </Popconfirm>
                        </Space>,
                    },
                ]}
            />
        </AgentListLayout>
        <Modal
            title={t('修改会话标题')}
            open={title_modal.visible}
            onCancel={title_modal.close}
            onOk={save_session_title}
            okText={t('保存')}
        >
            <Input
                value={editing_title}
                onChange={event => { set_editing_title(event.target.value) }}
                placeholder={t('请输入标题')}
                onPressEnter={save_session_title}
            />
        </Modal>
        
        <Modal
            title={<Text
                title={summary_session ? t('会话摘要：{{title}}', { title: summary_session.title || summary_session.sessionId }) : t('会话摘要')}
                style={{ display: 'block', maxWidth: 640 }}
                ellipsis
            >
                {summary_session ? t('会话摘要：{{title}}', { title: summary_session.title || summary_session.sessionId }) : t('会话摘要')}
            </Text>}
            open={summary_modal.visible}
            onCancel={summary_modal.close}
            footer={null}
            width={720}
        >
            <Input.TextArea
                rows={3}
                value={summary_instructions}
                onChange={event => { set_summary_instructions(event.target.value) }}
                placeholder={t('摘要要求（可选，例如：重点保留结论和关键 SQL）')}
            />
            <Space style={{ marginTop: 8 }} wrap>
                <Switch className='ai-settings-switch-medium' checked={force_summary} onChange={set_force_summary} />
                <span>{t('重新生成完整摘要')}</span>
                <Button type='primary' loading={generating_summary} disabled={!summary_session} onClick={generate_summary}>{t('生成摘要')}</Button>
            </Space>
            {summary && <div style={{ marginTop: 12, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {summary}
            </div>}
        </Modal>
    </>
}
