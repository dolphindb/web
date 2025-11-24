import './index.scss'

import type * as echarts from 'echarts'

import { Button, Collapse, Form, Input, InputNumber, Select } from 'antd'

import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { useMemo } from 'react'

import { dashboard } from '../../model.js'
import { convert_list_to_options, format_number, parse_text } from '../../utils.ts'

import { type IGaugeConfig } from '../../type.js'


import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { t } from '@i18n'
import { DashboardEchartsComponent } from '@/dashboard/components/EchartsComponent.tsx'
import type { GraphComponentProps, GraphConfigProps } from '@/dashboard/graphs.ts'


export function Gauge ({ widget, data_source: { data } }: GraphComponentProps) { 
    
    const config = widget.config as IGaugeConfig
    
    const option = useMemo<echarts.EChartsOption>(() => { 
        const { title, title_size, max, min, data_setting, label_size, value_size, animation, split_number, value_precision } = config
        
        return {
            animation,
            backgroundColor: '#282828',
            // 标题
            title: {
                text: parse_text(title ?? ''),
                textStyle: {
                    color: '#e6e6e6',
                    fontSize: title_size || 18,
                }
            },
            series: [{
                type: 'gauge',
                title: {
                    fontSize: label_size ?? 16,
                    color: '#fff',
                },
                min,
                max,           
                progress: {
                    show: true,
                    roundCap: true,
                    clip: true
                },
                splitNumber: split_number || 8,
                data: data_setting.filter(Boolean).map(item => ({
                    value: data?.[0]?.[item?.col],
                    name: item.name,
                    title: item.title ?  {
                        offsetCenter:  [`${item?.title?.level}%`, `${item?.title?.vertical}%`]
                    } : undefined,
                    detail: item.value ? {
                        offsetCenter: [`${item?.value?.level}%`, `${item?.value?.vertical}%`]
                    } : undefined,
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
                    formatter: value => format_number(value, value_precision, true)
                },
            }]
        }
    }, [config, data])
    
    return <DashboardEchartsComponent options={option} />
}


export function GaugeConfigForm ({ data_source: { cols } }: GraphConfigProps) {
    const form = Form.useFormInstance()
    const { widget } = dashboard.use(['widget'])
    
    return <>
        <BasicFormFields type='chart' chart_fields={[ ]}/>
        <Collapse items={[{
            key: 'data',
            label: t('数据配置'),
            forceRender: true,
            children: <div className='data-setting-wrapper'>
                <Form.Item name='min' label={t('最小范围')}>
                    <InputNumber />
                </Form.Item>
            
                <Form.Item name='max' label={t('最大范围')}>
                    <InputNumber />
                </Form.Item>
                
                <Form.Item label={t('标签字号')} name='label_size' initialValue={16}>
                    <InputNumber suffix='px'/>
                </Form.Item>
                
                <Form.Item label={t('值字号')} name='value_size' initialValue={18}>
                    <InputNumber suffix='px'/>
                </Form.Item>
                
                <Form.Item label={t('值精度')} name='value_precision' initialValue={2}>
                    <InputNumber precision={0} min={0} />
                </Form.Item>
                
                <Form.Item label={t('分段数')} name='split_number' initialValue={8}>
                    <InputNumber precision={0}/>
                </Form.Item>
                
                
                <Form.List name='data_setting' initialValue={[{ }]}>
                    {(fields, { add, remove }) => {
                        
                        const items = fields.map(field => ({
                                key: field.name,
                                label: <div className='data-setting-label'>{t('数据列') + (field.name + 1)}<DeleteOutlined onClick={() => { remove(field.name) }} /></div>,
                                forceRender: true,
                                children: <>
                                    <Form.Item name={[field.name, 'col']} label={t('数据列')}>
                                        <Select
                                            onSelect={val => { 
                                                form.setFieldValue(['data_setting', field.name, 'name'], val)
                                                dashboard.update_widget({ ...widget, config: form.getFieldsValue() })
                                            } }
                                            options={convert_list_to_options(cols)}
                                        />
                                    </Form.Item>
                                    
                                    <Form.Item name={[field.name, 'name']} label={t('名称')}>
                                        <Input />
                                    </Form.Item>
                                    
                                    <Form.Item name={[field.name, 'color']} label={t('指针颜色')}>
                                        <StringColorPicker />
                                    </Form.Item>
                                    
                                    <Form.Item tooltip={t('相对仪表盘中心的水平偏移位置')} name={[field.name, 'title', 'level']} label={t('标题水平偏移')} initialValue={0}>
                                        <InputNumber suffix='%'/>
                                    </Form.Item>
                                    <Form.Item tooltip={t('相对仪表盘中心的垂直偏移位置')} name={[field.name, 'title', 'vertical']} label={t('标题垂直偏移')} initialValue={40}>
                                        <InputNumber suffix='%'/>
                                    </Form.Item>
                                
                                    <Form.Item tooltip={t('相对仪表盘中心的水平偏移位置')} name={[field.name, 'value', 'level']} label={t('数值水平偏移')} initialValue={0}>
                                        <InputNumber suffix='%'/>
                                    </Form.Item>
                                    <Form.Item tooltip={t('相对仪表盘中心的垂直偏移位置')} name={[field.name, 'value', 'vertical']} label={t('数值垂直偏移')} initialValue={60}>
                                        <InputNumber suffix='%'/>
                                    </Form.Item>
                                </>
                            }))
                        return <>
                            <Collapse size='small' items={items} />
                            <Button className='add-data-setting-btn' type='dashed' block icon={<PlusCircleOutlined />} onClick={() => { add() }}>{t('增加数据列')}</Button>
                        </>
                    }}
                </Form.List>
            </div>,
            },
        ]} />
    </>
}
