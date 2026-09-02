import { useEffect, useState } from 'react'

import { Tabs } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { IMemoryStats } from '@/agent/model/types.ts'
import {
    AgentListLayout,
    use_agent_options,
} from '@/agent/dolphinx/common.tsx'
import { MemoryStatsBar } from './memory/index.ts'
import { MemoryConfigSection } from './MemoryConfigSection.tsx'
import { PublicMemorySection } from './PublicMemorySection.tsx'
import { MemoryJobsSection } from './MemoryJobsSection.tsx'


export function MemoryManagementSection () {
    const { options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState('')
    const [active_tab, set_active_tab] = useState('config')
    const [memory_stats, set_memory_stats] = useState<IMemoryStats | null>(null)
    const [stats_loading, set_stats_loading] = useState(false)
    
    useEffect(() => {
        if (selected_agent_id)
            load_memory_stats()
        else
            set_memory_stats(null)
    }, [selected_agent_id])
    
    async function load_memory_stats () {
        if (!selected_agent_id)
            return
        set_stats_loading(true)
        try {
            set_memory_stats(await chat_model.memory.load_memory_stats(selected_agent_id))
        } catch (error) {
            console.error('加载记忆统计失败:', error)
            set_memory_stats(null)
        } finally {
            set_stats_loading(false)
        }
    }
    
    return <AgentListLayout
        detail_title={t('记忆管理')}
        list_subtitle={t('选择需要管理的 Agent')}
        options={options}
        selected_agent_id={selected_agent_id}
        set_selected_agent_id={set_selected_agent_id}
    >
        <MemoryStatsBar memory_stats={memory_stats} stats_loading={stats_loading} />
        <Tabs
            activeKey={active_tab}
            onChange={set_active_tab}
            items={[
                {
                    key: 'config',
                    label: t('配置'),
                    children: <MemoryConfigSection agent_id={selected_agent_id} />,
                },
                {
                    key: 'public_memory',
                    label: t('公共记忆'),
                    children: <PublicMemorySection agent_id={selected_agent_id} />,
                },
                {
                    key: 'jobs',
                    label: t('任务'),
                    children: <MemoryJobsSection agent_id={selected_agent_id} />,
                },
            ]}
        />
    </AgentListLayout>
}
