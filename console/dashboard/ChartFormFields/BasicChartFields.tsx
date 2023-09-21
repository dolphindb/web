import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { t } from '../../../i18n/index.js'
import { concat_name_path, convert_list_to_options } from '../utils.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../components/formily/FormDependies/index.js'
import { AxisType, IAxisItem, IYAxisItemValue, Position } from './type.js'

import './index.scss'

interface IProps { 
    col_names: string[]
}

const axis_type_options = [{
    label: t('数据轴'),
    value: AxisType.VALUE
},
{
    label: t('类目轴'),
    value: AxisType.CATEGORY
},
{
    label: t('时间轴'),
    value: AxisType.TIME
},
{
    label: t('对数'),
    value: AxisType.LOG
}]

const axis_position_options = [
    { value: Position.LEFT, label: t('左侧') },
    { value: Position.RIGHT, label: t('右侧') }
]


export const AxisItem = (props: IAxisItem) => { 
    const { name_path, col_names = [ ], list_name, initial_values } = props
    
    return <>
        <Form.Item
            name={concat_name_path(name_path, 'type')}
            label={t('类型')}
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
        <Form.Item name={concat_name_path(name_path, 'name')} label={t('名称')} initialValue={ initial_values?.name ?? t('名称')}>
            <Input />
        </Form.Item>
        {/* 类目轴从col_name中获取data */}
        <FormDependencies dependencies={[concat_name_path(list_name, name_path, 'type')]}>
            {value => { 
                const type = list_name ? value[list_name]?.find(item => !!item)?.type : value?.[name_path]?.type
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
    
    return <Form.List name='series' initialValue={[{ col_name: col_names[0], name: t('名称'), yAxisIndex: 0 }]}>
        {(fields, { add, remove }) => <>
            {
                fields.map((field, index) => { 
                    return <div key={ field.name } className='field-wrapper'>
                        <Space>
                            <div className='axis-wrapper'>
                                <Form.Item name={[field.name, 'col_name']} label={t('数据列')} initialValue={col_names?.[0]} >
                                    <Select options={col_names.map(item => ({ label: item, value: item })) } />
                                </Form.Item>
                                <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={t('名称')}> 
                                    <Input />
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
                            </div>
                            { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} /> } 
                        </Space>
                        { index < fields.length - 1 && <Divider className='divider'/> }
                    </div>
                })
            }
            <Button type='dashed' block onClick={() => add()} icon={<PlusCircleOutlined /> }>{t('增加数据列')}</Button> 
        </>}
    </Form.List>
}

// 多y轴
export const YAxis = (props: { col_names: string[], initial_values?: IYAxisItemValue[] }) => { 
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
        {(fields, { add, remove }) =>      
            <>
                {
                    fields.map((field, index) => {
                        return <div>
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
                                    { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} /> }
                                </Space>
                            </div>
                            { index < fields.length - 1 &&  <Divider className='divider'/> }
                        </div>
                    })
                }
                
                <Button type='dashed' block onClick={() => add()} icon={<PlusCircleOutlined /> }>{t('增加Y 轴')}</Button>
                    
            </>}
    </Form.List>
}

export const AxisFormFields = (props: IProps) => { 
    const { col_names = [ ] } = props
    
    
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

export const SeriesFormFields = (props: { col_names: string[] }) => { 
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


