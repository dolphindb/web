import './index.scss'

import { Steps } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { type RecommendInfo, type AdvancedInfos } from '../type.js'
import { AdvancedFirstStep } from './AdvancedFirstStep.js'
import { AdvancedSecondStep } from './AdvancedSecondStep.js'
import { CodeViewStep } from '../components/CodeViewStep.js'

export function AdvancedVersion () {
    const [current_step, set_current_step] = useState(0)
    const [recommend_info, set_recommend_info] = useState<RecommendInfo>()
    
    const [info, set_info] = useState<AdvancedInfos>()
    const [code, set_code] = useState('')
    
    const back = useCallback(() => {
        set_current_step(current_step - 1)
    }, [current_step])
    
    const go = useCallback((info: AdvancedInfos, code?: string) => {
        set_info(prev => ({ ...prev, ...info }))
        if (code)
            set_code(code)
        set_current_step(current_step + 1)
     }, [current_step])
    
    const views = useMemo(() => { 
        return [
            {
                title: '第一步',
                children: <AdvancedFirstStep
                    go={go}
                    set_recommend_info={set_recommend_info}
                    info={info}
                />
            },
            {
                title: '第二步',
                children: <AdvancedSecondStep
                    back={back}
                    info={info}
                    recommend_info={recommend_info}
                    go={go}
                />
            },
            {
                title: '脚本预览',
                children: <CodeViewStep config={info} code={code} back={back} />
            }
        ]
    }, [go, back, recommend_info, info ])
    
    
    return <div className='advanced-version-wrapper'>
        <Steps current={current_step} className='guide-step' items={views} size='small'/>
        <div className='advanced-step-panel'>
            {views[current_step].children}
        </div>
    </div>    
}
