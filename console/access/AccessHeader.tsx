import { SearchOutlined } from '@ant-design/icons'
import { Button, Input } from 'antd'

import { t } from '../../i18n/index.js'

import { TABLE_NAMES } from './constant.js'
import { access } from './model.js'

export function AccessHeader ({
    category,
    preview,
    search_key,
    set_search_key,
    open
}: {
    preview: boolean
    category: string
    search_key: string
    set_search_key: (str: string) => void
    open?: () => void
}) {
    const { current } = access.use(['current', 'users', 'groups'])
    
    return <div className='actions'>
            
            <Button  
                onClick={() => { access.set({ current: null }) }}>
                {t('返回{{role}}列表', { role: current.role === 'user' ? t('用户') : t('组') })}
            </Button>
            
            {preview ? 
                <Button  
                    onClick={() => { access.set({ current: { ...access.current, view: 'manage' } }) }}>
                    {t('权限管理')}
                </Button>  
                    : 
            <>
                <Button onClick={open}>
                    {t('新增权限')}
                </Button>
                <Button onClick={() => { access.set({ current: { ...current, view: 'preview' } }) }}>
                    {t('权限查看')}
                </Button>
            </> 
            }
            <Input  
                className='search'
                value={search_key}
                prefix={<SearchOutlined />}
                onChange={e => { set_search_key(e.target.value) }} 
                placeholder={t('请输入想要搜索的{{category}}', { category: TABLE_NAMES[category] })} 
            />
        </div>
}
