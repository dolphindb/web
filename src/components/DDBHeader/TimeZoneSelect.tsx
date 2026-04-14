import { Select } from 'antd'
import { useState } from 'react'
import { ClockCircleOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import { storage_keys } from '@model'
import { storage } from 'xshell/storage.js'


const options = [
    {
        value: 'default',
        label: t('默认 (本地时区)'),
    },
    {
        value: 'Asia/Shanghai',
        label: 'Asia/Shanghai',
    },
    ... Intl.supportedValuesOf('timeZone')
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
        onSelect={key => {
            if (key === 'default')
                storage.delete(storage_keys.timezone)
            else
                storage.setstr(storage_keys.timezone, key)
            
            set_selected(key)
            
            location.reload()
        }}
        suffixIcon={<ClockCircleOutlined className='header-settings-icon' />}
        onOpenChange={open => set_opened(open)}
    />
}
