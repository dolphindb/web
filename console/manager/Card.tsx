import { Button, Modal } from 'antd'

import { useEffect, useState } from 'react'

import { t } from '../../i18n/index.js'

import './index.sass'
import { model } from '../model.js'

import { module_infos } from './model.js'

export function Card ({ module_key }: { module_key: string }) 
{
    const { modules } = model.use(['modules'])
    const { label, description, load_prompt, unload_prompt, load_function, unload_function } = module_infos.get(module_key)
    const [enable, set_enable] = useState<boolean>(false)
    const [enable_label, set_enable_label] = useState<string>('')
    
    useEffect(() => {
        const has_module = modules.has(module_key)
        set_enable(has_module)
        set_enable_label(has_module ? t('停用') : t('启用'))
    }, [modules])
    
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
                    danger={enable}
                    onClick={() => {
                        Modal.confirm({
                          title: t('{{label}}{{enable_label}}提示', { enable_label, label }),
                          content: enable ? unload_prompt : load_prompt,
                          onOk: async () => { 
                                enable ? await unload_function() : await load_function()
                                await model.change_modules(module_key, enable)
                                model.message.success(t('{{label}}{{enable_label}}成功', { enable_label, label }))
                            }
                        })
                      }}
                >
                    {enable_label}
                </Button>
            </div>
        </div>
    </>
}
