import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'
import { concat_name_path, convert_list_to_options } from '../utils.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { AxisType, IAxisItem, ILineType, IYAxisItemValue } from './type.js'


import { axis_position_options, axis_type_options, chart_type_options, line_type_options, mark_line_options, mark_point_options, stack_strategy_options } from './constant.js'
import { WidgetChartType, dashboard } from '../model.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'


export const AxisItem = ({ name_path, col_names = [ ], list_name, initial_values }: IAxisItem) => { 
    return <>
        <Form.Item
            label={t('类型')}
            name={concat_name_path(name_path, 'type')}
            initialValue={initial_values?.type ?? AxisType.CATEGORY}
            tooltip={<>
                {t('数值轴，适用于连续数据')}
                <br />
                {t('类目轴，适用于离散的类目数据')}
                <br />
                {t('时间轴，适用于连续的时序数据')}
                <br />
                {t('对数轴，适用于对数数据')}
            </>}
        >
            <Select options={axis_type_options}  />
        </Form.Item>
        <Form.Item label={t('名称')} name={concat_name_path(name_path, 'name')} initialValue={ initial_values?.name ?? t('名称')}>
            <Input />
        </Form.Item>
        {/* 类目轴从 col_name 中获取 data */}
        <FormDependencies dependencies={[concat_name_path(list_name, name_path, 'type')]}>
            {value => {
                const type = list_name ? value[list_name]?.find(item => item)?.type : value?.[name_path]?.type
                switch (type) { 
                    case AxisType.LOG:
                        return <Form.Item name={concat_name_path(name_path, 'log_base')} label={t('底数')} initialValue={10}>
                            <InputNumber />
                        </Form.Item>
                    case AxisType.TIME:
                    case AxisType.CATEGORY:
                        return <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={initial_values?.col_name ?? col_names?.[0]} >
                            <Select options={convert_list_to_options(col_names)} />
                        </Form.Item>
                    default: 
                        return null
                }
            }}
        </FormDependencies>
    </>
}


const Series = (props: { col_names: string[] }) => { 
    const { col_names } = props
    const { widget: { type } } = dashboard.use(['widget'])
    
    return <Form.List name='series' initialValue={[{ col_name: col_names[0], name: t('名称'), yAxisIndex: 0 }]}>
        {(fields, { add, remove }) => <>
            {
                fields.map((field, index) => { 
                    return <div key={ field.name }>
                        <div className='field-wrapper'>
                            <Space>
                                <div className='axis-wrapper'>
                                    <Form.Item name={[field.name, 'col_name']} label={t('数据列')} initialValue={col_names?.[0]} >
                                        <Select options={col_names.map(item => ({ label: item, value: item })) } />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={t('名称')}> 
                                        <Input />
                                    </Form.Item>
                                    
                                    <Form.Item name={[field.name, 'type']} label={t('类型')} initialValue={type === WidgetChartType.MIX ? WidgetChartType.LINE : type}>
                                        <Select options={chart_type_options} disabled={type !== WidgetChartType.MIX} />
                                    </Form.Item>
                                    
                                    {/* 数据关联的y轴选择 */}
                                    <FormDependencies dependencies={['yAxis']}>
                                        { value => {
                                            const { yAxis } = value
                                            const options = yAxis.map((item, idx) => ({
                                                value: idx,
                                                label: item?.name
                                            }))
                                            return <Form.Item name={[field.name, 'yAxisIndex']} label={t('关联 Y 轴')} initialValue={0}>
                                                <Select options={options} />
                                            </Form.Item>
                                        } }
                                    </FormDependencies>
                                    <Form.Item name={[field.name, 'mark_point']} label='标记点'>
                                        <Select options={mark_point_options} mode='multiple'/>
                                    </Form.Item>
                                    
                                    <Form.Item label={t('水平线')} name={[field.name, 'mark_line']}>
                                        <Select options={mark_line_options} mode='tags' />
                                    </Form.Item>
                                    {/* 仅折线图可选择线类型 */}
                                    {
                                        type === WidgetChartType.LINE && <Form.Item label={t('线类型')} name={[field.name, 'line_type']} initialValue={ILineType.SOLID}>
                                            <Select options={line_type_options} />
                                        </Form.Item>
                                    }
                                    {/* 柱状图需要选择是否堆叠展示 */}
                                    {
                                        type === WidgetChartType.BAR && <>
                                            <Form.Item tooltip={t('同个类目轴上系列配置相同的 stack 值可以堆叠放置')} label={t('堆叠值')} name={[field.name, 'stack']}>
                                                <Input />
                                            </Form.Item>
                                            {/* <Form.Item
                                                tooltip={<>
                                                    {t('samesign 只在堆叠值与当前累积堆叠值同正负符号时堆叠')}
                                                    <br/>
                                                    {t('all 堆叠所有的值')}
                                                    <br />
                                                    {t('positive 只堆积正值')}
                                                    <br />
                                                    {t('negative 只堆叠负值')}
                                                </>}
                                                label={t('堆叠策略')}
                                                name={[field.name, 'stack_strategy']}
                                            >
                                                <Select options={stack_strategy_options} allowClear/>
                                            </Form.Item> */}
                                        </>
                                    }
                                    
                                </div>
                                { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} /> } 
                            </Space>
                        </div>
                        { index < fields.length - 1 && <Divider className='divider'/> }
                    </div>
                })
            }
            <Button type='dashed' block onClick={() => add()} icon={<PlusCircleOutlined /> }>{t('增加数据列')}</Button> 
        </>}
    </Form.List>
}

export function YAxis (props: { col_names: string[], initial_values?: IYAxisItemValue[] } ) {
    const { col_names, initial_values } = props
    
    const default_initial_values = useMemo(() => ([
        {
            type: 'category',
            name: t('名称'),
            col_name: col_names[0],
            position: 'left',
            offset: 0
        }
    ]), [col_names])
    
    return <Form.List name='yAxis' initialValue={initial_values || default_initial_values}>
        {(fields, { add, remove }) => <>
            {fields.map((field, index) => {
                return <div key={field.name}>
                    <div className='field-wrapper'>
                        <Space>
                            <div className='axis-wrapper'>
                                <AxisItem col_names={col_names} name_path={field.name} list_name='yAxis' />
                                <Form.Item name={[field.name, 'position']} label={t('位置')} initialValue='left'>
                                    <Select options={axis_position_options} />
                                </Form.Item>
                                <Form.Item name={[field.name, 'offset']} label={t('偏移量')} initialValue={0}>
                                    <InputNumber />
                                </Form.Item>
                            </div>
                            {fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} />}
                        </Space>
                    </div>
                    {index < fields.length - 1 && <Divider className='divider' />}
                </div>
            })}
            
            <Button type='dashed' block onClick={() => add()} icon={<PlusCircleOutlined />}>{t('增加 Y 轴')}</Button>
        </>}
    </Form.List>
}

export function AxisFormFields ({ col_names = [ ] }: { col_names: string[] }) {
    return <Collapse items={[{
        key: 'x_axis',
        label: t('X 轴属性'),
        children: <div className='axis-wrapper'><AxisItem name_path='xAxis' col_names={col_names} /></div>,
        forceRender: true,
    },
    {
        key: 'y_axis',
        label: t('Y 轴属性'),
        children: <YAxis col_names={col_names} />,
        forceRender: true,
    }
    ]} />
}


export function SeriesFormFields (props: { col_names: string[] }) {
    const { col_names } = props
    return <Collapse items={[
        {
            key: 'series',
            label: t('数据列'),
            children: <Series col_names={col_names} />,
            forceRender: true,
        }
    ]} />
}


