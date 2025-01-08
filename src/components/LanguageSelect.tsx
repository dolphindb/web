import { Dropdown, type  MenuProps } from 'antd'

import SvgI18n from '@/icons/i18n.icon.svg'

import { model } from '@/model.ts'


export function LanguageSelect () {
    function handleLanguageChange (lang: string) {
        model.goto(location.pathname, { queries: { language: lang } })
        location.reload()
    }
    
    const items: MenuProps['items'] = [
        {
            key: 'zh',
            label: '中文',
            onClick: () => { handleLanguageChange('zh') }
        },
        {
            key: 'en',
            label: 'English',
            onClick: () => { handleLanguageChange('en') }
        }
    ]
    
    return <Dropdown
            menu={{ items }}
            placement='bottomRight'
            trigger={['hover', 'click']}
            arrow
            className='header-settings'
        >
            <div>
                <SvgI18n className='header-settings-icon'/>
            </div>
        </Dropdown>
}
