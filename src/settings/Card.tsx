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
    on_saved
}: {
    module_key: string
    icon: ReactElement
    label: string
    description: string
    activate_prompt?: string
    deactivate_prompt?: string
    on_saved? (activated: boolean): void
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
                okText={t('确定')}
                cancelText={t('取消')}
                onConfirm={async () => {
                    let enabled_modules_ = new Set(enabled_modules)
                    
                    if (active)
                        enabled_modules_.delete(module_key)
                    else
                        enabled_modules_.add(module_key)
                    
                    if (enabled_modules_.size)
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
                    else {  // 为空时不能保存为 webModules= ，必须删除这个配置项
                        config.delete_config('webModules')
                        await config.save_configs()
                    }
                    
                    model.set({ enabled_modules: enabled_modules_ })
                    
                    model.message.success(t('{{label}}{{action}}成功', { label, action }))
                    
                    on_saved(!active)
                }}
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
