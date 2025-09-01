import { useRef } from 'react'

import { Popover, Card, Button, InputNumber, type FormInstance, Form, Checkbox } from 'antd'

import { CaretUpOutlined, CaretDownOutlined, SettingOutlined } from '@ant-design/icons'

import { storage } from 'xshell/storage.js'

import { t } from '@i18n'

import { model, storage_keys } from '@model'


export function Settings () {
    let { shf } = model.use(['shf'])
    
    let rform = useRef<FormInstance<Fields>>(undefined)
    
    
    return <Popover
        trigger='hover'
        placement='bottomLeft'
        classNames={{ body: 'header-card' }}
        content={
            <Card className='settings-card' size='small' title={t('设置', { context: 'settings' })} variant='borderless'>
                <Form<Fields>
                    className='settings-form'
                    ref={rform}
                    initialValues={{
                        ...model.options,
                        shf
                    } satisfies Fields}
                    onFinish={fields => { apply_setttings(fields, false) }}
                    onReset={() => {
                        apply_setttings(
                            {
                                decimals: null,
                                grouping: true,
                                shf: false
                            },
                            true)
                    }}
                >
                    <Form.Item<Fields>
                        className='decimals'
                        name='decimals'
                        label={t('小数位数')}
                        help={decimals_tooltip}
                        rules={[{
                            async validator (_, value) {
                                if (value === null)
                                    return
                                
                                let number = Number(value)
                                
                                if (!Number.isInteger(number) || number < 0 || number > 20)
                                    throw new Error(decimals_tooltip)
                            }
                        }]}
                    >
                        <InputNumber
                            size='small'
                            controls={{ upIcon: <CaretUpOutlined />, downIcon: <CaretDownOutlined /> }}
                        />
                    </Form.Item>
                    
                    <Form.Item<Fields> name='grouping' label={t('数字用 "," 分组显示')} valuePropName='checked'>
                        <Checkbox />
                    </Form.Item>
                    
                    { (model.dev || shf) && <Form.Item<Fields> name='shf' label='沈鸿飞的白色主题' valuePropName='checked'>
                        <Checkbox />
                    </Form.Item> }
                    
                    <div className='submit-line'>
                        <div className='padding' />
                        <Button htmlType='reset' size='small'>{t('重置')}</Button>
                        <Button htmlType='submit' size='small' type='primary'>{t('应用')}</Button>
                    </div>
                </Form>
            </Card>
        }
    >
        <SettingOutlined className='header-settings-icon' />
    </Popover>
}


interface Fields {
    decimals?: number | null
    
    grouping?: boolean
    
    shf: boolean
}


function apply_setttings ({ decimals, grouping, shf }: Fields, reset: boolean) {
    storage.setstr(storage_keys.shf, shf ? '1' : '0')
    storage.setstr(storage_keys.grouping, grouping ? '1' : '0')
    
    model.set({
        options: { decimals, grouping },
        shf
    })
    
    model.message.success(t('{{action}}成功，当前小数位数为：{{decimals}}; 数字分组显示: {{grouping}}', {
        action: reset ? t('重置') : t('设置'),
        decimals: decimals === null ? t('实际位数') : decimals,
        grouping: grouping ? t('开') : t('关')
    }))
    
    if (new URLSearchParams(location.search).has('shf'))
        model.set_query('shf', null)
}


const decimals_tooltip = t('输入应为空或者 0 ~ 20 的整数')
