import { Button, Form, Popconfirm, Typography } from 'antd'
import { useCallback, useEffect } from 'react'

import { UndoOutlined } from '@ant-design/icons'

import { language, t } from '@i18n'

import { graphs } from '@/dashboard/graphs.ts'
import { dashboard } from '@/dashboard/model.ts'
import { get_data_source } from '@/dashboard/DataSource/date-source.ts'

export function GraphSetting () { 
    const { widget } = dashboard.use(['widget'])
    
    const data_source = get_data_source(widget.source_id?.[0])
    
    data_source.use(['cols', 'data', 'type_map'])
    
    const [form] = Form.useForm()
    
    
    const on_reset_config = useCallback(() => { 
        form.resetFields()
        dashboard.update_widget({ ...widget, config: form.getFieldsValue(true) })
    }, [widget.id])
    
    useEffect(() => {
        if (!widget.id)
            return
        // 已设置config，回显表单
        else if (widget.config) { 
            form.resetFields()
            form.setFieldsValue(widget.config)
        }
        // 未设置config的时候需要重置表单，将表单的初始值作为图的config
        else
            on_reset_config()
    }, [widget.id, on_reset_config])
    
    
    const Config = graphs[widget.type]?.config
    
    
    return Config && <>
        <Form
            onValuesChange={(_, values) => {
                if (widget)
                    dashboard.update_widget({ ...widget, config: values })
            }}
            form={form}
            labelCol={{ span: language === 'zh' ? 10 : 12 }}
            colon={false}
            className='graph-setting-form'
        >
            <Config widget={widget} data_source={data_source} form={form} />
        </Form>
        
        <Popconfirm title={t('确定要重置配置吗？')} onConfirm={on_reset_config}>
            <Button icon={<UndoOutlined />} className='reset-config-btn'>
                {t('重置配置')}
            </Button>
        </Popconfirm>
        
        <div className='reset-tip'>
            <Typography.Text type='secondary'>
                {t('配置表单与数据源结构相关，如修改数据源结构，建议重置表单以适应最新结构')}
            </Typography.Text>
        </div>  
    </>
}
