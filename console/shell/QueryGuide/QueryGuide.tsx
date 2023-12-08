import { QueryForm } from './components/QueryForm.js'
import { useCallback, useMemo, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { Button, Form, Space, Tooltip } from 'antd'
import { request } from '../../guide/utils.js'
import { type IQueryInfos } from './type.js'
import { transform_query } from './utils.js'
import { ReadonlyEditor } from '../../components/ReadonlyEditor/index.js'
import { QueryDataView } from './components/QueryDataView.js'
import NiceModal from '@ebay/nice-modal-react'
import { ExportFileModal } from './components/ExportFileModal.js'

interface IProps { 
    database: string
    table: string
}

export function QueryGuide (props: IProps) { 
    
    const { table, database } = props
    
    const [current_step, set_current_step] = useState(0)
    const [query_info, set_query_info] = useState<IQueryInfos>()
    const [code, set_code] = useState('')
    const [disable_export, set_disable_export] = useState(false)
    
    const [form] = Form.useForm<IQueryInfos>()
    
    const view_map = useMemo(() => { 
        return {
            0: <QueryForm {...props} form={form} initial_values={query_info} />,
            1: <ReadonlyEditor code={code} className='query-code-view' />,
            2: <QueryDataView set_disable_export={set_disable_export} code={code} />
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
            await form.validateFields()
            const values = form.getFieldsValue()
            const params: IQueryInfos = {
                ...values,
                querys: values.querys?.map(transform_query),
                partitionColQuerys: transform_query(values.partitionColQuerys ?? [ ])
            }
            const { code } = await request<{ code: string }>('generateQuery', { ...params, dbName: database, tbName: table })
            set_query_info(values)
            set_code(code)
            to_next_step()
        } catch { }
    }, [to_next_step, database, table])
   
    
    const primary_btn = useMemo(() => { 
        switch (current_step) { 
            case 0: 
                return <Button type='primary' onClick={get_query_code}>{t('下一步')}</Button>
            case 1: 
                return <Button type='primary' onClick={to_next_step}>{t('预览数据')}</Button>
            case 2:
                return disable_export ?
                    <Tooltip title={t('总数据量小于 50 万才能使用导出数据功能')}>
                        <Button type='primary' disabled onClick={async () => NiceModal.show(ExportFileModal, { code, table })}>
                            {t('导出数据')}
                        </Button>
                    </Tooltip>
                    : <Button type='primary' onClick={async () => NiceModal.show(ExportFileModal, { code, table })}>{t('导出数据')}</Button>
        }
    }, [ get_query_code, code, table, to_next_step, disable_export])
    
    return <>
      
        {view_map[current_step]}
        <div className='btn-wrapper'>
            <Space>
                {current_step === 0 && <Button onClick={() => { form.resetFields() }}>{t('重置')}</Button>}
                {current_step > 0 && <Button onClick={back}>{t('上一步')}</Button> }
                {primary_btn}
            </Space>
        </div>
    </>
}
