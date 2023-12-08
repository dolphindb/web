import './index.scss'
import { useCallback, useMemo, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { Button, Space, message } from 'antd'

import { QueryDataView } from './components/QueryDataView.js'
import { Editor } from '../Editor/index.js'
import NiceModal from '@ebay/nice-modal-react'
import { ExportFileModal } from './components/ExportFileModal.js'

interface IProps { 
    database: string
    table: string
}

export function SqlEditGuide (props: IProps) { 
    
    const { table, database } = props
    
    const [current_step, set_current_step] = useState(0)
    const [code, set_code] = useState(`SELECT * FROM loadTable("${database}", "${table}")`)
    
    const view_map = useMemo(() => { 
        return {
            0: <div className='query-code-editor'>
                <Editor value={code} on_change={code => { set_code(code) }}/>
            </div>,
            1: <QueryDataView code={code} />,
        }
    }, [code])
    
    const to_next_step = useCallback(() => { 
        set_current_step(current_step + 1)
    }, [current_step])
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    const on_preview_data = useCallback(() => { 
        if (!code)  
            message.error(t('请编辑代码'))
         else
            to_next_step()
    }, [ ])
    
    const primary_btn = useMemo(() => { 
        switch (current_step) { 
            case 0: 
                return <Button type='primary' onClick={on_preview_data}>{t('下一步')}</Button>
            case 1:
                return <Button type='primary' onClick={async () => NiceModal.show(ExportFileModal, { code, table })}>{t('导出数据')}</Button>
        }
    }, [ to_next_step, code, table])
    
    return <>
        {view_map[current_step]}
        <div className='btn-wrapper'>
            <Space>
                {current_step > 0 && <Button onClick={back}>{t('上一步')}</Button> }
                {primary_btn}
            </Space>
        </div>
    </>
}
