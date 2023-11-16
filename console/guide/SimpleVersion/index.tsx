import './index.scss'
import { Steps, Typography } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { type SimpleInfos, type RecommendInfo } from '../type.js'
import { SecondStep } from './SecondStep.js'
import { CodeViewStep } from '../components/CodeViewStep.js'
import { SimpleFirstStep } from './SimpleFirstStep.js'
import NiceModal from '@ebay/nice-modal-react'
import { UploadConfigModal } from '../components/UploadConfigModal.js'



export function SimpleVersion () {
    const [current_step, set_current_step] = useState(0)
    const [recommend_info, set_recommend_info] = useState<RecommendInfo>({ otherSortKeys: { show: true } })
    const [code, set_code] = useState('xxx')
    
    const [info, set_info] = useState<SimpleInfos>()
    
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    
    const go = useCallback((info: SimpleInfos) => { 
        set_current_step(current_step + 1)
        set_info(prev => ({ ...prev, ...info }))
    }, [current_step])
    
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: () => { } })
    }, [ ])
    
    const views = useMemo(() => {
        const steps = [
            {
                title: '第一步',
                children: <SimpleFirstStep
                    set_recommend_info={set_recommend_info}
                    go={go}
                    info={info}
                />
            },
            {
            
                title: '第二步',
                children: <SecondStep  
                    back={back}
                    max={recommend_info.otherSortKeys.max}
                    info={info}
                    go={go}
                    set_code={set_code}
                />
            },
            {
            
                title: '脚本预览',
                children: <CodeViewStep
                    config={info}
                    code={code}
                    back={back}
                />
            }
        ]
        
        if (recommend_info.otherSortKeys.show)  
            return steps
        else
            return [steps[0], steps[2]]
       
    }, [current_step, recommend_info.otherSortKeys.show, info])
    
    
    return <div className='simple-version-wrapper'>
        <Steps current={current_step} className='guide-step' size='small' items={views}/>
        <div className='apply-config-wrapper'>
            <Typography.Link onClick={on_apply_config}>应用配置</Typography.Link>
        </div>
        {views[current_step].children}
    </div>
    
}
