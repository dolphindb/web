import { Select } from 'antd'
import { useState } from 'react'
import { ClockCircleOutlined } from '@ant-design/icons'
import { set_timezone } from 'dolphindb/browser.js'
import { storage } from 'xshell/storage.js'

import { t } from '@i18n'
import { model, storage_keys } from '@model'


const options = [
    {
        value: 'default',
        label: t('默认 (不偏移)'),
    },
    {
        value: 'Asia/Shanghai',
        label: 'Asia/Shanghai',
    },
    ... (Intl.supportedValuesOf?.('timeZone') ?? [ ])
        .filter(tz => tz !== 'Asia/Shanghai')
        .map(tz => ({ value: tz, label: tz }))
]


export function TimeZoneSelect () {
    const [selected, set_selected] = useState(() => storage.getstr(storage_keys.timezone) || 'default')
    const [opened, set_opened] = useState(false)
    
    return <Select
        className={`header-settings timezone-select ${selected === 'default' && !opened ? 'timezone-select-default' : ''}`}
        size='small'
        showSearch={{ optionFilterProp: 'label' }}
        listHeight={400}
        popupMatchSelectWidth={false}
        options={options}
        value={selected}
        onChange={key => {
            if (key === 'default') {
                storage.delete(storage_keys.timezone)
                set_timezone()
            } else {
                storage.setstr(storage_keys.timezone, key)
                set_timezone(key)
            }
            
            set_selected(key)
            
            model.message.success(key === 'default'
                ? t('时区已重置为默认，下次执行代码时生效')
                : t('时区已切换为 {{timezone}}，下次执行代码时生效', { timezone: key }))
        }}
        suffixIcon={<ClockCircleOutlined className='header-settings-icon' />}
        onOpenChange={open => { set_opened(open) }}
    />
}
