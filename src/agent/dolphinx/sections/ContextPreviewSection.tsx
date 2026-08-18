import { useEffect, useState } from 'react'

import { Button, Descriptions, Input, Select, Space, Table, message } from 'antd'

import { t } from '@i18n'

import { chat_model, chat_shared_model, get_chat_model } from '@/agent/model.ts'
import type { ISession } from '@/agent/model.ts'
import { build_web_assembly_config } from '@/agent/prompt.ts'
import { get_all_tool_definitions } from '@/agent/scripts/index.ts'
import { legacy_json_tool_call_adapter, native_tool_call_adapter } from '@/agent/tool_call_adapters.ts'
import { chat_workspace_store } from '@/agent/workspace.ts'
import {
    AgentListLayout,
    ellipsis_text,
    show_error,
    use_agent_options,
    use_valid_agent_selection,
} from '@/agent/dolphinx/common.tsx'
import {
    ContextPreviewMessageDetail,
    ContextPreviewMessageSummary,
    ContextPreviewRole,
    format_preview_value,
    is_context_preview_message_expandable,
} from '@/agent/dolphinx/ContextPreviewMessage.tsx'


export function ContextPreviewSection () {
    const { agent_id, options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [sessions, set_sessions] = useState<ISession[]>([ ])
    const [selected_session_id, set_selected_session_id] = useState('')
    const [message_text, set_message_text] = useState('')
    const [preview, set_preview] = useState<any>(null)
    const [loading, set_loading] = useState(false)
    use_valid_agent_selection(options, selected_agent_id, set_selected_agent_id, agent_id)
    
    async function load_sessions () {
        if (!selected_agent_id) {
            set_sessions([ ])
            set_selected_session_id('')
            return
        }
        const result = await chat_model.session.list_sessions({
            agentId: selected_agent_id,
            limit: 100,
        })
        set_sessions(result.items)
        if (!selected_session_id || !result.items.some(item => item.sessionId === selected_session_id))
            set_selected_session_id(result.items[0]?.sessionId || '')
    }
    
    useEffect(() => {
        load_sessions().catch(error => { show_error(error, t('加载会话失败')) })
    }, [selected_agent_id])
    
    async function load_preview () {
        if (!selected_agent_id || !selected_session_id || !message_text.trim()) {
            message.warning(t('请选择 Agent、会话并输入消息'))
            return
        }
        set_loading(true)
        try {
            const session = sessions.find(item => item.sessionId === selected_session_id)
            const agent = chat_model.agents.find(item => item.agentId === selected_agent_id)
            const llms = chat_shared_model.selectable_llms_by_agent_id[selected_agent_id] ||
                await chat_model.llm.load_selectable_llms(selected_agent_id)
            const session_chat = get_chat_model(selected_session_id)
            const selected_llm_config_id = session_chat.current_session_id === selected_session_id
                ? session_chat.selected_llm_config_id
                : session?.llmConfigId || ''
            const llm_config_id = chat_model.agent.get_llm_for_tool_call_mode(selected_llm_config_id, llms)?.llmConfigId || ''
            const use_native_tool_calling = chat_model.agent.should_use_native_tool_calling(llm_config_id, llms)
            const tool_call_adapter = use_native_tool_calling ? native_tool_call_adapter : legacy_json_tool_call_adapter
            const doc_search_enabled = agent?.config?.docSearchEnabled !== false
            const api_fetch = (path: string, options?: RequestInit) => chat_model.agent.api_fetch(path, options)
            const [workspace, steps] = await Promise.all([
                chat_workspace_store.get_workspace(selected_session_id, api_fetch),
                chat_workspace_store.list_active_steps(selected_session_id, api_fetch),
            ])
            const assembly_config: Record<string, unknown> = build_web_assembly_config(
                agent,
                tool_call_adapter.build_system_prompt(doc_search_enabled),
                workspace,
                steps,
            )
            if (use_native_tool_calling)
                assembly_config.tools = get_all_tool_definitions(doc_search_enabled)
            set_preview(await chat_model.session.preview_context({
                sessionId: selected_session_id,
                message: message_text.trim(),
                ...(llm_config_id ? { llmConfigId: llm_config_id } : { }),
                assemblyConfig: assembly_config,
            }))
        } catch (error) {
            show_error(error, t('加载上下文预览失败'))
        } finally {
            set_loading(false)
        }
    }
    
    const detail = preview?.detail || { }
    const token_breakdown = preview?.tokenBreakdown || { }
    const messages = Array.isArray(preview?.messages) ? preview.messages : [ ]
    const preview_labels: Record<string, string> = {
        estimatedTokens: t('预估 Token'),
        assemblyMode: t('组装模式'),
        memoriesIncluded: t('记忆数量'),
        messagesIncluded: t('历史消息数'),
        skillsInCatalog: t('技能数量'),
        summaryIncluded: t('包含摘要'),
    }
    const preview_rows = [
        ...Object.entries(preview || { })
            .filter(([key]) => !['detail', 'messages', 'tokenBreakdown'].includes(key) && !(key in detail))
            .map(([key, value]) => ({ key, label: preview_labels[key] || key, value })),
        ...Object.entries(detail).map(([key, value]) => ({ key: `detail.${key}`, label: preview_labels[key] || key, value })),
    ]
    
    return <AgentListLayout
        detail_title={t('上下文预览')}
        list_subtitle={t('选择需要预览上下文的 Agent')}
        options={options}
        selected_agent_id={selected_agent_id}
        set_selected_agent_id={set_selected_agent_id}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Select
                style={{ width: 260 }}
                placeholder={t('选择会话')}
                value={selected_session_id || undefined}
                onChange={set_selected_session_id}
                options={sessions.map(session => ({ value: session.sessionId, label: session.title || session.sessionId }))}
            />
            <Button loading={loading} onClick={load_preview}>{t('预览')}</Button>
        </div>
        <Input.TextArea
            style={{ marginTop: 12 }}
            value={message_text}
            onChange={event => { set_message_text(event.target.value) }}
            placeholder={t('输入待预览的用户消息')}
            rows={3}
        />
        {preview && <Space direction='vertical' className='context-preview-results' style={{ width: '100%', marginTop: 12 }}>
            <Descriptions
                size='small'
                bordered
                column={2}
                className='context-preview-descriptions'
                items={preview_rows.map(row => ({
                    key: row.key,
                    label: row.label,
                    children: ellipsis_text(format_preview_value(row.value)),
                }))}
            />
            {Object.keys(token_breakdown).length > 0 && <Descriptions
                size='small'
                bordered
                column={2}
                className='context-preview-descriptions'
                items={Object.entries(token_breakdown).map(([key, value]) => ({
                    key,
                    label: key,
                    children: String(value),
                }))}
            />}
            <Table
                size='small'
                tableLayout='fixed'
                pagination={{ defaultPageSize: 8 }}
                rowKey={(_, index) => String(index)}
                dataSource={messages}
                expandable={{
                    expandedRowRender: row => <ContextPreviewMessageDetail message={row} />,
                    rowExpandable: is_context_preview_message_expandable,
                }}
                columns={[
                    { title: t('角色'), dataIndex: 'role', width: 100, render: role => <ContextPreviewRole role={role} /> },
                    {
                        title: t('内容'),
                        render: (_: unknown, row: Record<string, unknown>) => <ContextPreviewMessageSummary message={row} />,
                    },
                ]}
            />
        </Space>}
    </AgentListLayout>
}
