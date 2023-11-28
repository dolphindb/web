import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'

import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { convert_list_to_options } from '../utils.js'
import { PaddingSetting, VariableSetting } from './BasicFormFields.js'

export function BasicFormFields ({ type }: { type: 'chart' | 'table' }) { 
    const { variable_infos } = variables.use(['variable_infos'])
    
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            <Form.Item name='title_size' label='标题字号' initialValue={18}>
                <InputNumber addonAfter='px' />
            </Form.Item>
            <PaddingSetting />
            
            <Form.Item name='with_legend' label={t('图例')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
        </div>
    }, [ type, variable_infos ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }, {
        key: 'variable',
        label: t('变量设置'),
        children: <VariableSetting />, 
        forceRender: true
    }]} />
}


function Series (props: { col_names: string[] }) { 
    const { col_names } = props
    
    const series = Form.useWatch('series')
    
    return <Form.List name='series' initialValue={[{ col_name: col_names[0], name: col_names[0] }]}>
        {(fields, { add, remove }) =>
            { const items = fields.map((field, index) => { 
                const children = <div className='field-wrapper' key={field.name}>
                    <Space>
                        <div className='axis-wrapper'>
                            <Form.Item name={[field.name, 'col_name']} label={t('数据列')} >
                                <Select options={col_names.map(item => ({ label: item, value: item }))} />
                            </Form.Item>
                            <Form.Item name={[field.name, 'name']} label={t('名称')}>
                                <Select options={col_names.map(item => ({ label: item, value: item }))} />
                            </Form.Item>
                        </div>
                        {fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) } } />}
                    </Space>
                </div>
                
                return {
                    children,
                    key: field.name,
                    label: <div className='yaxis-collapse-label'>
                        {/* {`数据环 ${field.name + 1}`} */}
                        {series?.[field.name]?.name || `${t('数据环')} ${field.name + 1}` }
                        {
                            fields.length > 1 &&
                            <DeleteOutlined
                                className='delete-icon'
                                onClick={() => { remove(field.name) }}
                            />
                        }
                    </div>,
                    forceRender: true,
                }
            })
            return <div className='yasix-collapse-wrapper'>
                    <Collapse items={items} size='small'/>
                    {(fields.length < 3) &&
                    <Button 
                        type='dashed' 
                        className='add-yaxis-btn'
                        block onClick={() => { add({ col_name: col_names[0], name: col_names[0] }) } } 
                        icon={<PlusCircleOutlined />}
                    >
                        {t('增加环')}
                    </Button>}
                </div> 
            }
        }
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


