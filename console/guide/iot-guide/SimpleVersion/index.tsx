import './index.scss'
import { Steps, Typography } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { ExecuteResult, type SimpleInfos } from '../type.js'
import { CodeViewStep } from '../../components/CodeViewStep.js'
import { SimpleFirstStep } from './SimpleFirstStep.js'
import NiceModal from '@ebay/nice-modal-react'
import { UploadConfigModal } from '../../components/UploadConfigModal.js'
import { GuideFailResultPage } from '../../components/GuideFailResultPage.js'
import { GuideSuccessResultPage } from '../../components/GuideSuccessResultPage.js'


export function SimpleVersion () {
    const [current_step, set_current_step] = useState(0)
    
    const [info, set_info] = useState<SimpleInfos>()
    const [result, set_result] = useState<ExecuteResult>(ExecuteResult.SUCCESS)
    
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    
    const go = useCallback((infos: { info?: SimpleInfos, result?: ExecuteResult }) => { 
        const { info, result = ExecuteResult.SUCCESS } = infos
        set_current_step(current_step + 1)
        if (info)
            set_info(prev => ({ ...prev, ...info }))
        set_result(result)
    }, [current_step])
    
    
    
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: info => { set_info(prev => ({ ...prev, ...info })) } })
    }, [ ])
    
    const on_create_again = useCallback(() => { 
        set_current_step(0)
        set_info({ })
    }, [ ])
    
    const views = useMemo(() => {
        return [
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
                    code={info?.code ?? ''}
                    back={back}
                    go={go}
                />
            },
            {
                title: '执行结果',
                children: result === ExecuteResult.FAILED
                    ? <GuideFailResultPage on_create_again={on_create_again} back={back}/>
                    : <GuideSuccessResultPage on_create_again={on_create_again} back={back}/>
            }
        ]
    }, [ info, result, on_create_again, back])
    
    
    return <div className='simple-version-wrapper'>
        <Steps current={current_step} className='guide-step' size='small' items={views}/>
        {
            (current_step === 0) && <div className='apply-config-wrapper'>
            <Typography.Link onClick={on_apply_config} >导入配置</Typography.Link>
        </div>
        }
        {views[current_step].children}
    </div>
    
}
