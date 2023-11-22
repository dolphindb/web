import './index.scss'

import { Steps, Typography } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { DatabaseInfo } from './DatabaseInfo.js'
import { CodeViewStep } from '../components/CodeViewStep.js'
import { type IFinanceInfo } from './type.js'
import { TableInfo } from './TableInfo.js'
import { ExecuteResult } from '../iot-guide/type.js'
import { GuideFailResultPage } from '../components/GuideFailResultPage.js'
import { GuideSuccessResultPage } from '../components/GuideSuccessResultPage.js'
import { UploadConfigModal } from '../components/UploadConfigModal.js'
import NiceModal from '@ebay/nice-modal-react'

export function FinanceGuide () {
    
    const [current_step, set_current_step] = useState(0)
    const [info, set_info] = useState<IFinanceInfo>()
    const [result, set_result] = useState<ExecuteResult>(ExecuteResult.SUCCESS)
    
    const go = useCallback((info: IFinanceInfo & { result: ExecuteResult }) => {
        const { result, ...others } = info
        set_info(prev => ({ ...prev, ...others }))
        set_result(result)
        set_current_step(current_step + 1)
    }, [current_step])
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    const steps = useMemo(() => [ 
        {
            title: '建库信息',
            children: <DatabaseInfo info={info} go={go} />
        },
        {
            title: '建表信息',
            children: <TableInfo info={info} go={go} back={back} />
        },
        {
            title: '脚本预览',
            children: <CodeViewStep go={go} back={back} code={info?.code} config={info} />
        },
        {
            title: '执行结果',
            children: result === ExecuteResult.SUCCESS
                ? <GuideFailResultPage back={back} />
                : <GuideSuccessResultPage  back={back}/>
        }
    ], [info, go, back, result])
    
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: info => { set_info(prev => ({ ...prev, ...info })) } })
    }, [ ])
    
    return <div className='finance-guide-wrapper'>
        <Steps size='small' className='finance-guide-steps' items={steps} current={current_step} />
        <div className='apply-config-btn-wrapper'>
            <Typography.Link onClick={on_apply_config}>应用配置</Typography.Link>
        </div>
        <div className='finance-guide-content'>
            { steps[current_step].children }
        </div>
    </div>    
}
