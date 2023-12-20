import './index.scss'
import { type ReactElement, useCallback, useMemo, useState, useEffect } from 'react'
import { t } from '../../../i18n/index.js'
import { Button, Space, Tooltip, message } from 'antd'

import { QueryDataView } from './components/QueryDataView.js'
import NiceModal from '@ebay/nice-modal-react'
import { ExportFileModal } from './components/ExportFileModal.js'
import { Editor } from '../Editor/index.js'
import { guide_query_model } from './model.js'

interface IProps { 
    database: string
    table: string
    set_footer: (footer: ReactElement) => void
}

export function SqlEditGuide (props: IProps) { 
    
    const { table, database, set_footer } = props
    
    const [current_step, set_current_step] = useState(0)
    const [total, set_total] = useState(0)
    
    const [code, set_code] = useState(guide_query_model.use(['code']).code ?? `SELECT * FROM loadTable("${database}", "${table}")`)
    
    
    const view_map = useMemo(() => { 
        return {
            0: <div className='query-code-editor'>
                <Editor
                    enter_completion
                    default_value={code}
                    theme='light'
                    on_change={code => {
                        set_code(code)
                        guide_query_model.set({ code })
                    }}
                />
            </div>,
            1: <QueryDataView code={code} set_total={set_total} />,
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
    }, [ code ])
    
    
    const primary_btn = useMemo(() => { 
        switch (current_step) { 
            case 0: 
                return <Button type='primary' onClick={on_preview_data}>{t('预览数据')}</Button>
            case 1:
                return total === 0 || total > 500000
                    ? <Tooltip title={total === 0 ? t('当前数据为空，暂不支持导出功能。') : t('当前数据量已达 50 万行，暂不支持导出功能。')}>
                        <Button type='primary' disabled onClick={async () => NiceModal.show(ExportFileModal, { code, table })}>
                            {t('导出数据')}
                        </Button>
                    </Tooltip>
                    : <Button type='primary' onClick={async () => NiceModal.show(ExportFileModal, { code, table })}>{t('导出数据')}</Button>
        }
    }, [to_next_step, code, table, total])
    
    useEffect(() => { 
        set_footer( <div className='btn-wrapper'>
            <Space>
                {current_step > 0 && <Button onClick={back}>{t('返回修改')}</Button> }
                {primary_btn}
            </Space>
        </div>)
    }, [back, primary_btn])
    
    return view_map[current_step]
    
}
