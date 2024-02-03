import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'

import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'
import { PaddingSetting, VariableSetting } from './BasicFormFields.js'

export function BasicFormFields ({ type }: { type: 'chart' | 'table' }) { 
    const { variable_infos } = variables.use(['variable_infos'])
    
    const FormFields = useMemo(() => { 
        return <div className='axis-wrapper'>
                <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                    <Input />
                </Form.Item>
                <Form.Item name='title_size' label={t('标题字号')} initialValue={18}>
                    <InputNumber addonAfter='px' />
                </Form.Item>
            <PaddingSetting />
           
            
            <Form.Item name='with_legend' label={t('图例')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_tooltip' label={t('气泡提示')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
        </div>
    }, [type, variable_infos])
    
    return <Collapse items={[{
            key: 'basic',
            label: t('基本属性'),
            children: FormFields,
            forceRender: true
        },
        {
            key: 'variable',
            label: t('变量设置'),
            children: <VariableSetting />, 
            forceRender: true
        }
    ]} />
}


function Labels (props: { col_names: string[] }) { 
    const { col_names } = props
    
    return <Form.List name='labels' initialValue={[{ col_name: col_names[0] }]}>
        {(fields, { add }) => <>
            {
                fields.map((field, index) => { 
                    return <div key={field.name}>
                            <div className='field-wrapper'>
                                <Space>
                                    <div className='axis-wrapper'>
                                        <Form.Item name={[field.name, 'col_name']} label={t('标签列')} >
                                            <Select options={col_names.map(item => ({ label: item, value: item }))} />
                                        </Form.Item>
                                    </div>
                                </Space>
                            </div>
                        </div>
                })
            } 
        </>}
    </Form.List>
}


export function LabelsFormFields (props: { col_names: string[] }) {
    const { col_names } = props
    return <Collapse items={[
        {
            key: 'labels',
            label: t('标签列'),
            children: <Labels col_names={col_names} />,
            forceRender: true,
        }
    ]} />
}


function Series (props: { col_names: string[] }) { 
    const { col_names } = props
    
    const series = Form.useWatch('series')
    
    return <Form.List name='series' initialValue={[{ col_name: col_names[0], max: null }]}>
        {(fields, { add, remove }) => 
            {
                const items = fields.map((field, index) => { 
                    const children = <div className='field-wrapper' key={field.name}>
                            <Space>
                                <div className='axis-wrapper'>
                                    <Form.Item name={[field.name, 'col_name']} label={t('数据列')} >
                                        <Select options={col_names.map(item => ({ label: item, value: item }))} />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'max']} label={t('最大值')}>
                                        <InputNumber />
                                    </Form.Item>
                                </div>
                            </Space>
                        </div>
                    return {
                        children,
                        key: field.name,
                        label: <div className='collapse-label'>
                            {/* {`数据列 ${field.name + 1}`} */}
                            {series?.[field.name]?.name || `数据列 ${field.name + 1}` }
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
                    <Button
                        className='add-yaxis-btn'
                        type='dashed'
                        block
                        onClick={() => { add() }}
                        icon={<PlusCircleOutlined />}
                    >
                        {t('增加数据列')}
                    </Button>
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
            label: t('数据列'),
            children: <Series col_names={col_names} />,
            forceRender: true,
        }
    ]} />
}

