import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget } from '../../model.js'
import { convert_list_to_options, parse_text } from '../../utils.js'
import { Button, Collapse, Form, Input, InputNumber, Select } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { type IGaugeConfig } from '../../type.js'
import { useMemo } from 'react'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'


interface IProps { 
    widget: Widget
    data_source: any[]
}



export function Gauge (props: IProps) { 
    const { widget, data_source } = props 
    
    const config = useMemo(() => widget.config as IGaugeConfig, [widget.config])
    
    const options = useMemo<echarts.EChartsCoreOption>(() => { 
        const { title, title_size, max, min, data_setting, axis_setting } = config
        
        return {
            backgroundColor: '#282828',
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
                    fontSize: 14,
                    color: '#fff',
                },
                min,
                max,
                
                progress: {
                    show: true,
                    roundCap: true,
                    clip: true
                },
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
                        color: item.color 
                    }
                })),
                detail: {
                    valueAnimation: true,
                    width: 60,
                    height: 14,
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#fff',
                    backgroundColor: 'inherit',
                    borderRadius: 4,
                },
            }]
        }
    }, [config, data_source])
    
    
    return  <ReactEChartsCore
                echarts={echarts}
                notMerge
                option={options}
                style={{ backgroundColor: '#282828' }}
                theme='dark'
            />
}

export function GaugeConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
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
                    
                   
                    
                    <Form.List name='data_setting' initialValue={[{ }]}>
                        {(fields, { add, remove }) => {
                            
                            const items = fields.map(field => { 
                                return {
                                    key: field.name,
                                    label: <div className='data-setting-label'>{`数据列 ${field.name + 1}`} <DeleteOutlined onClick={() => { remove(field.name) }} /></div>,
                                    forceRender: true,
                                    children: <>
                                        <Form.Item name={[field.name, 'col']} label='数据列'>
                                            <Select options={convert_list_to_options(col_names)} />
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
            // {   
            //     key: 'axis',
            //     label: '轴线设置',
            //     forceRender: true,
            //     children: <>
            //         <Form.List name='axis_setting' initialValue={[{ }]}>
            //             {(fields, { add, remove }) => <>
            //                 {fields.map(field => <div className='gauge-axis-setting-wrapper'>
            //                     <Form.Item name={[field.name, 'threshold']} label='区间' tooltip='该值代表整根轴线的百分比，需要在0-1之间'>
            //                         <InputNumber max={1} min={0} />
            //                     </Form.Item>
            //                     <Form.Item name={[field.name, 'color']} label='颜色'>
            //                         <StringColorPicker />
            //                     </Form.Item>
                                
            //                     <DeleteOutlined className='gauge-axis-delete-icon' onClick={() => { remove(field.name) } } />
                            
                            
            //                 </div>)}
                            
            //                 <Button onClick={() => { add() }} type='dashed' block icon={<PlusCircleOutlined />}>增加轴线区间设置</Button>
                        
                        
            //             </>}
            //         </Form.List>
                
            //     </>
                
            // }
        ]} />
    </>
}
