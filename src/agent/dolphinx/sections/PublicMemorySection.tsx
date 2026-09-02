import { useEffect, useState } from 'react'
import { message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { chat_model } from '@/agent/model.ts'
import type { IPublicMemory } from '@/agent/model/types.ts'
import { show_error } from '@/agent/dolphinx/common.tsx'
import { PublicMemoryView } from './memory/index.ts'


export function PublicMemorySection ({ agent_id }: { agent_id: string }) {
    const [public_memory, set_public_memory] = useState<IPublicMemory | null>(null)
    const [public_content, set_public_content] = useState('')
    const [public_loading, set_public_loading] = useState(false)
    const [public_saving, set_public_saving] = useState(false)
    
    const saved_public_content = public_memory?.content || ''
    const public_dirty = public_content !== saved_public_content
    
    useEffect(() => {
        if (agent_id)
            load_public_memory()
        else {
            set_public_memory(null)
            set_public_content('')
        }
    }, [agent_id])
    
    async function load_public_memory () {
        if (!agent_id)
            return
        set_public_loading(true)
        try {
            const memory = await chat_model.memory.get_public_memory(agent_id)
            set_public_memory(memory)
            set_public_content(memory.content || '')
        } catch (error) {
            show_error(error, t('加载公共记忆失败'))
        } finally {
            set_public_loading(false)
        }
    }
    
    async function do_save_public_memory () {
        if (!agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_public_saving(true)
        try {
            const memory = await chat_model.memory.update_public_memory(agent_id, public_content)
            set_public_memory(memory)
            set_public_content(memory.content || '')
            message.success(t('公共记忆已保存'))
        } catch (error) {
            show_error(error, t('保存公共记忆失败'))
        } finally {
            set_public_saving(false)
        }
    }
    
    function confirm_save_public_memory () {
        if (!agent_id || !public_dirty)
            return
        model.modal.confirm({
            title: t('确认保存公共记忆？'),
            content: t('公共记忆会注入该 Agent 下所有用户的后续对话上下文，修改后可能影响所有用户的回答结果。确定保存？'),
            okText: t('确认保存'),
            cancelText: t('取消'),
            onOk: do_save_public_memory,
        })
    }
    
    async function do_clear_public_memory () {
        if (!agent_id)
            return
        set_public_saving(true)
        try {
            const memory = await chat_model.memory.clear_public_memory(agent_id)
            set_public_memory(memory)
            set_public_content('')
            message.success(t('已清空'))
        } catch (error) {
            show_error(error, t('清空公共记忆失败'))
        } finally {
            set_public_saving(false)
        }
    }
    
    function confirm_clear_public_memory () {
        if (!agent_id)
            return
        model.modal.confirm({
            title: t('确认清空公共记忆？'),
            content: t('清空公共记忆会影响该 Agent 下所有用户的后续对话上下文。该操作会移除当前公共记忆内容，确定清空？'),
            okText: t('确认清空'),
            cancelText: t('取消'),
            okButtonProps: { danger: true },
            onOk: do_clear_public_memory,
        })
    }
    
    function handle_reset () {
        set_public_content(saved_public_content)
    }
    
    return <PublicMemoryView
        public_memory={public_memory}
        public_content={public_content}
        set_public_content={set_public_content}
        public_loading={public_loading}
        public_saving={public_saving}
        public_dirty={public_dirty}
        on_reset={handle_reset}
        on_confirm_clear={confirm_clear_public_memory}
        on_confirm_save={confirm_save_public_memory}
    />
}
