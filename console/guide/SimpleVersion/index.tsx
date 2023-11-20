import './index.scss'
import { Steps, Typography } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { type SimpleInfos } from '../type.js'
import { CodeViewStep } from '../components/CodeViewStep.js'
import { SimpleFirstStep } from './SimpleFirstStep.js'
import NiceModal from '@ebay/nice-modal-react'
import { UploadConfigModal } from '../components/UploadConfigModal.js'



export function SimpleVersion () {
    const [current_step, set_current_step] = useState(0)
    const [code, set_code] = useState('xxx')
    
    const [info, set_info] = useState<SimpleInfos>()
    
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    
    const go = useCallback((info: SimpleInfos, code?: string) => { 
        set_current_step(current_step + 1)
        set_info(prev => ({ ...prev, ...info }))
        set_code(code)
    }, [current_step])
    
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: info => { set_info(info) } })
    }, [ ])
    
    const views = useMemo(() => {
        const steps = [
            {
                title: '第一步',
                children: <SimpleFirstStep
                    go={go}
                    info={info}
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
        return steps
    }, [current_step, info])
    
    
    return <div className='simple-version-wrapper'>
        <Steps current={current_step} className='guide-step' size='small' items={views}/>
        {
            (current_step !== views.length - 1) && <div className='apply-config-wrapper'>
            <Typography.Link onClick={on_apply_config} >应用配置</Typography.Link>
        </div>
        }
        {views[current_step].children}
    </div>
    
}
