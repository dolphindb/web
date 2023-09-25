import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'

import { WidgetChartType, dashboard } from '../model.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'

export function BasicFormFields ({ type }: { type: 'chart' | 'table' }) { 
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            <Form.Item name='with_legend' label={t('图例')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
        </div>
    }, [ type ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}


function Series (props: { col_names: string[] }) { 
    const { col_names } = props
    const { widget: { type } } = dashboard.use(['widget'])
    
    return <Form.List name='series' initialValue={[{ col_name: col_names[0], name: t('名称'), yAxisIndex: 0, type: type === WidgetChartType.MIX ? WidgetChartType.LINE : type }]}>
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
                                    <Form.Item name={[field.name, 'col_name']} label='名称列' initialValue={col_names?.[0]} >
                                        <Select options={col_names.map(item => ({ label: item, value: item })) } />
                                    </Form.Item>    
                                </div>
                                { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} /> } 
                            </Space>
                        </div>
                        { index < fields.length - 1 && <Divider className='divider'/> }
                    </div>
                })
            }
            <Button type='dashed' block onClick={() => add()} icon={<PlusCircleOutlined /> }>增加环数</Button> 
        </>}
    </Form.List>
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


