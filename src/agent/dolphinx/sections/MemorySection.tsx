import { useEffect, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { message } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { IMemoryEntry, ISession } from '@/agent/model/types.ts'
import {
    AgentListLayout,
    show_error,
    use_agent_options,
} from '@/agent/dolphinx/common.tsx'
import {
    MemoryDetailModal,
    MemoryEditModal,
    MemoryForgetModal,
    PersonalMemoryView,
} from './memory/index.ts'


export function MemorySection () {
    const { options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState('')
    const [memory_kind, set_memory_kind] = useState<IMemoryEntry['memoryKind'] | ''>('')
    const [query, set_query] = useState('')
    const [sort_by, set_sort_by] = useState<'RECENCY' | 'IMPORTANCE' | 'TEXT_SEARCH' | 'RANKED'>('RECENCY')
    const [items, set_items] = useState<IMemoryEntry[]>([ ])
    const [memory_total, set_memory_total] = useState(0)
    const [memory_enabled, set_memory_enabled] = useState(false)
    const [detail_memory, set_detail_memory] = useState<IMemoryEntry | null>(null)
    const [detail_loading_id, set_detail_loading_id] = useState('')
    const [editing_memory_id, set_editing_memory_id] = useState('')
    const [form_memory_kind, set_form_memory_kind] = useState<IMemoryEntry['memoryKind']>('default')
    const [form_title, set_form_title] = useState('')
    const [form_content, set_form_content] = useState('')
    const [form_importance, set_form_importance] = useState(0.5)
    const [loading, set_loading] = useState(false)
    const [settings_loading, set_settings_loading] = useState(false)
    const [forget_sessions, set_forget_sessions] = useState<ISession[]>([ ])
    const [forget_session_id, set_forget_session_id] = useState('')
    const [forget_loading, set_forget_loading] = useState(false)
    const memory_modal = use_modal()
    const forget_modal = use_modal()
    const has_memory_query = Boolean(query.trim())
    
    useEffect(() => {
        if (selected_agent_id) {
            load_memory_settings()
            search_memory()
        } else {
            set_items([ ])
            set_memory_total(0)
        }
    }, [selected_agent_id])
    
    useEffect(() => {
        if (!has_memory_query && sort_by === 'TEXT_SEARCH')
            set_sort_by('RANKED')
    }, [has_memory_query, sort_by])
    
    async function load_memory_settings () {
        if (!selected_agent_id)
            return
        set_settings_loading(true)
        try {
            const settings = await chat_model.memory.get_personal_settings(selected_agent_id)
            set_memory_enabled(settings.personalMemoryEnabled)
        } catch (error) {
            show_error(error, t('加载记忆设置失败'))
        } finally {
            set_settings_loading(false)
        }
    }
    
    async function set_personal_memory_enabled (enabled: boolean) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        const previous_enabled = memory_enabled
        set_memory_enabled(enabled)
        set_settings_loading(true)
        try {
            const settings = await chat_model.memory.set_personal_enabled(selected_agent_id, enabled)
            set_memory_enabled(settings.personalMemoryEnabled)
            message.success(t('记忆设置已更新'))
        } catch (error) {
            set_memory_enabled(previous_enabled)
            show_error(error, t('更新记忆设置失败'))
        } finally {
            set_settings_loading(false)
        }
    }
    
    async function search_memory (next_sort_by = sort_by) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const params = {
                agentId: selected_agent_id,
                memoryKind: memory_kind || undefined,
                textQuery: query.trim() || undefined,
                limit: 50,
                sortBy: next_sort_by,
            }
            const result = await chat_model.memory.search_memory(params)
            const next_items = result.items.map(item => ({ ...item, scopeType: item.scopeType || 'user_personal' as const }))
            set_items(next_items)
            set_memory_total(result.total)
        } catch (error) {
            show_error(error, t('加载记忆失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function save_memory () {
        if (!selected_agent_id || !form_content.trim()) {
            message.warning(t('请填写记忆内容'))
            return
        }
        const updates = {
            memoryKind: form_memory_kind,
            title: form_title.trim() || undefined,
            content: form_content.trim(),
            importance: form_importance,
        }
        try {
            if (editing_memory_id)
                await chat_model.memory.update_memory(editing_memory_id, updates)
            else
                await chat_model.memory.store_memory({
                    agentId: selected_agent_id,
                    ...updates,
                })
            message.success(t('保存成功'))
            memory_modal.close()
            set_editing_memory_id('')
            set_form_title('')
            set_form_content('')
            await search_memory()
        } catch (error) {
            show_error(error, t('保存记忆失败'))
        }
    }
    
    function open_create_memory () {
        set_editing_memory_id('')
        set_form_memory_kind(memory_kind || 'default')
        set_form_title('')
        set_form_content('')
        set_form_importance(0.5)
        memory_modal.open()
    }
    
    function open_edit_memory (item: IMemoryEntry) {
        set_editing_memory_id(item.memoryId)
        set_form_memory_kind(item.memoryKind || 'default')
        set_form_title(item.title || '')
        set_form_content(item.content || '')
        set_form_importance(item.importance ?? 0.5)
        memory_modal.open()
    }
    
    async function open_memory_detail (item: IMemoryEntry) {
        if (!item.memoryId)
            return
        set_detail_loading_id(item.memoryId)
        try {
            set_detail_memory(await chat_model.memory.get_memory(item.memoryId))
        } catch (error) {
            show_error(error, t('加载记忆详情失败'))
        } finally {
            set_detail_loading_id('')
        }
    }
    
    async function delete_memory (item: IMemoryEntry) {
        if (!item.memoryId)
            return
        try {
            await chat_model.memory.delete_memory(item.memoryId)
            message.success(t('删除成功'))
            await search_memory()
        } catch (error) {
            show_error(error, t('删除记忆失败'))
        }
    }
    
    async function open_forget_modal () {
        if (!selected_agent_id)
            return
        set_forget_loading(true)
        try {
            const result = await chat_model.session.list_sessions({ agentId: selected_agent_id, limit: 100 })
            set_forget_sessions(result.items)
            set_forget_session_id(result.items[0]?.sessionId || '')
            forget_modal.open()
        } catch (error) {
            show_error(error, t('加载会话失败'))
        } finally {
            set_forget_loading(false)
        }
    }
    
    async function forget_session_memory () {
        if (!selected_agent_id || !forget_session_id) {
            message.warning(t('请选择会话'))
            return
        }
        set_forget_loading(true)
        try {
            await chat_model.memory.forget_session(selected_agent_id, forget_session_id)
            message.success(t('忘记请求已提交'))
            forget_modal.close()
            await search_memory()
        } catch (error) {
            show_error(error, t('忘记会话记忆失败'))
        } finally {
            set_forget_loading(false)
        }
    }
    
    return <>
        <AgentListLayout detail_title={t('记忆')} list_subtitle={t('选择需要查看记忆的 Agent')} options={options} selected_agent_id={selected_agent_id} set_selected_agent_id={set_selected_agent_id}>
            <PersonalMemoryView
                selected_agent_id={selected_agent_id}
                memory_enabled={memory_enabled}
                settings_loading={settings_loading}
                memory_total={memory_total}
                forget_loading={forget_loading}
                loading={loading}
                sort_by={sort_by}
                memory_kind={memory_kind}
                query={query}
                items={items}
                detail_loading_id={detail_loading_id}
                on_toggle_enabled={set_personal_memory_enabled}
                on_open_forget={open_forget_modal}
                on_refresh={search_memory}
                on_open_create={open_create_memory}
                on_change_sort={value => {
                    set_sort_by(value)
                    search_memory(value)
                }}
                on_change_kind={value => { set_memory_kind((value || '') as IMemoryEntry['memoryKind'] | '') }}
                on_change_query={set_query}
                on_open_detail={open_memory_detail}
                on_open_edit={open_edit_memory}
                on_delete={delete_memory}
            />
        </AgentListLayout>
        <MemoryEditModal
            visible={memory_modal.visible}
            editing_memory_id={editing_memory_id}
            form_memory_kind={form_memory_kind}
            set_form_memory_kind={set_form_memory_kind}
            form_title={form_title}
            set_form_title={set_form_title}
            form_content={form_content}
            set_form_content={set_form_content}
            form_importance={form_importance}
            set_form_importance={set_form_importance}
            on_close={memory_modal.close}
            on_save={save_memory}
        />
        <MemoryForgetModal
            visible={forget_modal.visible}
            forget_sessions={forget_sessions}
            forget_session_id={forget_session_id}
            set_forget_session_id={set_forget_session_id}
            forget_loading={forget_loading}
            on_close={forget_modal.close}
            on_forget={forget_session_memory}
        />
        <MemoryDetailModal
            memory={detail_memory}
            on_close={() => { set_detail_memory(null) }}
        />
    </>
}
