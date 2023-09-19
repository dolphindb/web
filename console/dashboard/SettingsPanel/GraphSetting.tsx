import { Form } from 'antd'
import { useCallback, useEffect, useMemo } from 'react'
import { graph_config } from '../graph-config.js'
import { dashboard } from '../model.js'
import { IChartConfig } from '../type.js'

export function GraphSetting () { 
    const { widget } = dashboard.use(['widget'])
    const [form] = Form.useForm<IChartConfig>()
    
    
    useEffect(() => {
        if (!widget.id)
            return
        // 已设置config，回显表单
        else if (widget.config)
            form.setFieldsValue(widget.config)
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
    
    
   
    return ConfigFormFields ? <Form onValuesChange={on_form_change} form={form} labelCol={{ span: 6 }} labelAlign='left' colon={false}>
           {/* TODO: 通过 source_id 拿到 data_source，取到列名，透传进去  */}
            <ConfigFormFields col_names={['Information_Analysis', 'forward_returns_1D', 'forward_returns_5D', 'forward_returns_10D']} />
        </Form> : <></>
}
