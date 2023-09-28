import { Form } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { graph_config } from '../graph-config.js'
import { dashboard } from '../model.js'
import { get_data_source } from '../DataSource/date-source.js'

export function GraphSetting () { 
    const { widget } = dashboard.use(['widget'])
    const data_source_node = get_data_source(widget.source_id)
    const { cols = [ ], data: data_source = [ ] } = data_source_node?.use(['cols', 'data'])
    
    const [form] = Form.useForm()
    
    useEffect(() => {
        if (!widget.id)
            return
        // 已设置config，回显表单
        else if (widget.config) { 
            form.resetFields()
            form.setFieldsValue(widget.config)
        }
        // 未设置config的时候需要重置表单，将表单的初始值作为图的config
        else { 
            form.resetFields()
            dashboard.update_widget({ ...widget, config: form.getFieldsValue() })
        }
           
    }, [ widget.id ])
    
    
    const on_form_change = useCallback((_, values) => { 
        if (widget)
            dashboard.update_widget({ ...widget, config: values })
    }, [widget])
    
    
    const ConfigFormFields = useMemo(() => graph_config[widget.type]?.config, [widget.type])
    
   
    return ConfigFormFields && <Form
            onValuesChange={on_form_change}
            form={form}
            labelCol={{ span: 8 }}
            labelAlign='left'
            colon={false}
            className='graph-setting-form'
        >
            <ConfigFormFields col_names={cols} data_source={data_source} />
        </Form>
}
