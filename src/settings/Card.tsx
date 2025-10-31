import { Button, Popconfirm } from 'antd'

import type { ReactElement } from 'react'

import { t } from '@i18n'

import { model } from '@model'
import { config } from '@/config/model.ts'


export function Card ({
    module_key,
    icon,
    label,
    description,
    activate_prompt = t('您确定要启用此功能吗'),
    deactivate_prompt = t('您确定要停用此功能吗'),
    on_activate,
    on_deactivate,
}: {
    module_key: string
    icon: ReactElement
    label: string
    description: string
    activate_prompt?: string
    deactivate_prompt?: string
    on_activate?: () => void | Promise<void>
    on_deactivate?: () => void | Promise<void>
}) {
    const { enabled_modules } = model.use(['enabled_modules'])
    
    const active = enabled_modules.has(module_key)
    const action = active ? t('停用') : t('启用')
    
    return <div className='card'>
        <div className='left'>
            <div className='label'>
                {icon}
                <div>{label}</div>
            </div>
            <div className='description'>{description}</div>
        </div>
        <div className='right'>
            <Popconfirm
                okButtonProps={{ danger: active }}
                title={active ? deactivate_prompt : activate_prompt}
                onConfirm={async () => {
                    let enabled_modules_ = new Set(enabled_modules)
                    
                    if (active) {
                        await on_deactivate()
                        enabled_modules_.delete(module_key)
                    } else {
                        await on_activate()
                        enabled_modules_.add(module_key)
                    }
                    
                    await config.change_configs([
                        [
                            'webModules', 
                            {
                                key: 'webModules',
                                name: 'webModules',
                                value: Array.from(enabled_modules_).join(','), 
                                qualifier: ''
                            }
                        ]
                    ])
                    
                    model.set({ enabled_modules: enabled_modules_ })
                    
                    model.message.success(t('{{label}}{{action}}成功', { label, action }))
                }}
                okText={t('确定')}
                cancelText={t('取消')}
            >
                <Button
                    className='button'
                    type='primary'
                    danger={active}
                >
                    {action}
                </Button>
            </Popconfirm>
        </div>
    </div>
}
