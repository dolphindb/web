import { Button, Select, Tabs, type TabsProps } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { t } from '../../i18n/index.js'

import { ReloadOutlined } from '@ant-design/icons'
import { model } from '../model.js'
import { access } from './model.js'

import { AccessList } from './AccessList.js'
import { AccessManage } from './AccessManage.js'

export function AccessView () {
    
    const { current, users, groups, } =  access.use(['current', 'users', 'groups'])
    
    const { role, name, view } = current
     
    const [tab_key, set_tab_key] = useState('database')
    
    const [refresher, set_refresher] = useState({ })
    
    useEffect(() => {
        (async () =>  { 
            access.set({ accesses: role === 'user' ? 
                (await access.get_user_access([name]))[0]
                    :
                (await access.get_group_access([name]))[0] }) 
        })()
    }, [refresher, role, name])
    
    const tabs: TabsProps['items'] = useMemo(() => ([
        {
            key: 'database',
            label: t('分布式数据库'),
            children: view === 'preview' ? 
                        <AccessList category='database'/>
                            :
                        <AccessManage category='database'/>
        },
        {
            key: 'share_table',
            label: t('共享内存表'),
            children: view === 'preview' ? 
                        <AccessList category='shared'/>
                            :
                        <AccessManage category='shared'/>
            
        },
        {
            key: 'stream',
            label: t('流数据表'),
            children: view === 'preview' ? 
                        <AccessList category='stream'/>
                            :
                        <AccessManage category='stream'/>
            
        },
        {
            key: 'function_view',
            label: t('函数视图'),
            children: view === 'preview' ? 
                        <AccessList category='function_view'/>
                            :
                        <AccessManage category='function_view'/>
            
        }, {
            key: 'script',
            label: t('全局权限'),
            children: view === 'preview' ? 
                        <AccessList category='script'/>
                            :
                        <AccessManage category='script'/>
            
        }
    ]), [view])
    
    const OperationsSlot: Record<'left' | 'right', React.ReactNode> = {
        left: <div className='switch-user'>
                {t('当前查看{{role}}:', { role: role === 'user' ? t('用户') : t('组') })}
                <Select 
                    value={name}
                    options={(role === 'user' ? users : groups).map(t => ({
                            value: t,
                            label: t
                    }))} 
                    onSelect={item =>  { access.set({ current: { ...current, name: item } }) } }
                    />
            </div>,
        right: <Button
                    icon={<ReloadOutlined />}
                    onClick={() => { 
                        set_refresher({ })
                        model.message.success(t('刷新成功'))
                    }}
                >
                    {t('刷新')}
                </Button>
      }
    
    return <Tabs 
                type='card' 
                items={tabs} 
                accessKey={tab_key}
                onChange={set_tab_key}
                tabBarExtraContent={
                    OperationsSlot
                }/>
}


