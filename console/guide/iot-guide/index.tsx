import { Radio, Spin } from 'antd'
import { useState } from 'react'

import useSWR from 'swr'

import { t } from '../../../i18n/index.js'

import { create_guide } from '../model.js'

import { GuideType } from './type.js'
import { SimpleVersion } from './SimpleVersion/index.js'
import { AdvancedVersion } from './AdvancedVersion/index.js'

const VersionMap = {
    [GuideType.SIMPLE]: <SimpleVersion />,
    [GuideType.ADVANCED]: <AdvancedVersion />
}

export function CreateGuide () { 
    
    const [type, set_type] = useState(GuideType.SIMPLE)
    
    const { isLoading } = useSWR(
        'init_code',
        async () => create_guide.define_iot_guide()
    )
    
    return <Spin spinning={isLoading}>
        <Radio.Group value={type} onChange={e => { set_type(e.target.value) }}>
            <Radio.Button value={GuideType.SIMPLE}>{t('简易版')}</Radio.Button>
            <Radio.Button value={GuideType.ADVANCED}>{t('进阶版')}</Radio.Button>
        </Radio.Group>
        
        {VersionMap[type]}
    </Spin>
}
