import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { dashboard, type Widget } from '../../model.js'
import { convert_list_to_options, parse_text } from '../../utils.js'
import { Button, Collapse, Form, Input, InputNumber, Select } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { type IGaugeConfig } from '../../type.js'
import { useMemo } from 'react'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { t } from '../../../../i18n/index.js'


interface IProps { 
    widget: Widget
    data_source: any[]
}



export function Gauge (props: IProps) { 
    const { widget, data_source } = props 
    
    const config = useMemo(() => widget.config as IGaugeConfig, [widget.config])
    
    const options = useMemo<echarts.EChartsCoreOption>(() => { 
        const { title, title_size, max, min, data_setting, label_size, value_size, animation, split_number } = config
        
        return {
            animation,
            backgroundColor: '#282828',
            // 标题
            title: {
                text: parse_text(title ?? ''),
                textStyle: {
                    color: '#e6e6e6',
                    fontSize: title_size || 18,
                },
                padding: [0, 0]
            },
            series: [{
                type: 'gauge',
                title: {
                    fontSize: label_size ?? 16,
                    color: '#fff',
                },
                min,
                max,
                center: ['50%', '50%'],
                progress: {
                    show: true,
                    roundCap: true,
                    clip: true
                },
                splitNumber: split_number || 8,
                data: data_setting.filter(Boolean).map(item => ({
                    value: data_source?.[0]?.[item?.col],
                    name: item.name,
                    title: {
                        offsetCenter: [`${item?.title?.level}%`, `${item?.title?.vertical}%`]
                    },
                    detail: {
                        offsetCenter: [`${item?.value?.level}%`, `${item?.value?.vertical}%`]
                    },
                    itemStyle: {
                        color: item.color,
                    }
                })),
                detail: {
                    valueAnimation: true,
                    height: 14,
                    fontSize: value_size ?? 18,
                    fontWeight: 500,
                    color: 'inherit',
                },
            }]
        }
    }, [config, data_source])
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label失效
    return  <ReactEChartsCore
                echarts={echarts}
                notMerge={dashboard.editing}
                option={options}
                style={{ backgroundColor: '#282828' }}
                theme='dark'
            />
}

export function GaugeConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    const form = Form.useFormInstance()
    const { widget } = dashboard.use(['widget'])
    
    return <>
        <BasicFormFields />
        <Collapse items={[{
            key: 'data',
            label: '数据配置',
            forceRender: true,
            children: <div className='data-setting-wrapper'>
                <Form.Item name='min' label='最小范围'>
                    <InputNumber />
                </Form.Item>
            
                <Form.Item name='max' label='最大范围'>
                    <InputNumber />
                </Form.Item>
                
                <Form.Item label='标签字号' name='label_size' initialValue={16}>
                    <InputNumber addonAfter='px'/>
                </Form.Item>
                
                <Form.Item label='值字号' name='value_size' initialValue={18}>
                    <InputNumber addonAfter='px'/>
                </Form.Item>
                
                <Form.Item label={t('分段数')} name='split_number' initialValue={8}>
                    <InputNumber precision={0}/>
                </Form.Item>
                
                <Form.List name='data_setting' initialValue={[{ }]}>
                    {(fields, { add, remove }) => {
                        
                        const items = fields.map(field => { 
                            return {
                                key: field.name,
                                label: <div className='data-setting-label'>{`数据列 ${field.name + 1}`} <DeleteOutlined onClick={() => { remove(field.name) }} /></div>,
                                forceRender: true,
                                children: <>
                                    <Form.Item name={[field.name, 'col']} label='数据列'>
                                        <Select
                                            onSelect={val => { 
                                                form.setFieldValue(['data_setting', field.name, 'name'], val)
                                                dashboard.update_widget({ ...widget, config: form.getFieldsValue() })
                                            } }
                                            options={convert_list_to_options(col_names)}
                                        />
                                    </Form.Item>
                                    
                                    <Form.Item name={[field.name, 'name']} label='名称'>
                                        <Input />
                                    </Form.Item>
                                    
                                    <Form.Item name={[field.name, 'color']} label='指针颜色'>
                                        <StringColorPicker />
                                    </Form.Item>
                                    
                                    <Form.Item tooltip='仪表盘标题相对于仪表盘中心的水平偏移位置，相对于仪表盘半径的百分比' name={[field.name, 'title', 'level']} label='标题水平偏移' initialValue={0}>
                                        <InputNumber addonAfter='%'/>
                                    </Form.Item>
                                    <Form.Item tooltip='仪表盘标题相对于仪表盘中心的垂直偏移位置，相对于仪表盘半径的百分比' name={[field.name, 'title', 'vertical']} label='标题垂直偏移' initialValue={40}>
                                        <InputNumber addonAfter='%'/>
                                    </Form.Item>
                                
                                    <Form.Item tooltip='仪表盘标题相对于仪表盘中心的水平偏移位置，相对于仪表盘半径的百分比' name={[field.name, 'value', 'level']} label='数值水平偏移' initialValue={0}>
                                        <InputNumber addonAfter='%'/>
                                    </Form.Item>
                                    <Form.Item tooltip='仪表盘标题相对于仪表盘中心的垂直偏移位置，相对于仪表盘半径的百分比' name={[field.name, 'value', 'vertical']} label='数值垂直偏移' initialValue={60}>
                                        <InputNumber addonAfter='%'/>
                                    </Form.Item>
                                </>
                            }
                        })
                        return <>
                            <Collapse size='small' items={items} />
                            <Button className='add-data-setting-btn' type='dashed' block icon={<PlusCircleOutlined />} onClick={() => { add() }}>增加数据列</Button>
                        </>
                    }}
                </Form.List>
            </div>,
            },
        ]} />
    </>
}
