import './index.scss'

import { Button, Popconfirm, Space } from 'antd'
import { useCallback } from 'react'

import NiceModal from '@ebay/nice-modal-react'

import { model } from '../../model.js'


import { ExecuteResult } from '../iot-guide/type.js'
import { ReadonlyEditor } from '../../components/ReadonlyEditor/index.js'
import { t } from '../../../i18n/index.js'

import { DownloadConfigModal } from './DownloadConfigModal.js'

interface IProps { 
    code: string
    back: () => void
    config: any
    go: (infos: any) => void
}

export function CodeViewStep (props: IProps) {
    const { code, back, config, go } = props
   
    const execute_code = useCallback(async () => { 
        try {
            await model.ddb.eval(code)
            go({ result: ExecuteResult.SUCCESS } )
        } catch (e) { 
            console.log(e)
            go({ result: ExecuteResult.FAILED, error_msg: e.toString() })         
        }
    }, [code, go])
    
    
    
    const on_download = useCallback(async () => 
        NiceModal.show(DownloadConfigModal, { config })
    , [config])
    
    
    return <div className='code-view-wrapper'>
        <ReadonlyEditor code={code} className='view-code-editor'/>
        
        <div className='button-group'>
            <Space>
                <Button onClick={on_download}>{t('导出表单配置')}</Button>
                <Button onClick={back}>{t('上一步')}</Button>
                <Popconfirm title={t('确认要执行当前建库脚本吗?')} onConfirm={execute_code}>
                    <Button type='primary'>{t('立即执行')}</Button>
                </Popconfirm>
            </Space>
        </div>
    </div>
 }
