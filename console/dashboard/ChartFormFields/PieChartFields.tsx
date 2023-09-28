import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'

import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'

export function BasicFormFields ({ type }: { type: 'chart' | 'table' }) { 
    const { variable_names } = variables.use(['variable_names'])
    
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            <Form.Item name='title_size' label='标题字号' initialValue={18}>
                <InputNumber addonAfter='px' />
            </Form.Item>
            <Form.Item name='variable_names' label={t('关联变量')}>
                <Select mode='multiple' options={variable_names.map(item => ({
                    label: item,
                    value: item
                }))} />
            </Form.Item>
            <Form.Item name='with_legend' label={t('图例')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
        </div>
    }, [ type, variable_names ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}


function Series (props: { col_names: string[] }) { 
    const { col_names } = props
    
    return <Form.List name='series' initialValue={[{ value: col_names[0], name: col_names[0] }]}>
        {(fields, { add, remove }) => <>
            {
                fields.map((field, index) => { 
                    return <div key={field.name}>
                            <div className='field-wrapper'>
                                <Space>
                                    <div className='axis-wrapper'>
                                        <Form.Item name={[field.name, 'value']} label={t('数据列')} >
                                            <Select options={col_names.map(item => ({ label: item, value: item }))} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'name']} label={t('名称')}>
                                            <Select options={col_names.map(item => ({ label: item, value: item }))} />
                                        </Form.Item>
                                    </div>
                                    {fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) } } />}
                                </Space>
                            </div>
                            {index < fields.length - 1 && <Divider className='divider' />}
                        </div>
                })
            } 
            {
                fields.length < 3
                    ? <Button type='dashed' block onClick={() => { add() } } icon={<PlusCircleOutlined />}>增加环</Button>
                    : <></>
            }
        </>}
    </Form.List>
}


export function SeriesFormFields (props: { col_names: string[] }) {
    const { col_names } = props
    return <Collapse items={[
        {
            key: 'series',
            label: t('数据环'),
            children: <Series col_names={col_names} />,
            forceRender: true,
        }
    ]} />
}


