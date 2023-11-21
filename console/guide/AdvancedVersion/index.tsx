import './index.scss'

import { Steps, Typography } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { type RecommendInfo, type AdvancedInfos, ExecuteResult } from '../type.js'
import { AdvancedFirstStep } from './AdvancedFirstStep.js'
import { AdvancedSecondStep } from './AdvancedSecondStep.js'
import { CodeViewStep } from '../components/CodeViewStep.js'
import NiceModal from '@ebay/nice-modal-react'
import { UploadConfigModal } from '../components/UploadConfigModal.js'
import { GuideFailResultPage } from '../components/GuideFailResultPage.js'
import { GuideSuccessResultPage } from '../components/GuideSuccessResultPage.js'

export function AdvancedVersion () {
    const [current_step, set_current_step] = useState(0)
    const [recommend_info, set_recommend_info] = useState<RecommendInfo>({ hasAdvancedInfo: true })
    
    const [info, set_info] = useState<AdvancedInfos>()
    const [code, set_code] = useState('')
    
    const [result, set_result] = useState<ExecuteResult>(ExecuteResult.SUCCESS)
    
    const back = useCallback(() => {
        set_current_step(current_step - 1)
    }, [current_step])
    
    const go = useCallback((infos: { info: AdvancedInfos, code?: string, result?: ExecuteResult }) => {
        const { info, code, result } = infos
        set_info(prev => ({ ...prev, ...info }))
        if (code)
            set_code(code)
        set_current_step(current_step + 1)
        set_result(result)
    }, [current_step])
    
            
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: info => { set_info(info) } })
    }, [ ])
    
    const views = useMemo(() => { 
        const default_steps = [
            {
                title: '第一步',
                children: <AdvancedFirstStep
                    go={go}
                    set_recommend_info={set_recommend_info}
                    info={info}
                    recommend_info={recommend_info}
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
                children: <CodeViewStep go={go} config={info} code={code} back={back} />
            },
            {
                title: '执行结果',
                children: result === ExecuteResult.FAILED
                    ? <GuideFailResultPage  back={back}/>
                    : <GuideSuccessResultPage  back={back}/>
            }
        ]
        if (!recommend_info.hasAdvancedInfo)
            default_steps.splice(1, 1)
        return default_steps
    }, [go, back, recommend_info, info])
    
    
    return <div className='advanced-version-wrapper'>
        <Steps current={current_step} className='guide-step' items={views} size='small'/>
        <div className='apply-config-wrapper'>
            <Typography.Link onClick={on_apply_config} >应用配置</Typography.Link>
        </div>
        <div className='advanced-step-panel'>
            {views[current_step].children}
        </div>
    </div>    
}
