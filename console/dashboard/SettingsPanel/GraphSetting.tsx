// import { Button, Collapse, Form, Input, Select, Switch } from 'antd'

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
        else if (widget.config)
            form.setFieldsValue(widget.config)
        else { 
            form.resetFields()
            dashboard.update_widget({ ...widget, config: form.getFieldsValue() })
        }
            
    }, [ widget.id ])
    
    
    const on_form_change = useCallback((_, values) => { 
        if (widget.id)
            dashboard.update_widget({ ...widget, config: values })
    }, [widget.id])
    
    const ConfigFormFields = useMemo(() => graph_config[widget.type].config, [widget.type])
   
    return <Form onValuesChange={on_form_change} form={form} labelCol={{ span: 6 }} labelAlign='left' colon={false}>
           {/* TODO: 通过source_id拿到data_source，取到列名，透传进去  */}
            <ConfigFormFields col_names={['Information_Analysis', 'forward_returns_1D', 'forward_returns_5D', 'forward_returns_10D']} />
        </Form>
}
