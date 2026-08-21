import { useEffect, useState } from 'react'
import { Empty, Space, Switch, Table, Tag, Tooltip, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IAgentInfo, IKnowledgeBaseAgentBinding, IKnowledgeBaseInfo } from '@/agent/model/types.ts'
import { chat_model } from '@/agent/model.ts'


const { Text } = Typography


export function AgentsTab ({
    kb,
    agents,
}: {
    kb: IKnowledgeBaseInfo
    agents: IAgentInfo[]
}) {
    const [bindings, set_bindings] = useState<IKnowledgeBaseAgentBinding[]>([ ])
    const [loading, set_loading] = useState(false)
    const [operating_agent_id, set_operating_agent_id] = useState('')
    
    async function load () {
        set_loading(true)
        try {
            const items = await chat_model.knowledge.list_agent_bindings(kb.knowledgeBaseId)
            set_bindings(items)
        } catch {
            message.error(t('加载 Agent 绑定列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        load()
    }, [kb.knowledgeBaseId])
    
    const bound_agent_ids = new Set(bindings.map(b => b.agentId))
    const visible_agents = agents.filter(a => a.statusName !== 'DELETED')
    
    async function toggle_binding (agent_id: string, checked: boolean) {
        set_operating_agent_id(agent_id)
        try {
            if (checked) {
                await chat_model.knowledge.bind_agent(kb.knowledgeBaseId, agent_id)
                message.success(t('已绑定'))
            } else {
                await chat_model.knowledge.unbind_agent(kb.knowledgeBaseId, agent_id)
                message.success(t('已解绑'))
            }
            await load()
        } catch (err: any) {
            message.error(err.message || (checked ? t('绑定失败') : t('解绑失败')))
        } finally {
            set_operating_agent_id('')
        }
    }
    
    return <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>
                {t('绑定后，Agent 可在对话推理时使用该知识库进行知识检索与问答。')}
            </Text>
            <Tooltip title={t('刷新')}>
                <ReloadOutlined style={{ cursor: 'pointer', padding: 4 }} onClick={load} />
            </Tooltip>
        </div>
        
        <Table
            size='small'
            rowKey='agentId'
            loading={loading}
            dataSource={visible_agents}
            pagination={false}
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无 Agent')} /> }}
            columns={[
                {
                    title: 'Agent',
                    render: (_: unknown, agent: IAgentInfo) => <div style={{ minWidth: 0 }}>
                            <Text strong title={agent.agentName} style={{ display: 'block', maxWidth: '100%' }} ellipsis>
                                {agent.agentName}
                            </Text>
                            {agent.description && <Text type='secondary' style={{ fontSize: 11 }} ellipsis>
                                {agent.description}
                            </Text>}
                        </div>,
                },
                {
                    title: t('状态'),
                    width: 100,
                    render: (_: unknown, agent: IAgentInfo) => (
                        bound_agent_ids.has(agent.agentId)
                            ? <Tag color='blue'>{t('已绑定')}</Tag>
                            : <Tag>{t('未绑定')}</Tag>
                    ),
                },
                {
                    title: t('操作'),
                    width: 100,
                    render: (_: unknown, agent: IAgentInfo) => <Switch
                            className='ai-settings-switch-medium'
                            checked={bound_agent_ids.has(agent.agentId)}
                            loading={operating_agent_id === agent.agentId}
                            disabled={kb.status !== 'ACTIVE'}
                            onChange={checked => { toggle_binding(agent.agentId, checked) }}
                        />,
                },
            ]}
        />
    </div>
}
