import { Button, Form, Popconfirm, Typography } from 'antd'
import { useCallback, useEffect, useMemo } from 'react'

import { UndoOutlined } from '@ant-design/icons'

import { graph_config } from '../graph-config.js'
import { dashboard } from '../model.js'
import { get_data_source } from '../DataSource/date-source.js'
import { language, t } from '../../../i18n/index.js'

export function GraphSetting () { 
    const { widget } = dashboard.use(['widget'])
    const data_source_node = get_data_source(widget.source_id?.[0])
    const { cols = [ ], data: data_source = [ ], type_map } = data_source_node?.use(['cols', 'data', 'type_map'])
    
    const [form] = Form.useForm()
    
    
    const on_reset_config = useCallback(() => { 
        form.resetFields()
        dashboard.update_widget({ ...widget, config: form.getFieldsValue() })
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
    
    
    
    
    const on_form_change = useCallback((_, values) => {  
        if (widget)
            dashboard.update_widget({ ...widget, config: values })
    }, [widget])
    
    
    const ConfigFormFields = useMemo(() => graph_config[widget.type]?.config, [widget.type])
    
   
    return ConfigFormFields && <>
        <Form
            onValuesChange={on_form_change}
            form={form}
            labelCol={{ span: language === 'zh' ? 10 : 12 }}
            colon={false}
            className='graph-setting-form'
        >
            <ConfigFormFields col_names={cols} data_source={data_source} type_map={type_map} />
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
