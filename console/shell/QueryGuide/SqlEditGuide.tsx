import './index.scss'
import { useCallback, useMemo, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { Button, Form, Space } from 'antd'
import { request } from '../../guide/utils.js'

interface IProps { 
    database: string
    table: string
}

export function SqlEditGuide (props: IProps) { 
    
    const { table } = props
    
    const [current_step, set_current_step] = useState(0)
    const [code, set_code] = useState('')
    
    // const view_map = useMemo(() => { 
    //     return {
    //         0: <Editor on_change={code => { set_code(code) }}/>,
    //         1: <QueryDataView code={code} />,
    //     }
    // }, [code])
    
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
    
    const primary_btn = useMemo(() => { 
        switch (current_step) { 
            case 0: 
                return <Button type='primary' onClick={to_next_step}>{t('下一步')}</Button>
            case 1:
                return <Button type='primary' onClick={download}>{t('导出数据')}</Button>
        }
    }, [ download, to_next_step])
    
    return <>
        {/* {view_map[current_step]} */}
        <div className='btn-wrapper'>
            <Space>
                {current_step > 0 && <Button onClick={back}>{t('上一步')}</Button> }
                {primary_btn}
            </Space>
        </div>
    </>
}
