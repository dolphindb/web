import './index.scss'
import { Steps, Typography } from 'antd'
import { useCallback, useMemo, useState } from 'react'

import NiceModal from '@ebay/nice-modal-react'

import { CodeViewStep } from '../../components/CodeViewStep.js'
import { ExecuteResult, type SimpleInfos } from '../type.js'
import { UploadConfigModal } from '../../components/UploadConfigModal.js'
import { GuideFailResultPage } from '../../components/GuideFailResultPage.js'
import { GuideSuccessResultPage } from '../../components/GuideSuccessResultPage.js'
import { t } from '@i18n'

import { SimpleFirstStep } from './SimpleFirstStep.js'


export function SimpleVersion () {
    const [current_step, set_current_step] = useState(0)
    
    const [info, set_info] = useState<SimpleInfos>()
    const [result, set_result] = useState<ExecuteResult>(ExecuteResult.SUCCESS)
    const [error_msg, set_error_msg] = useState<string>()   
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    
    const go = useCallback((infos: { info?: SimpleInfos, result?: ExecuteResult, error_msg?: any }) => { 
        const { info, result = ExecuteResult.SUCCESS, error_msg } = infos
        set_result(result)
        
        if (info)
            set_info(prev => ({ ...prev, ...info }))
        if (error_msg)
            set_error_msg(error_msg.toString())
        
        set_current_step(current_step + 1)
    }, [current_step])
    
    
    
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: info => { set_info(prev => ({ ...prev, ...info })) } })
    }, [ ])
    
    const on_create_again = useCallback(() => { 
        set_current_step(0)
        set_info({ })
    }, [ ])
    
    const views = useMemo(() => [
            {
                title: t('第一步'),
                children: <SimpleFirstStep
                    go={go}
                    info={info}
                />
            },
            {
                title: t('脚本预览'),
                children: <CodeViewStep
                    config={info}
                    code={info?.code ?? ''}
                    back={back}
                    go={go}
                />
            },
            {
                title: t('执行结果'),
                children: result === ExecuteResult.FAILED
                    ? <GuideFailResultPage error_msg={error_msg} on_create_again={on_create_again} back={back}/>
                    : <GuideSuccessResultPage database={info?.first?.dbName} table={info?.first?.tbName} on_create_again={on_create_again} back={back}/>
            }
        ], [ info, result, on_create_again, back, error_msg])
    
    
    return <div className='simple-version-wrapper'>
        <Steps current={current_step} className='guide-step' size='small' items={views}/>
        {
            (current_step === 0) && <div className='apply-config-wrapper'>
                <Typography.Link onClick={on_apply_config} >{t('导入配置')}</Typography.Link>
        </div>
        }
        {views[current_step].children}
    </div>
    
}
