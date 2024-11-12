import {
    ArrowLeftOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined
} from '@ant-design/icons'
import { Button, Input, Select } from 'antd'

import { useState } from 'react'

import { t } from '../../i18n/index.js'

import { model } from '@/model.js'

import { TABLE_NAMES } from './constants.js'
import { access } from './model.js'

export function AccessHeader ({
    category,
    preview,
    search_key,
    set_search_key,
    add_open,
    delete_open,
    selected_length
}: {
    preview: boolean
    category: string
    search_key: string
    set_search_key: (str: string) => void
    add_open?: () => void
    delete_open?: () => void
    selected_length?: number
}) {
    const { current } = access.use(['current', 'users', 'groups'])
    
    const [input_value, set_input_value] = useState(search_key)
    
    return <div>
        <div className='switch'>
            <div className='switch-user'>
                {t('当前{{role}}:', { role: current.role === 'user' ? t('用户') : t('组') })}
                {/* <Select
                    value={name}
                    options={(role === 'user' ? users : groups).map(t => ({
                        value: t,
                        label: t
                    }))}
                    onSelect={item => {
                        access.set({ current: { ...current, name: item } })
                    }}
                /> */}
            </div>
            
            <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                    // set_refresher({ })
                    model.message.success(t('刷新成功'))
                }}
            >
                {t('刷新')}
            </Button>
        </div>
        <div className='actions'>
            <Button
                type='default'
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                    access.set({ current: { role: current.role } })
                }}
            >
                {t('返回')}
            </Button>
        
            {preview ? (
                <Button
                    type='primary'
                    icon={<SettingOutlined />}
                    onClick={() => {
                        access.set({ current: { ...current, view: 'manage' } })
                    }}
                >
                    {t('设置权限')}
                </Button>
            ) : (
            <>
                <Button type='primary' icon={<PlusOutlined />} onClick={add_open}>
                    {t('新增权限')}
                </Button>
                <Button
                    type='default'
                    icon={<EyeOutlined />}
                    onClick={() => {
                        access.set({ current: { ...current, view: 'preview' } })
                    }}
                >
                    {t('查看权限')}
                </Button>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                        if (selected_length)
                            delete_open()
                    }}
                >
                        {t('批量撤销')}
                    </Button>
                </>
            )}
            <Input
                className='search'
                value={input_value}
                prefix={<SearchOutlined />}
                onChange={e => {
                    set_input_value(e.target.value)
                }}
                onPressEnter={() => { set_search_key(input_value) }}
                placeholder={t('请输入想要搜索的{{category}}', { category: TABLE_NAMES[category] })}
            />
        </div>
    </div>
}
