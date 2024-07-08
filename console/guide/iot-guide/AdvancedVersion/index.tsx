import './index.scss'

import { Steps, Typography } from 'antd'
import { useCallback, useMemo, useState } from 'react'

import NiceModal from '@ebay/nice-modal-react'

import { CodeViewStep } from '../../components/CodeViewStep.js'
import { type RecommendInfo, type AdvancedInfos, ExecuteResult } from '../type.js'
import { UploadConfigModal } from '../../components/UploadConfigModal.js'
import { GuideFailResultPage } from '../../components/GuideFailResultPage.js'
import { GuideSuccessResultPage } from '../../components/GuideSuccessResultPage.js'
import { t } from '../../../../i18n/index.js'

import { AdvancedSecondStep } from './AdvancedSecondStep.js'
import { AdvancedFirstStep } from './AdvancedFirstStep.js'

export function AdvancedVersion () {
    const [current_step, set_current_step] = useState(0)
    const [recommend_info, set_recommend_info] = useState<RecommendInfo>({ hasAdvancedInfo: true })
    
    const [info, set_info] = useState<AdvancedInfos>()
    
    const [result, set_result] = useState<ExecuteResult>(ExecuteResult.SUCCESS)
    
    const [error_msg, set_error_msg] = useState<string>()
    
    const back = useCallback(() => {
        set_current_step(current_step - 1)
    }, [current_step])
    
    const update_info = useCallback((info: AdvancedInfos) => {
        set_info(prev => ({ ...prev, ...info }))
    }, [ ])
    
    const go = useCallback((infos: AdvancedInfos & { result?: ExecuteResult, error_msg?: string }) => {
        const { result, error_msg, ...info } = infos
        update_info(info)
        set_result(result)
        if (error_msg)
            set_error_msg(error_msg.toString())
        
        set_current_step(current_step + 1)
    }, [current_step, update_info])
    
            
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: info => { set_info(info) } })
    }, [ ])
    
    const on_create_again = useCallback(() => { 
        set_current_step(0)
        set_info({ })
        set_recommend_info({ hasAdvancedInfo: true })
    }, [ ])
    
    
    
    const views = useMemo(() => { 
        const default_steps = [
            {
                title: t('第一步'),
                children: <AdvancedFirstStep
                    go={go}
                    set_recommend_info={set_recommend_info}
                    info={info}
                    recommend_info={recommend_info}
                />
            },
            {
                title: t('第二步'),
                children: <AdvancedSecondStep
                    back={back}
                    info={info}
                    recommend_info={recommend_info}
                    go={go}
                    update_info={update_info}
                />
            },
            {
                title: t('脚本预览'),
                children: <CodeViewStep
                    go={go}
                    config={info}
                    code={info?.code}
                    back={back}
                />
            },
            {
                title: t('执行结果'),
                children: result === ExecuteResult.FAILED
                    ? <GuideFailResultPage error_msg={error_msg} on_create_again={on_create_again}  back={back}/>
                    : <GuideSuccessResultPage database={info?.first?.dbName} table={info?.first?.tbName} on_create_again={on_create_again}  back={back}/>
            }
        ]
        // 没有高阶信息去除第二步
        if (!recommend_info.hasAdvancedInfo)
            default_steps.splice(1, 1)
        return default_steps
    }, [go, back, recommend_info, info, result, error_msg])
    
    
    return <div className='advanced-version-wrapper'>
        <Steps current={current_step} className='guide-step' items={views} size='small'/>
        {
            (current_step === 0) && <div className='apply-config-wrapper'>
                <Typography.Link onClick={on_apply_config} >{t('导入配置')}</Typography.Link>
            </div>
        }
        <div className='advanced-step-panel'>
            {views[current_step].children}
        </div>
    </div>    
}
