import {
    ArrowLeftOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
    SearchOutlined,
    SettingOutlined
} from '@ant-design/icons'
import { Button, Input } from 'antd'

import { useState } from 'react'

import { t } from '../../i18n/index.js'

import { model } from '@/model.ts'

import { TABLE_NAMES } from './constants.tsx'
import type { AccessRole } from './types.ts'

export function AccessHeader ({
    category,
    preview,
    search_key,
    set_search_key,
    add_open,
    delete_open,
    selected_length,
    role,
    name
}: {
    preview: boolean
    category: string
    search_key: string
    set_search_key: (str: string) => void
    add_open?: () => void
    delete_open?: () => void
    selected_length?: number
    role: AccessRole
    name: string
}) {
    
    const { v3 } = model.use(['v3'])
    
    const [input_value, set_input_value] = useState(search_key)
    
    return <div className='actions'>
        <Button
            type='default'
            icon={<ArrowLeftOutlined />}
            onClick={() => {
                model.goto(`/access/${role}`)
            }}
        >
            {t('返回')}
        </Button>
        
        {preview ? (
            <Button
                type='primary'
                icon={<SettingOutlined />}
                onClick={() => {
                    model.goto(`/access/${role}/${name}/edit`)
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
                        model.goto(`/access/${role}/${name}`)
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
            placeholder={t('请输入想要搜索的{{category}}', { category: category === 'database' && v3 ? `${TABLE_NAMES.catalog} / ${TABLE_NAMES.database} / ${TABLE_NAMES.table}` : TABLE_NAMES[category] })}
        />
    </div>
}
