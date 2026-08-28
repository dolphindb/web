import { useEffect, useState } from 'react'
import { Empty } from 'antd'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from '@/agent/model.ts'
import type { IAgentInfo } from '@/agent/model/types.ts'
import {
    AgentCreateForm,
    AgentDetailPanel,
    AgentSidebar,
    DEFAULT_AGENT_FORM,
} from './agent/index.ts'


export function AgentTab () {
    const { agents } = chat_model.use(['agents'])
    
    const [creating, set_creating] = useState(false)
    const [loading, set_loading] = useState(false)
    const [form_error, set_form_error] = useState('')
    const [selected_agent, set_selected_agent] = useState<IAgentInfo | null>(null)
    const [form, set_form] = useState({ ...DEFAULT_AGENT_FORM })
    
    async function refresh () {
        set_loading(true)
        try {
            await chat_model.agent.load_agents()
        } catch {
            model.message.error(t('加载 Agent 列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { refresh() }, [ ])
    
    useEffect(() => {
        const fallback = agents.find(a => a.statusName === 'ACTIVE') || null
        if (selected_agent) {
            const updated = agents.find(a => a.agentId === selected_agent.agentId && a.statusName !== 'DELETED')
            if (updated && updated !== selected_agent)
                set_selected_agent(updated)
            else if (!updated)
                set_selected_agent(fallback)
        } else if (fallback)
            set_selected_agent(fallback)
    }, [agents])
    
    async function handle_create () {
        if (!form.agentName.trim()) {
            set_form_error(t('请输入 Agent 名称'))
            return
        }
        set_form_error('')
        set_loading(true)
        try {
            const agent = await chat_model.agent.register_agent({
                agentName: form.agentName.trim(),
                description: form.description || undefined,
                systemPrompt: form.systemPrompt || undefined,
                config: { allowLlmFallback: form.allowLlmFallback, docSearchEnabled: form.docSearchEnabled },
            })
            model.message.success(t('Agent 创建成功'))
            set_selected_agent(agent)
            set_creating(false)
            set_form({ ...DEFAULT_AGENT_FORM })
        } catch (e: any) {
            model.message.error(e.message || t('创建失败'))
        } finally {
            set_loading(false)
        }
    }
    
    return <div className='ai-settings-list-layout' style={{ height: '100%' }}>
        <AgentSidebar
            agents={agents}
            selected_agent={selected_agent}
            creating={creating}
            loading={loading}
            on_start_create={() => {
                set_creating(true)
                set_form_error('')
            }}
            on_select_agent={a => {
                set_selected_agent(a)
                set_creating(false)
                set_form_error('')
            }}
        />
        <div className='ai-settings-list-detail'>
            <div className='ai-settings-detail-header'>
                {(creating || selected_agent) && <div className='ai-settings-detail-title'>
                    {creating ? t('新建 Agent') : selected_agent?.agentName}
                </div>}
            </div>
            <div className='ai-settings-detail-body'>
                {creating
                    ? <AgentCreateForm
                        form={form}
                        set_form={set_form}
                        form_error={form_error}
                        loading={loading}
                        on_cancel={() => {
                            set_creating(false)
                            set_form_error('')
                        }}
                        on_create={handle_create}
                    />
                    : selected_agent
                        ? <AgentDetailPanel
                            agent={selected_agent}
                            on_refresh={refresh}
                        />
                        : <Empty description={t('请选择一个 Agent')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ paddingTop: 100 }} />
                }
            </div>
        </div>
    </div>
}
