import { useEffect, useState } from 'react'

import { Button, Modal, Spin, Tabs, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from './model.ts'
import type { IBuiltinInitResult } from './model.ts'
import { DolphinXAdminTab, DolphinXUserTab } from './DolphinXUserSettings.tsx'
import { AgentTab } from './settings/AgentTab.tsx'
import { LlmConfigTab } from './settings/LlmConfigTab.tsx'
import { SkillsTab } from './settings/SkillsTab.tsx'


const { Text } = Typography


export function SettingsModal () {
    const { settings_visible, can_manage_agents } = chat_model.use(['settings_visible', 'can_manage_agents'])
    const { admin } = model.use(['admin'])
    const [builtin_status, set_builtin_status] = useState<IBuiltinInitResult | null>(null)
    const [checking_builtin, set_checking_builtin] = useState(false)
    const [initializing_builtin, set_initializing_builtin] = useState(false)
    
    useEffect(() => {
        if (!settings_visible)
            return
        let disposed = false
        set_checking_builtin(true)
        chat_model.llm.load_builtin_init_status(false)
            .then(result => {
                if (!disposed)
                    set_builtin_status(result)
            })
            .catch(error => {
                console.error('Load built-in Agent/Skill init status failed:', error)
                if (!disposed)
                    set_builtin_status(null)
            })
            .finally(() => {
                if (!disposed)
                    set_checking_builtin(false)
            })
        return () => { disposed = true }
    }, [settings_visible])
    
    const builtin_ready = builtin_status?.initialized === true || builtin_status?.state === 'READY'
    const show_builtin_init = checking_builtin || Boolean(builtin_status && !builtin_ready)
    const can_manage_agent = admin || can_manage_agents
    
    async function initialize_builtins () {
        set_initializing_builtin(true)
        try {
            const result = await chat_model.llm.init_builtins({ dryRun: false, includeDetails: false })
            set_builtin_status(result)
            if (result.initialized === true || result.state === 'READY') {
                message.success(t('初始化完成'))
                await chat_model.agent.load_agents()
            } else {
                console.warn('Built-in Agent/Skill init finished but is not ready:', result)
                message.error(t('初始化未完成，详情请查看控制台'))
            }
        } catch (error) {
            console.error('Built-in Agent/Skill init failed:', error)
            message.error(t('初始化失败，详情请查看控制台'))
        } finally {
            set_initializing_builtin(false)
        }
    }
    
    return <Modal
        title={t('AI 设置')}
        open={settings_visible}
        onCancel={() => { chat_model.set({ settings_visible: false }) }}
        footer={null}
        width={960}
        destroyOnClose
    >
        <div style={{ position: 'relative', minHeight: 520 }}>
            <Tabs
                destroyInactiveTabPane
                items={[
                    ...can_manage_agent ? [{
                        key: 'agent',
                        label: t('Agent 管理'),
                        children: <AgentTab />,
                    }] : [ ],
                    ...admin ? [{
                        key: 'llm',
                        label: t('模型配置'),
                        children: <LlmConfigTab />,
                    },
                    {
                        key: 'skills',
                        label: t('技能管理'),
                        children: <SkillsTab />,
                    }] : [ ],
                    {
                        key: 'user',
                        label: t('个人中心'),
                        children: <DolphinXUserTab />,
                    },
                    ...admin
                        ? [{
                            key: 'admin',
                            label: t('用户管理'),
                            children: <DolphinXAdminTab />,
                        }]
                        : [ ],
                ]}
            />
            {show_builtin_init && <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(1px)',
            }}>
                <div style={{
                    width: 420,
                    padding: 28,
                    borderRadius: 8,
                    background: '#fff',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    textAlign: 'center',
                }}>
                    {checking_builtin
                        ? <Spin />
                        : <>
                            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{t('需要初始化 AI 内置资源')}</div>
                            <Text type='secondary'>{t('首次使用 AI 前，需要初始化内置 Agent 和 Skill。')}</Text>
                            <div style={{ marginTop: 20 }}>
                                {admin
                                    ? <Button type='primary' size='large' loading={initializing_builtin} onClick={initialize_builtins}>{t('一键初始化')}</Button>
                                    : <Text type='danger'>{t('请联系管理员完成初始化')}</Text>
                                }
                            </div>
                        </>
                    }
                </div>
            </div>}
        </div>
    </Modal>
}
