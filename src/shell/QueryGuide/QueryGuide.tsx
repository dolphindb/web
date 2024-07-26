import { type ReactElement, useCallback, useMemo, useState, useEffect } from 'react'

import { Button, Form, Space, Tooltip } from 'antd'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '../../../i18n/index.js'

import { request } from '../../guide/utils.js'

import { ReadonlyEditor } from '../../components/ReadonlyEditor/index.js'

import { QueryForm } from './components/QueryForm.js'



import { type IQueryInfos } from './type.js'
import { transform_query } from './utils.js'


import { QueryDataView } from './components/QueryDataView.js'


import { ExportFileModal } from './components/ExportFileModal.js'
import { guide_query_model } from './model.js'

interface IProps { 
    database: string
    table: string
    set_footer: (val: ReactElement) => void
}

export function QueryGuide (props: IProps) { 
    
    const { table, database, set_footer } = props
    
    const [current_step, set_current_step] = useState(0)
    const [code, set_code] = useState('')
    const [total, set_total] = useState(0)
    
    const [form] = Form.useForm<IQueryInfos>()
    
    const view_map = useMemo(() => { 
        return {
            0: <QueryForm {...props} form={form} />,
            1: <ReadonlyEditor code={code} className='query-code-view' />,
            2: <QueryDataView set_total={set_total} code={code} />
        }
    }, [code])
    
    const to_next_step = useCallback(() => { 
        set_current_step(current_step + 1)
    }, [current_step])
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    
    
    const get_query_code = useCallback(async () => { 
        try {
            const values = await form.validateFields()
            const params: IQueryInfos = {
                ...values,
                querys: values.querys?.map(transform_query),
                partitionColQuerys: transform_query(values.partitionColQuerys ?? [ ])
            }
            const { code } = await request<{ code: string }>('dbms_generateQuery', { ...params, dbName: database, tbName: table })
            set_code(code)
            to_next_step()
        } catch { }
    }, [to_next_step, database, table])
   
    
    const primary_btn = useMemo(() => { 
        switch (current_step) { 
            case 0: 
                return <Button type='primary' onClick={get_query_code}>{t('查看 SQL 语句')}</Button>
            case 1: 
                return <Button type='primary' onClick={to_next_step}>{t('预览数据')}</Button>
            case 2:
                return total === 0 || total > 500000 ?
                    <Tooltip title={total === 0  ? t('当前数据为空，暂不支持导出功能。') : t('当前数据量已达 50 万行，暂不支持导出功能。')}>
                        <Button type='primary' disabled onClick={async () => NiceModal.show(ExportFileModal, { code, table })}>
                            {t('导出数据')}
                        </Button>
                    </Tooltip>
                    : <Button type='primary' onClick={async () => NiceModal.show(ExportFileModal, { code, table })}>{t('导出数据')}</Button>
        }
    }, [get_query_code, code, table, to_next_step, total])
    
    useEffect(() => { 
        set_footer(
            <div className='btn-wrapper'>
            <Space>
                {current_step === 0 &&
                    <Button
                        onClick={() => {
                            guide_query_model.set({ query_values: undefined })
                            form.resetFields()
                        }}
                >
                    {t('重置条件')}
                </Button>}
                {current_step > 0 && <Button onClick={back}>{t('返回修改')}</Button> }
                {primary_btn}
            </Space>
        </div>  
        )
    }, [primary_btn, current_step, back])
    
    return view_map[current_step]
}
