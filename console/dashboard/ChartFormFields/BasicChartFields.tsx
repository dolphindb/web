import { Form, Select, Input, Collapse, Button, Space, Divider } from 'antd'
import { NamePath } from 'antd/es/form/interface.js'
import { useMemo } from 'react'
import { t } from '../../../i18n/index.js'
import { concat_name_path } from '../utils.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import './AxisFormFields.scss'
import { FormDependencies } from '../../components/formily/FormDependies/index.js'

interface IProps { 
    col_names: string[]
}

const axis_type_options = [{
    label: t('数据轴'),
    value: 'value'
},
{
    label: t('类目轴'),
    value: 'category'
},
{
    label: t('时间轴'),
    value: 'time'
},
{
    label: t('对数'),
    value: 'log'
}]



const AxisItem = (props: { name_path?: NamePath, col_names: string[], list_name?: string }) => { 
    const { name_path, col_names = [ ], list_name } = props
    
    return <div className='axis-wrapper'>
        <Form.Item name={concat_name_path(name_path, 'type')} label={t('类型')} initialValue='category' tooltip={t('数值轴，适用于连续数据\n类目轴，适用于离散的类目数据\n时间轴，适用于连续的时序数据\n对数轴，适用于对数数据')}>
            <Select options={axis_type_options}  />
        </Form.Item>
        <Form.Item name={concat_name_path(name_path, 'name')} label={t('名称')} initialValue={t('名称')}>
            <Input />
        </Form.Item>
        {/* 类目轴从col_name中获取data */}
        <FormDependencies dependencies={[concat_name_path(list_name, name_path, 'type')]}>
            {value => { 
                const { type } = list_name ? value[list_name].find(item => !!item) : value[name_path] 
                if (type !== 'category')
                    return null
                return <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={col_names?.[0]} >
                    <Select options={col_names.map(item => ({ label: item, value: item }))} />
                </Form.Item>
            } }
        </FormDependencies>
    </div>
}


const Series = (props: { col_names: string[] }) => { 
    const { col_names } = props
    
    return <Form.List name='series' initialValue={[{ col_name: col_names?.[0], name: t('名称') }]}>
        {(fields, { add, remove }) => <>
            {
                fields.map((field, index) => { 
                    return <div key={ field.name }>
                        <Space>
                            <div className='wrapper'>
                                <Form.Item name={[field.name, 'col_name']} label={t('数据列')} initialValue={col_names?.[0]} >
                                    <Select options={col_names.map(item => ({ label: item, name: item })) } />
                                </Form.Item>
                                <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={t('名称')}> 
                                    <Input />
                                </Form.Item>
                            </div>
                            { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} /> } 
                        </Space>
                        { index < fields.length - 1 && <Divider className='divider'/> }
                    
                    </div>
                })
            }
            <Button type='dashed' block onClick={add} icon={<PlusCircleOutlined /> }>{t('增加数据列')}</Button> 
        </>}
    </Form.List>
}

// 多y轴
const YAxis = (props: { col_names: string[] }) => { 
    const { col_names } = props
    
    return <Form.List name='yAxis' initialValue={[{ col_name: col_names?.[0], name: t('名称') }]}>
        {(fields, { add, remove }) =>      
            <>
                {
                    fields.map((field, index) => { 
                        return <>
                            <div className='wrapper'>
                                <Space size='small'>
                                    <AxisItem col_names={col_names} name_path={field.name} list_name='yAxis'/>
                                    { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} /> }
                                </Space>
                            </div>
                            { index < fields.length - 1 &&  <Divider className='divider'/> }
                        </>
                    })
                }
                <Button type='dashed' block onClick={add} icon={<PlusCircleOutlined /> }>{t('增加Y轴')}</Button>
            </>}
    </Form.List>
}

export const AxisFormFields = (props: IProps) => { 
    const { col_names = [ 'col_name' ] } = props
    
    
    return <Collapse className='' items={[{
        key: 'x_axis',
        label: t('X轴属性'),
        children: <AxisItem name_path='xAxis' col_names={col_names} />,
        forceRender: true,
    },
    {
        key: 'y_axis',
        label: t('Y轴属性'),
        // children: <YAxis col_names={col_names} />,
        children: <AxisItem name_path='yAxis' col_names={col_names}/>,
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
