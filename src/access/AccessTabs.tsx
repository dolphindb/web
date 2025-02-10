import { Tabs, Button, Select, Space } from 'antd'
import { EyeOutlined, SettingOutlined } from '@ant-design/icons'
import { useState } from 'react'

import { t } from '@i18n/index.ts'

import { useParams, useSearchParams } from 'react-router'

import { useSWRConfig } from 'swr'

import { model } from '@/model.ts'

import type { AccessRole, AccessCategory } from '@/access/types.ts'
import { use_users } from '@/access/hooks/use-users.ts'
import { use_groups } from '@/access/hooks/use-groups.ts'
import { AccessList } from '@/access/AccessList.tsx'
import { AccessManage } from '@/access/AccessManage.tsx'
import { RefreshButton } from '@/components/RefreshButton/index.tsx'


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
    
    const get_access_view = (category: AccessCategory) => 
        editing
            ? <AccessManage role={role} name={name} category={category}/> 
            : <AccessList role={role} name={name} category={category}/>
    
    return <Tabs
            items={[
                {
                    key: 'database',
                    label: t('分布式数据库'),
                    children: get_access_view('database')
                },
                {
                    key: 'share_table',
                    label: t('共享内存表'),
                    children: get_access_view('shared')
                },
                {
                    key: 'stream',
                    label: t('流数据表'),
                    children: get_access_view('stream')
                },
                {
                    key: 'function_view',
                    label: t('函数视图'),
                    children: get_access_view('function_view')
                },
                {
                    key: 'script',
                    label: t('全局权限'),
                    children: get_access_view('script')
                }
            ]}
            activeKey={tab_key}
            onChange={handle_tab_change}
            tabBarExtraContent={{
                right: (
                    <Space size={10}>
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
                        {editing ? ( 
                            <Button
                                type='default'
                                icon={<EyeOutlined />}
                                onClick={() => {
                                    model.goto(`/access/${role}/${name}`)
                                }}
                            >
                                {t('查看权限')}
                            </Button>
                           
                        ) : (
                            <Button
                                type='primary'
                                icon={<SettingOutlined />}
                                onClick={() => {
                                    model.goto(`/access/${role}/${name}/edit`)
                                }}
                            >
                                {t('设置权限')}
                            </Button>
                        )}
                        <RefreshButton
                        onClick={async () => {
                            await mutate(key => Array.isArray(key) && key[0] === 'access_objs')
                            model.message.success(t('刷新成功'))
                        }}
                     />
                    </Space>
                )
            }}
        />
}
