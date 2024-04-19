import { Radio } from 'antd'
import { useState } from 'react'
import { GuideType } from './type.js'
import { SimpleVersion } from './SimpleVersion/index.js'
import { AdvancedVersion } from './AdvancedVersion/index.js'
import { t } from '../../../i18n/index.js'

const VersionMap = {
    [GuideType.SIMPLE]: <SimpleVersion />,
    [GuideType.ADVANCED]: <AdvancedVersion />
}

export function CreateGuide () { 
    
    const [type, set_type] = useState(GuideType.SIMPLE)
    
    return <>
        <Radio.Group value={type} onChange={e => { set_type(e.target.value) }}>
            <Radio.Button value={GuideType.SIMPLE}>{t('简易版')}</Radio.Button>
            <Radio.Button value={GuideType.ADVANCED}>{t('进阶版')}</Radio.Button>
        </Radio.Group>
        
        {VersionMap[type]}
    </>
}
