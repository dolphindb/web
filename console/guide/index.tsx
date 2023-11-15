import { Radio, Tabs, type TabsProps } from 'antd'
import { useMemo, useState } from 'react'
import { GuideType } from './type.js'
import { SimpleVersion } from './SimpleVersion/index.js'

const VersionMap = {
    [GuideType.SIMPLE]: <SimpleVersion />
}

export function CreateGuide () { 
    
    const [type, set_type] = useState(GuideType.SIMPLE)
    
    return <>
        <Radio.Group value={type} onChange={e => { set_type(e.target.value) }}>
            <Radio.Button value={GuideType.SIMPLE}>简易版</Radio.Button>
            <Radio.Button value={GuideType.ADVANCED}>进阶版</Radio.Button>
        </Radio.Group>
        
        {VersionMap[type]}
    </>
}
