import './index.scss'
import { useCallback, useMemo, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { Button, Space, message } from 'antd'
import { request } from '../../guide/utils.js'

import { QueryDataView } from './components/QueryDataView.js'
import { Editor } from '../Editor/index.js'

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
    
    const download = useCallback(async () => { 
        const { csvContent } = await request<{ csvContent: string }>('executeQuery', { code })
        const link = document.createElement('a')
        link.href = 'data:application/vnd.ms-excel;charset=utf-8,\uFEFF' + encodeURIComponent(csvContent)
        link.download = `${table}.csv`
        link.click()
        link.remove()
    }, [code, table])
    
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
                return <Button type='primary' onClick={download}>{t('导出数据')}</Button>
        }
    }, [ download, to_next_step])
    
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
