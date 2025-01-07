import { Tabs, Button, Select, type  TabsProps } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useState, useMemo } from 'react'

import { t } from '@i18n/index.js'

import { model } from '@/model.js'

import { access } from '@/access/model.js'

import type { AccessRole, AccessMode, AccessCategory } from '@/access/types.js'

export function AccessTabs ({ 
    role, 
    name, 
    mode, 
    children 
}: 
{ 
    role: AccessRole
    name: string
    mode: AccessMode
    children: (category: AccessCategory, role: AccessRole, name: string) => React.ReactNode 
}) {
    const { users, groups } = access.use(['users', 'groups'])
    
    const [tab_key, set_tab_key] = useState('database')
    const [refresher, set_refresher] = useState({ })
    
    const tabs: TabsProps['items'] = useMemo(
        () => [
            {
                key: 'database',
                label: t('分布式数据库'),
                children: children('database', role, name)
            },
            {
                key: 'share_table',
                label: t('共享内存表'),
                children: children('shared', role, name)
            },
            {
                key: 'stream',
                label: t('流数据表'),
                children: children('stream', role, name)
            },
            {
                key: 'function_view',
                label: t('函数视图'),
                children: children('function_view', role, name)
            },
            {
                key: 'script',
                label: t('全局权限'),
                children: children('script', role, name)
            }
        ],
        [children]
    )
    
    const OperationsSlot = {
        left: (
            <div className='switch-user'>
                {t('当前{{role}}:', { role: role === 'user' ? t('用户') : t('组') })}
                <Select
                    value={name}
                    options={(role === 'user' ? users : groups).map(t => ({
                        value: t,
                        label: t
                    }))}
                    onSelect={item => {
                        model.goto(`/access/${role}/${item}/${mode}`)
                    }}
                />
            </div>
        ),
        right: (
            <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                    set_refresher({ })
                    model.message.success(t('刷新成功'))
                }}
            >
                {t('刷新')}
            </Button>
        )
    }
    
    return <Tabs
            type='card'
            items={tabs}
            activeKey={tab_key}
            onChange={set_tab_key}
            tabBarExtraContent={OperationsSlot}
        />
}
