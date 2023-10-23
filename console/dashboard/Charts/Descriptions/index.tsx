import './index.scss'

import { Collapse, Descriptions, type DescriptionsProps, Form, InputNumber, Select, type CollapseProps, Input, Checkbox } from 'antd'
import { type Widget } from '../../model.js'
import { convert_list_to_options, format_number, format_time, parse_text } from '../../utils.js'


import { useMemo } from 'react'
import { type IDescriptionsConfig } from '../../type.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { format_time_options } from '../../ChartFormFields/constant.js'
import { t } from '../../../../i18n/index.js'


interface IProps { 
    widget: Widget
    data_source: any[]
}

export function DBDescriptions (props: IProps) {
    const { data_source = [ ], widget } = props
    const config = useMemo(() => widget.config as unknown as IDescriptionsConfig, [widget.config])
    
    
    const items = useMemo<DescriptionsProps['items']>(() => { 
        const { col_properties } = config
       
        return data_source.map((item, idx) => {
            const { color: custom_color, threshold, time_format, decimal_places, is_thousandth_place } = col_properties?.[idx] ?? { }
            let color = '#fff'
            if (threshold || threshold === 0)
                color = item[config.value_col] > threshold ? 'red' : 'green'
            color = custom_color ?? color
            
            let value = item[config.value_col]
            if (time_format)
                value = format_time(value, time_format)
            else
                value = format_number(value, decimal_places, is_thousandth_place)
            
            return {
                key: idx,
                label: item[config.label_col],
                children: value,
                labelStyle: { fontSize: config.label_font_size },
                contentStyle: {
                    fontWeight: 500,
                    color: color,
                    fontSize: config.value_font_size
                }
            }
            
        })
    }, [config, data_source])
    
    
    return <>
    
        {/* {  config.with_select && <Checkbox.Group
            onChange={ val => { set_selected_cols(val) }  }
            value={selected_cols}
            options={convert_list_to_options(data_source.map(item => item[config.label_col]))}
            className='table-radio-group' /> } */}
        
        <Descriptions
            colon={false}
            className='my-descriptions'
            layout='vertical'
            title={<div style={{ fontSize: config.title_size }}>{parse_text(config.title ?? '')}</div>}
            items={items}
            column={config.column_num}
        />
    </>
}

export function DBDescriptionsForm ({ col_names, data_source = [ ] }: { col_names: string[], data_source?: any[] }) { 

    const ColSetting = <div className='description-setting-form'>
        <Form.Item name='label_col' label='标签列' initialValue={col_names[0]}>
            <Select options={convert_list_to_options(col_names)} />
        </Form.Item>
        <Form.Item name='value_col' label='值列' initialValue={col_names[0]}>
            <Select options={convert_list_to_options(col_names)} />
        </Form.Item>
        
        <Form.Item name='label_font_size' label='标签字号'>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        
        <Form.Item name='value_font_size' label='值字号'>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        
        
        
        <Form.Item name='column_num' label='每行展示数量' initialValue={4}>
            <InputNumber />
        </Form.Item>
        <FormDependencies dependencies={['label_col']}>
            {({ label_col }) => { 
                if (!label_col)
                    return null
                return <Form.List name='col_properties' initialValue={data_source.map(item => ({ label: item[label_col] }))}>
                    {fields => { 
                        const labels = data_source.map(item => (item[label_col]))
                        
                        const items: CollapseProps['items'] = fields.map((field, idx) => ({
                            key: idx,
                            label: labels[field.name],
                            forceRender: true,
                            children: <>
                                <Form.Item name={[field.name, 'label']} hidden>
                                    <Input />
                                </Form.Item>
                                <Form.Item name={[field.name, 'color']} label='值颜色'>
                                    <StringColorPicker />
                                </Form.Item>
                                <Form.Item name={[field.name, 'threshold']} label='阈值'>
                                    <InputNumber />
                                </Form.Item>
                                <Form.Item label={t('时间格式化')} name={ [field.name, 'time_format']}>
                                    <Select options={format_time_options} allowClear/>
                                </Form.Item>
                            
                                <Form.Item label={t('小数位数')} name={[field.name, 'decimal_places']} >
                                    <InputNumber min={0} />
                                </Form.Item>
                                <Form.Item label='是否千分位' name={ [field.name, 'is_thousandth_place']} initialValue={false}>
                                    <BoolRadioGroup />
                                </Form.Item>
                               
                            </>,
                        }))
                        
                        return <Collapse items={items} size='small'/>
                    }}
                </Form.List>
            } }
        </FormDependencies>
    </div>
    
    return <>
        <BasicFormFields type='description'/>
        <Collapse items={[{
            children: ColSetting,
            key: 'col',
            label: '列属性',
            forceRender: true
        }]}/>
    </>
}
