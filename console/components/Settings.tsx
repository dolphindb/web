import { useState } from 'react'

import { Popover, Card, Tooltip, Button, InputNumber, message } from 'antd'

import { SettingFilled, CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'


export function Settings () {
    type DecimalsStatus = null | 'error'
    
    const [decimals, set_decimals] = useState<{ status: DecimalsStatus, value: number | null }>(
        { status: null, value: model.options?.decimals ?? null }
    )
    
    function confirm () {
        if (decimals.status === null) {
            model.set({ options: { decimals: decimals.value } })
            message.success(t('设置成功，目前小数位数为：') + (decimals.value === null ? t('实际位数') : decimals.value))
        } else
            set_decimals({ status: null, value: model.options?.decimals ? model.options.decimals : null })
    }
    
    function validate (text: string): { status: DecimalsStatus, value: null | number } {
        text = text.trim()
        if (text.length === 0) 
            return { value: null, status: null }
        
        if (!/^[0-9]*$/.test(text)) 
            return { value: null, status: 'error' }
        
        const num = Number(text)
        if (Number.isNaN(num)) 
            return { value: null, status: 'error' }
        
        if (num < 0 || num > 20) 
            return { value: num, status: 'error' }
        
        return { value: num, status: null }
    }
    
    
    return <div className='header-settings'>
        <Popover
            trigger='hover'
            placement='bottomRight'
            zIndex={1060}
            content={
                <div className='header-settings-content head-bar-info'>
                    <Card size='small' title={t('设置', { context: 'settings' })} bordered={false}>
                        <div className='decimals-toolbar'>
                            <span className='decimals-toolbar-input'>
                                {t('设置小数位数: ')}
                                <Tooltip title={t('输入应为空或介于 0 ~ 20')} placement='topLeft'>
                                    <InputNumber
                                        min={0}
                                        max={20}
                                        onStep={value => {
                                            set_decimals(validate(value.toString()))
                                        }}
                                        onInput={(text: string) => {
                                            set_decimals(validate(text))
                                        }}
                                        value={decimals.value}
                                        size='small'
                                        status={decimals.status}
                                        onPressEnter={confirm}
                                        controls={{ upIcon: <CaretUpOutlined />, downIcon: <CaretDownOutlined /> }}
                                    />
                                </Tooltip>
                            </span>
                            <span className='decimals-toolbar-button-group'>
                                <Button size='small' onClick={() => {
                                    model.set({ options: { decimals: null } })
                                    set_decimals({ value: null, status: null })
                                    message.success(t('重置成功，目前小数位数为：实际位数'))
                                }}>
                                    {t('重置')}
                                </Button>
                                <Button onClick={confirm} size='small' type='primary'>
                                    {t('确定')}
                                </Button>
                            </span>
                        </div>
                    </Card>
                </div>
            }
        >
            <SettingFilled className='header-settings-icon'
                style={{ fontSize: '20px', color: '#707070' }}
                onMouseOver={() => {
                    set_decimals({ value: model.options?.decimals ?? null, status: null })
                }} />
        </Popover>
    </div>
}
