import { Dropdown, type  MenuProps } from 'antd'

import { t } from '@i18n/index.ts'

import SvgI18n from '@/icons/i18n.icon.svg'
import { storage_keys } from '@/model.ts'


export function LanguageSelect () {
    function handleLanguageChange (lang: string) {
        const searchParams = new URLSearchParams(location.search)
        if (lang === 'auto') {
            localStorage.removeItem(storage_keys.language)
            searchParams.delete('language')
        } else {
            searchParams.set('language', lang)
            localStorage.setItem(storage_keys.language, lang)
        }
        location.search = searchParams.toString()
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
        },
        {
            key: 'auto',
            label: t('自动'),
            onClick: () => { handleLanguageChange('auto') }
        }
    ]
    
    return <Dropdown
            menu={{
                items,
                onChange () {
                    
                }
            }}
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
