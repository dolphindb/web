import { useEffect, useState } from 'react'
import { Empty } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import type { IAgentInfo, IKnowledgeBaseInfo, ILlmConfig, ILlmProvider } from '@/agent/model/types.ts'
import { chat_model } from '@/agent/model.ts'
import {
    KnowledgeCreateModal,
    KnowledgeDetailPanel,
    KnowledgeSidebar,
} from './knowledge/index.ts'


export function KnowledgeTab () {
    const { llm_providers: providers, llm_configs } = chat_model.use(['llm_providers', 'llm_configs'])
    const [knowledge_bases, set_knowledge_bases] = useState<IKnowledgeBaseInfo[]>([ ])
    const [selected_kb_id, set_selected_kb_id] = useState('')
    const [loading, set_loading] = useState(false)
    const [agents, set_agents] = useState<IAgentInfo[]>([ ])
    
    const [create_modal_visible, set_create_modal_visible] = useState(false)
    const [creating_kb, set_creating_kb] = useState(false)
    
    const provider_map = new Map<string, ILlmProvider>(providers.map(p => [p.providerId, p] as const))
    const active_configs = llm_configs.filter(config => {
        const provider = provider_map.get(config.providerId)
        return Boolean(provider) && config.enabled !== false && config.statusName !== 'DELETED' &&
            provider?.enabled !== false && provider?.statusName !== 'DELETED'
    })
    const embedding_configs = active_configs.filter(c => c.capability === 'embedding')
    const chat_configs = active_configs.filter(c => !c.capability || c.capability === 'chat')
    
    async function load () {
        set_loading(true)
        try {
            const [kbs, all_agents] = await Promise.all([
                chat_model.knowledge.list_knowledge_bases(),
                chat_model.agent.load_agents().then(() => chat_model.agents).catch(() => [ ]),
                chat_model.llm.ensure_llm_configs(true),
            ])
            set_knowledge_bases(kbs)
            set_agents(all_agents)
        } catch {
            model.message.error(t('加载知识库列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        load()
    }, [ ])
    
    useEffect(() => {
        if (knowledge_bases.some(kb => kb.knowledgeBaseId === selected_kb_id && kb.status !== 'DELETED'))
            return
        set_selected_kb_id(knowledge_bases.find(kb => kb.status !== 'DELETED')?.knowledgeBaseId || '')
    }, [knowledge_bases, selected_kb_id])
    
    const selected_kb = knowledge_bases.find(kb => kb.knowledgeBaseId === selected_kb_id) || null
    
    return <div className='ai-settings-list-layout' style={{ height: '100%' }}>
        <KnowledgeSidebar
            knowledge_bases={knowledge_bases}
            selected_kb_id={selected_kb_id}
            loading={loading}
            on_select_kb={kb => { set_selected_kb_id(kb.knowledgeBaseId) }}
            on_create_kb={() => { set_create_modal_visible(true) }}
            on_refresh={load}
        />
        
        <div className='ai-settings-list-detail'>
            <div className='ai-settings-detail-header'>
                {selected_kb && <div className='ai-settings-detail-title'>
                    {selected_kb.name}
                </div>}
            </div>
            <div className='ai-settings-detail-body'>
                {selected_kb
                    ? <KnowledgeDetailPanel
                        kb={selected_kb}
                        embedding_configs={embedding_configs}
                        chat_configs={chat_configs}
                        agents={agents}
                        on_refresh={load}
                        on_deleted={() => {
                            set_selected_kb_id('')
                            load()
                        }}
                    />
                    : <Empty
                        description={knowledge_bases.length === 0 ? t('暂无知识库，请先创建') : t('请选择一个知识库')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ paddingTop: 100 }}
                    />
                }
            </div>
        </div>
        
        <KnowledgeCreateModal
            visible={create_modal_visible}
            embedding_configs={embedding_configs}
            chat_configs={chat_configs}
            loading={creating_kb}
            on_close={() => { set_create_modal_visible(false) }}
            on_submit={async payload => {
                set_creating_kb(true)
                try {
                    const res = await chat_model.knowledge.register_knowledge_base(payload)
                    model.message.success(t('知识库创建成功，正在后台初始化索引'))
                    set_create_modal_visible(false)
                    await load()
                    if (res.knowledgeBaseId)
                        set_selected_kb_id(res.knowledgeBaseId)
                } finally {
                    set_creating_kb(false)
                }
            }}
        />
    </div>
}
