import './index.scss'

import { Result, Spin, Steps, Typography } from 'antd'
import { useCallback, useId, useMemo, useState } from 'react'
import NiceModal from '@ebay/nice-modal-react'
import useSWR from 'swr'

import { t } from '@i18n'
import { model, NodeType } from '@model'
import { Unlogin } from '@components/Unlogin.tsx'
import { CodeViewStep } from '@/guide/components/CodeViewStep.tsx'
import { ExecuteResult } from '@/guide/iot-guide/type.ts'
import { GuideFailResultPage } from '@/guide/components/GuideFailResultPage.tsx'
import { GuideSuccessResultPage } from '@/guide/components/GuideSuccessResultPage.tsx'
import { UploadConfigModal } from '@/guide/components/UploadConfigModal.tsx'
import finance_guide_code from '@/guide/finance.dos'
import iot_guide_code from '@/guide/iot.dos'

import { TableInfo } from './TableInfo.tsx'
import { type IFinanceInfo } from './type.ts'
import { DatabaseInfo } from './DatabaseInfo.tsx'


export function FinanceGuide () {
    const { logined, node_type } = model.use(['logined', 'node_type'])
    
    const [current_step, set_current_step] = useState(0)
    const [info, set_info] = useState<IFinanceInfo>()
    const [result, set_result] = useState<ExecuteResult>(ExecuteResult.SUCCESS)
    const [error_msg, set_error_msg] = useState<string>()
    
    const id = useId()
    
    
    const { isLoading } = useSWR(
        ['load_finance_guide_code', id],
        async () => {
            await model.ddb.eval(finance_guide_code)
            await model.ddb.eval(iot_guide_code)
        }
    )
    
    const go = useCallback((info: IFinanceInfo & { result: ExecuteResult, error_msg?: string }) => {
        const { result, error_msg, ...others } = info
        set_info(prev => ({ ...prev, ...others }))
        set_result(result)
        if (error_msg)
            set_error_msg(error_msg.toString())
        // 到下一步
        set_current_step(current_step + 1)
    }, [current_step])
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    const on_create_again = useCallback(() => { 
        set_current_step(0)
        set_info({ })
    }, [ ])
    
    const steps = useMemo(() => [ 
        {
            title: t('建库信息'),
            children: <DatabaseInfo info={info} go={go} />
        },
        {
            title: t('建表信息'),
            children: <TableInfo info={info} go={go} back={back} />
        },
        {
            title: t('脚本预览'),
            children: <CodeViewStep go={go} back={back} code={info?.code} config={info} />
        },
        {
            title: t('执行结果'),
            children: result === ExecuteResult.FAILED
                ? <GuideFailResultPage error_msg={error_msg} on_create_again={on_create_again} back={back} />
                : <GuideSuccessResultPage database={info?.database?.name} table={info?.table?.name} on_create_again={on_create_again}  back={back}/>
        }
    ], [info, go, back, result, on_create_again, error_msg])
    
    const on_apply_config = useCallback(() => { 
        NiceModal.show(UploadConfigModal, { apply: info => { set_info(prev => ({ ...prev, ...info })) } })
    }, [ ])
    
    
    if (!logined)
        return <Unlogin info={t('金融库表向导')} />
    if (node_type === NodeType.controller)
        return <Result 
            className='warning-result' 
            status='warning' 
            title={t('控制节点不支持库表向导，请跳转到数据节点或计算节点查看。')} 
        />
    
    return <Spin spinning={isLoading}>
        <div className='finance-guide-wrapper'>
        <Steps size='small' className='finance-guide-steps' items={steps} current={current_step} />
        { (current_step === 0) &&  <div className='apply-config-btn-wrapper'>
            <Typography.Link onClick={on_apply_config}>{t('导入配置')}</Typography.Link>
        </div>}
        <div className='finance-guide-content'>
            { steps[current_step].children }
        </div>
    </div>    
    </Spin>
}
