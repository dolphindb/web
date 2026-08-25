import { Empty, Spin, Tag, Tooltip, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IAgentInfo } from '@/agent/model/types.ts'
import { agent_create_time } from './types.ts'


const { Paragraph } = Typography


export function AgentSidebar ({
    agents,
    current_agent_id,
    selected_agent,
    creating,
    loading,
    on_start_create,
    on_select_agent,
}: {
    agents: IAgentInfo[]
    current_agent_id: string
    selected_agent: IAgentInfo | null
    creating: boolean
    loading: boolean
    on_start_create: () => void
    on_select_agent: (agent: IAgentInfo) => void
}) {
    const visible_agents = agents
        .filter(a => a.statusName !== 'DELETED')
        .sort((a, b) =>
            a.agentId === current_agent_id ? -1 :
            b.agentId === current_agent_id ? 1 :
            agent_create_time(b) - agent_create_time(a)
        )
    
    return <div className='ai-settings-list-sidebar'>
        <div className='ai-settings-list-title'>
            <span className='ai-settings-list-title-text'>{t('Agent 管理')}</span>
            <Tooltip title={t('新建 Agent')}>
                <button
                    type='button'
                    className='ai-settings-list-title-action'
                    aria-label={t('新建 Agent')}
                    disabled={creating}
                    onClick={on_start_create}
                >
                    <PlusOutlined />
                </button>
            </Tooltip>
        </div>
        <div className='ai-settings-list-content rich'>
            {loading && !creating
                ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                : visible_agents.length === 0
                    ? <Empty description={t('暂无 Agent')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 20 }} />
                    : visible_agents.map(a =>
                        <div
                            key={a.agentId}
                            className={`ai-settings-list-item rich${!creating && selected_agent?.agentId === a.agentId ? ' active' : ''}`}
                            onClick={() => { on_select_agent(a) }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{a.agentName}</span>
                                <Tag color={a.statusName === 'ACTIVE' ? 'green' : 'default'} style={{ fontSize: 11 }}>
                                    {a.statusName === 'ACTIVE' ? t('活跃') : a.statusName}
                                </Tag>
                                {a.agentId === current_agent_id && <Tag color='blue' style={{ fontSize: 11 }}>{t('当前')}</Tag>}
                            </div>
                            {a.description && <Paragraph type='secondary' style={{ fontSize: 11, margin: '2px 0 0' }} ellipsis={{ rows: 3, tooltip: a.description }}>
                                {a.description}
                            </Paragraph>}
                        </div>
                    )
            }
        </div>
    </div>
}
