// import { Button, Collapse, Form, Input, Select, Switch } from 'antd'

import { Form } from 'antd'
import { IChartConfig, WidgetOption } from '../storage/widget_node'
import { useCallback, useEffect, useMemo } from 'react'
import { graph_config } from '../graph-config.js'

interface IProps { 
    widget: WidgetOption
    update_widget_config: (id: string, config: any) => void
}

export function GraphSetting (props: IProps) { 
    const { widget, update_widget_config } = props
    const [form] = Form.useForm<IChartConfig>()
    
    useEffect(() => {
        if (!widget.id)
            return
        else if (widget.config)
            form.setFieldsValue(widget.config)
        else
            update_widget_config(widget.id, form.getFieldsValue())
    }, [widget.id])
    
    
    const on_form_change = useCallback((_, values) => { 
        if (widget.id)
            update_widget_config(widget.id, values)
    }, [widget.id])
    
    
    const ConfigFormFields = useMemo(() => graph_config[widget.type].config, [widget])
   
    return <Form onValuesChange={on_form_change} form={form} labelCol={{ span: 6 }} labelAlign='left' colon={false}>
           {/* TODO: 通过source_id拿到data_source，取到列名，透传进去  */}
            <ConfigFormFields col_names={['Information_Analysis', 'forward_returns_1D', 'forward_returns_5D', 'forward_returns_10D']} />
        </Form>
}
