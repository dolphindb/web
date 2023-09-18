import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { NamePath } from 'antd/es/form/interface.js'
import { t } from '../../../i18n/index.js'
import { concat_name_path } from '../utils.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../components/formily/FormDependies/index.js'
import { AxisItem, YAxis } from './BasicChartFields.js'
import './index.scss'


interface IProps { 
    col_names: string[]
}


const Series = (props: { col_names: string[] }) => { 
    const { col_names } = props
    
    const series = [{ name: 'OHLC', key: 0 }, { name: '交易量', key: 1 }]
    
    return <Form.List name='series' initialValue={series}>
        {(fields, { add, remove }) => <>
            {
                fields.map((field, index) => { 
                    return <div key={ field.name }>
                        <Space>
                            <div className='wrapper'>
                                <Form.Item name={[field.name, 'col_name']} label={t('数据列')} initialValue={col_names?.[0]} >
                                    <Select options={col_names.map(item => ({ label: item, value: item })) } />
                                </Form.Item>
                                <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={t('名称')}> 
                                    <Input />
                                </Form.Item>
                                {/* 数据关联的y轴选择 */}
                                <FormDependencies dependencies={['yAxis']}>
                                    {value => {
                                        const { yAxis } = value
                                        const options = yAxis.map((item, idx) => ({
                                            value: idx,
                                            label: item.name
                                        }))
                                        return <Form.Item name={[field.name, 'yAxisIndex']} label={t('关联Y轴')} initialValue={field.key}>
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


export const OhlcFormFields = (props: IProps) => { 
    const { col_names = [ ] } = props
    
    const x_axis = { type: 'time', name: '时间' }
    const y_axis = [{ type: 'value', name: 'OHLC', position: 'left' }, 
                    { type: 'value', name: '交易量', position: 'right' }]
    
    return <Collapse className='' items={[{
        key: 'x_axis',
        label: t('X轴属性'),
        children: <div className='axis-wrapper'><AxisItem name_path='xAxis' col_names={col_names} initial_values={x_axis}/></div>,
        forceRender: true,
    },
    {
        key: 'y_axis',
        label: t('Y轴属性'),
        // children: <AxisItem name_path='yAxis' col_names={col_names}/>,
        children: <YAxis col_names={ col_names } initial_values={y_axis}/>,
        forceRender: true,
    },
    {
        key: 'series',
        label: t('数据列'),
        children: <Series col_names={col_names} />,
        forceRender: true,
    }
    ]} />
     
}
