import './index.scss'

import { Button, Collapse, Descriptions, type DescriptionsProps, Divider, Form, InputNumber, Select, Space } from 'antd'
import { type Widget } from '../../model.js'
import { convert_list_to_options } from '../../utils.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { useMemo } from 'react'
import { type IDescriptionsConfig } from '../../type.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'

interface IProps { 
    widget: Widget
    data_source: any[]
}

export function DBDescriptions (props: IProps) {
    const { data_source = [ ], widget } = props
    
    const config = useMemo(() => widget.config as IDescriptionsConfig, [widget.config])
    
    const items = useMemo<DescriptionsProps['items']>(() => { 
        return data_source.map((item, idx) => {
            let color = '#fff'
            if (config.threshold)
                color = item[config.value_col] > config.threshold ? 'red' : 'green'
            color = config.value_colors.find(color => color?.col === item[config.label_col])?.color ?? color
            
            return {
                key: idx,
                label: item[config.label_col],
                children: item[config.value_col],
                labelStyle: { fontSize: config.label_font_size },
                contentStyle: {
                    fontWeight: 500,
                    color,
                    fontSize: config.value_font_size
                }
            }
            
        })
    }, [config, data_source])
    
    
    
    return <Descriptions
        colon={false}
        className='my-descriptions'
        layout='vertical'
        title={<div style={{ fontSize: config.title_size }}>{config.title}</div>}
        items={items}
        column={config.column_num}
    />
}

export function DBDescriptionsForm ({ col_names, data_source = [ ] }: { col_names: string[], data_source?: any[] }) { 
    const ColSetting = <>
        <Form.Item name='label_col' label='标签列' initialValue={col_names[0]}>
            <Select options={convert_list_to_options(col_names)} />
        </Form.Item>
        <Form.Item name='value_col' label='值列' initialValue={col_names[0]}>
            <Select options={convert_list_to_options(col_names)} />
        </Form.Item>
        
        <Form.Item name='threshold' label='阈值' tooltip='自定义颜色优先级高于阈值色'>
            <InputNumber />
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
        
        <Divider />
        
        <div className='value-color-values'>值颜色配置</div>
        <FormDependencies dependencies={['label_col']}>
            {({ label_col }) => { 
                return <Form.List name='value_colors' initialValue={[{ }]}>
                    {(fields, { add, remove }) => <>
                        {
                            fields.map(field =>
                                <Space key={field.name} className='color-item'>
                                    <Form.Item name={[field.name, 'col']} label='标签列'>
                                        <Select options={convert_list_to_options(data_source.map(item => item[label_col]))} />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'color']}>
                                        <StringColorPicker />
                                    </Form.Item>
                                    <DeleteOutlined className='color-item-delete-icon' onClick={() => { remove(field.name) }}/>
                            </Space>)
                        }
                        
                        <Button block type='dashed' icon={<PlusCircleOutlined />} onClick={() => { add() }}>增加颜色配置</Button>
                    
                    </>}
                </Form.List>
            } }
            
        </FormDependencies>
    </>
    
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
