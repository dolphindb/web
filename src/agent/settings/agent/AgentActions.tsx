import { Button, Popconfirm, Space } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, StopOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import { model } from '@model'
import { chat_model } from '@/agent/model.ts'
import type { IAgentInfo } from '@/agent/model/types.ts'


export function AgentActions ({ agent, on_refresh }: { agent: IAgentInfo, on_refresh: () => void }) {
    return <Space size={4}>
        {agent.statusName !== 'ACTIVE' && <Button
            size='small'
            icon={<CheckCircleOutlined />}
            onClick={async () => {
                try {
                    await chat_model.agent.activate_agent(agent.agentId)
                    model.message.success(t('已激活'))
                    on_refresh()
                } catch (err: any) {
                    model.message.error(err.message || t('激活失败'))
                }
            }}
        >{t('激活')}</Button>}
        {agent.statusName === 'ACTIVE' && <Popconfirm
            title={t('确定挂起此 Agent？')}
            onConfirm={async () => {
                try {
                    await chat_model.agent.suspend_agent(agent.agentId)
                    model.message.success(t('已挂起'))
                    on_refresh()
                } catch (err: any) {
                    model.message.error(err.message || t('挂起失败'))
                }
            }}
        >
            <Button size='small' icon={<StopOutlined />}>{t('挂起')}</Button>
        </Popconfirm>}
        <Popconfirm
            title={t('确定删除此 Agent？')}
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
                try {
                    await chat_model.agent.delete_agent(agent.agentId)
                    model.message.success(t('已删除'))
                    on_refresh()
                } catch (err: any) {
                    model.message.error(err.message || t('删除失败'))
                }
            }}
        >
            <Button size='small' danger icon={<DeleteOutlined />}>{t('删除')}</Button>
        </Popconfirm>
    </Space>
}
