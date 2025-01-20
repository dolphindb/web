import { Dropdown } from 'antd'

import { t } from '@i18n/index.ts'

import { useState } from 'react'

import SvgI18n from '@/icons/i18n.icon.svg'
import { model, storage_keys } from '@/model.ts'


export function LanguageSelect () {
    const [selected, set_selected] = useState(localStorage.getItem(storage_keys.language) || 'auto')
    
    return <Dropdown
            menu={{
                items: [
                    {
                        key: 'zh',
                        label: '中文',
                    },
                    {
                        key: 'en',
                        label: 'English',
                    },
                    {
                        key: 'auto',
                        label: t('自动'),
                    }
                ],
                onClick: ({ key }) => {
                    if (key === 'auto') {
                        localStorage.removeItem(storage_keys.language)
                        model.set_query('language', null)
                    } else {
                        model.set_query('language', key)
                        localStorage.setItem(storage_keys.language, key)
                    }
                    location.reload()
                    set_selected(key)
                },
                onSelect: ({ key }) => {
                    set_selected(key)
                },
                selectedKeys: [selected],
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
