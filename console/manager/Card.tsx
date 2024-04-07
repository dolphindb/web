import { Button, Modal } from 'antd'

import { useEffect, useState } from 'react'

import { t } from '../../i18n/index.js'

import './index.sass'
import { model } from '../model.js'

import { module_infos } from './model.js'

export function Card ({ module_key }: { module_key: string }) 
{
    const { active_modules } = model.use(['active_modules'])
    const { label, description, activate_prompt, deactivate_prompt, activate_function, deactivate_function } = module_infos.get(module_key)
    const [active, set_active] = useState<boolean>(false)
    const [active_label, set_active_label] = useState<string>('')
    
    useEffect(() => {
        const has_module = active_modules.has(module_key)
        set_active(has_module)
        set_active_label(has_module ? t('停用') : t('启用'))
    }, [active_modules])
    
    return <>
        <div className='card'>
            <div className='left'>
                <div className='label'>{label}</div>
                <div className='description'>{description}</div>
            </div>
            <div className='right'>
                <Button
                    className='button'
                    type='primary'
                    danger={active}
                    onClick={() => {
                        Modal.confirm({
                          title: t('{{label}}{{active_label}}提示', { active_label, label }),
                          content: active ? deactivate_prompt : activate_prompt,
                          onOk: async () => { 
                                active ? await deactivate_function() : await activate_function()
                                await model.change_modules(module_key, active)
                                model.message.success(t('{{label}}{{active_label}}成功', { active_label, label }))
                            }
                        })
                      }}
                >
                    {active_label}
                </Button>
            </div>
        </div>
    </>
}
