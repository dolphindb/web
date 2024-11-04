import { Radio, Spin } from 'antd'
import { useId, useState } from 'react'

import useSWR from 'swr'

import { t } from '../../../i18n/index.js'


import { model } from '../../model.js'

import finance_guide_code from '../finance.dos'
import iot_guide_code from '../iot.dos'



import { Unlogin } from '@/components/Unlogin.js'

import { GuideType } from './type.js'
import { SimpleVersion } from './SimpleVersion/index.js'
import { AdvancedVersion } from './AdvancedVersion/index.js'

const VersionMap = {
    [GuideType.SIMPLE]: <SimpleVersion />,
    [GuideType.ADVANCED]: <AdvancedVersion />
}

export function CreateGuide () { 
    
    const { logined } = model.use(['logined'])
    const [type, set_type] = useState(GuideType.SIMPLE)
    const id = useId()
    const { isLoading } = useSWR(
        ['load_code', id],
        async () => {
            await model.ddb.eval(finance_guide_code)
            await model.ddb.eval(iot_guide_code)
        }
    )
    
    if (!logined)
        return <Unlogin info={t('物联网库表向导')} />
    
    return <Spin spinning={isLoading}>
        <Radio.Group value={type} onChange={e => { set_type(e.target.value) }}>
            <Radio.Button value={GuideType.SIMPLE}>{t('简易版')}</Radio.Button>
            <Radio.Button value={GuideType.ADVANCED}>{t('进阶版')}</Radio.Button>
        </Radio.Group>
        
        {VersionMap[type]}
    </Spin>
}
