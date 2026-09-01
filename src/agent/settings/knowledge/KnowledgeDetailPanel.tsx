import { useState } from 'react'
import { Tabs, Typography } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import type { IAgentInfo, IKnowledgeBaseInfo, ILlmConfig } from '@/agent/model/types.ts'
import { chat_model } from '@/agent/model.ts'
import { DocumentsTab } from './DocumentsTab.tsx'
import { GenerationsTab } from './GenerationsTab.tsx'
import { JobsTab } from './JobsTab.tsx'
import { KnowledgeActions } from './KnowledgeActions.tsx'
import { KnowledgeEditModal } from './KnowledgeEditModal.tsx'
import { IndexBuildModal } from './IndexBuildModal.tsx'
import { RetrievalTestModal } from './RetrievalTestModal.tsx'


const { Text, Paragraph } = Typography


export function KnowledgeDetailPanel ({
    kb,
    embedding_configs,
    agents,
    on_refresh,
    on_deleted,
}: {
    kb: IKnowledgeBaseInfo
    embedding_configs: ILlmConfig[]
    agents: IAgentInfo[]
    on_refresh: () => void
    on_deleted: () => void
}) {
    const [tab_key, set_tab_key] = useState('documents')
    const [test_modal_visible, set_test_modal_visible] = useState(false)
    const [edit_modal_visible, set_edit_modal_visible] = useState(false)
    const [saving_edit, set_saving_edit] = useState(false)
    const [build_modal_visible, set_build_modal_visible] = useState(false)
    const [building_index, set_building_index] = useState(false)
    const [deleting_kb, set_deleting_kb] = useState(false)
    
    async function handle_edit_submit (name: string, description: string) {
        set_saving_edit(true)
        try {
            await chat_model.knowledge.update_knowledge_base(kb.knowledgeBaseId, { name, description })
            model.message.success(t('保存成功'))
            on_refresh()
        } finally {
            set_saving_edit(false)
        }
    }
    
    async function handle_delete () {
        set_deleting_kb(true)
        try {
            await chat_model.knowledge.delete_knowledge_base(kb.knowledgeBaseId)
            model.message.success(t('已提交删除任务'))
            on_deleted()
        } catch (err: any) {
            model.message.error(err.message || t('删除失败'))
        } finally {
            set_deleting_kb(false)
        }
    }
    
    return <div>
        {/* 知识库基本信息与操作 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
                <Text type='secondary' style={{ display: 'block', fontSize: 12, wordBreak: 'break-all' }}>
                    ID: {kb.knowledgeBaseId}
                </Text>
                {kb.description && <Paragraph type='secondary' style={{ fontSize: 12, margin: '2px 0 0' }} ellipsis={{ rows: 3, tooltip: kb.description }}>
                    {kb.description}
                </Paragraph>}
            </div>
            <KnowledgeActions
                kb={kb}
                deleting={deleting_kb}
                on_test={() => { set_test_modal_visible(true) }}
                on_edit={() => { set_edit_modal_visible(true) }}
                on_rebuild={() => { set_build_modal_visible(true) }}
                on_delete={handle_delete}
            />
        </div>
        
        <Tabs
            size='small'
            activeKey={tab_key}
            onChange={set_tab_key}
            items={[
                {
                    key: 'documents',
                    label: t('文档管理'),
                    children: <DocumentsTab kb={kb} />,
                },
                {
                    key: 'generations',
                    label: t('索引版本'),
                    children: <GenerationsTab kb={kb} embedding_configs={embedding_configs} on_rebuild_success={on_refresh} />,
                },
                {
                    key: 'jobs',
                    label: t('任务历史'),
                    children: <JobsTab kb={kb} />,
                },
            ]}
        />
        
        <KnowledgeEditModal
            visible={edit_modal_visible}
            kb={kb}
            loading={saving_edit}
            on_close={() => { set_edit_modal_visible(false) }}
            on_submit={handle_edit_submit}
        />
        
        <IndexBuildModal
            visible={build_modal_visible}
            embedding_configs={embedding_configs}
            loading={building_index}
            on_close={() => { set_build_modal_visible(false) }}
            on_submit={async config => {
                set_building_index(true)
                try {
                    await chat_model.knowledge.build_index(kb.knowledgeBaseId, config)
                    model.message.success(t('已触发新索引 Generation 构建任务'))
                    set_build_modal_visible(false)
                    on_refresh()
                } finally {
                    set_building_index(false)
                }
            }}
        />
        
        <RetrievalTestModal
            visible={test_modal_visible}
            kb={kb}
            agents={agents}
            on_close={() => { set_test_modal_visible(false) }}
        />
    </div>
}
