import { Button, Popconfirm } from 'antd'

import { type ReactElement, useEffect, useState, useMemo } from 'react'

import { t } from '../../i18n/index.js'

import './index.sass'
import { model } from '../model.js'

export interface PropsType {
    module_key: string
    label: string
    description: string
    activate_prompt: string
    deactivate_prompt: string
    activate_function: Function
    deactivate_function: Function
    children: ReactElement
}

export function Card ({
        module_key,
        label,
        description,
        activate_prompt,
        deactivate_prompt,
        activate_function,
        deactivate_function,
        children
    }: PropsType) 
{
    const { active_modules } = model.use(['active_modules'])
    
    const active = useMemo(() => {
        return active_modules.has(module_key)
    }, [ active_modules])
    
    const active_label = useMemo(() => {
        return active_modules.has(module_key) ? t('停用') : t('启用')
    }, [ active_modules])
    
    return <>
        <div className='card'>
            <div className='left'>
                <div className='label'>
                    {children}
                    <div>{label}</div>
                </div>
                <div className='description'>{description}</div>
            </div>
            <div className='right'>
                <Popconfirm
                    title={t('{{label}}{{active_label}}提示', { active_label, label })}
                    description={active ? deactivate_prompt : activate_prompt}
                    onConfirm={async () => { 
                        active ? await deactivate_function() : await activate_function()
                        await model.change_modules(module_key, active)
                        model.message.success(t('{{label}}{{active_label}}成功', { active_label, label }))
                    }}
                    okText={t('确定')}
                    cancelText={t('取消')}
                >
                    <Button
                        className='button'
                        type='primary'
                        danger={active}
                    >
                        {active_label}
                    </Button>
                </Popconfirm>
            </div>
        </div>
    </>
}
