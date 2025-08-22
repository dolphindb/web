import { Radio, Result, Spin } from 'antd'
import { useId, useState } from 'react'

import useSWR from 'swr'

import { t } from '@i18n'


import { model, NodeType } from '../../model.js'

import finance_guide_code from '../finance.dos'
import iot_guide_code from '../iot.dos'

import './index.sass'



import { Unlogin } from '@/components/Unlogin.tsx'

import { GuideType } from './type.js'
import { SimpleVersion } from './SimpleVersion/index.js'
import { AdvancedVersion } from './AdvancedVersion/index.js'

const VersionMap = {
    [GuideType.SIMPLE]: <SimpleVersion />,
    [GuideType.ADVANCED]: <AdvancedVersion />
}

export function CreateGuide () { 
    const { logined, node_type } = model.use(['logined', 'node_type'])
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
        
    if (node_type === NodeType.controller)
        return <Result 
            className='warning-result' 
            status='warning' 
            title={t('控制节点不支持库表向导，请跳转到数据节点或计算节点查看。')} 
        />
    
    return <Spin spinning={isLoading}>
        <Radio.Group value={type} onChange={e => { set_type(e.target.value) }}>
            <Radio.Button value={GuideType.SIMPLE}>{t('简易版')}</Radio.Button>
            <Radio.Button value={GuideType.ADVANCED}>{t('进阶版')}</Radio.Button>
        </Radio.Group>
        
        {VersionMap[type]}
    </Spin>
}
