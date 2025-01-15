import { Tabs, Button, Select, type TabsProps } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useState, useMemo, type  JSX } from 'react'

import { t } from '@i18n/index.ts'

import { useParams, useSearchParams } from 'react-router'

import { useSWRConfig } from 'swr'

import { model } from '@/model.ts'

import type { AccessRole, AccessMode, AccessCategory } from '@/access/types.ts'
import { use_users } from '@/access/hooks/use-users.ts'
import { use_groups } from '@/access/hooks/use-groups.ts'
import { AccessList } from '@/access/AccessList.tsx'
import { AccessManage } from '@/access/AccessManage.tsx'

type TabItems = Required<TabsProps>['items']

export function AccessTabs ({
    editing = false,
    role, 
}: 
{ 
    editing?: boolean
    role: AccessRole
}) {
    const query = useParams()
    const name = query.id
    
    const { data: users = [ ] } = use_users()
    const { data: groups = [ ] } = use_groups()
    
    const { mutate } = useSWRConfig()
    
    const [search_params, set_search_params] = useSearchParams()
    const [tab_key, set_tab_key] = useState(() => search_params.get('tab') || 'database')
    
    function handle_tab_change (key: string) {
        set_tab_key(key)
        set_search_params({ ...Object.fromEntries(search_params), tab: key })
    }
    
    const AccessView = (category: AccessCategory) => 
            editing 
                ? 
            <AccessManage role={role} name={name} category={category}/> 
                : 
            <AccessList role={role} name={name} category={category}/>
    
    const tabs: TabItems = [
        {
            key: 'database',
            label: t('分布式数据库'),
            children: AccessView('database')
        },
        {
            key: 'share_table',
            label: t('共享内存表'),
            children: AccessView('shared')
        },
        {
            key: 'stream',
            label: t('流数据表'),
            children: AccessView('stream')
        },
        {
            key: 'function_view',
            label: t('函数视图'),
            children: AccessView('function_view')
        },
        {
            key: 'script',
            label: t('全局权限'),
            children: AccessView('script')
        }
    ]
    
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
                        model.goto(`/access/${role}/${item}${editing ? '/edit' : ''}`, { queries: { tab: tab_key } })
                    }}
                />
            </div>
        ),
        right: (
            <Button
                icon={<ReloadOutlined />}
                onClick={async () => {
                    await mutate(key => Array.isArray(key) && key[0] === 'access_objs')
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
            onChange={handle_tab_change}
            tabBarExtraContent={OperationsSlot}
        />
}
