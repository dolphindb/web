import {
    ArrowLeftOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
    SearchOutlined,
    SettingOutlined} from '@ant-design/icons'
import { Button, Input } from 'antd'

import { t } from '../../i18n/index.js'

import { TABLE_NAMES } from './constant.js'
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
    
    return <div className='actions'>
            <Button
                type='default'
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                    access.set({ current: null })
                }}
            >
                {t('返回')}
            </Button>
            
            {preview ? (
                <Button
                    type='primary'
                    icon={<SettingOutlined />}
                    onClick={() => {
                        access.set({ current: { ...access.current, view: 'manage' } })
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
                value={search_key}
                prefix={<SearchOutlined />}
                onChange={e => {
                    set_search_key(e.target.value)
                }}
                placeholder={t('请输入想要搜索的{{category}}', { category: TABLE_NAMES[category] })}
            />
        </div>
}
