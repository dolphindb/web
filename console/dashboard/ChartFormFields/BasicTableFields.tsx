import './index.scss'

import { Button, Collapse, Divider, Form, Input, InputNumber, Select, Space } from 'antd'

import { t } from '../../../i18n/index.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { convert_list_to_options } from '../utils.js'
import { type CollapseProps } from 'antd/lib'


export function BasicTableFields ({ col_names }: { col_names: string[] } ) {
    return <Collapse items={[
        {
            key: 'col',
            label: t('列配置'),
            forceRender: true,
            children: <>
                <Form.Item name='show_cols' label={t('展示列')} initialValue={col_names}>
                    <Select mode='multiple' options={convert_list_to_options(col_names)} />
                </Form.Item>
                
                <Divider />
                
                <FormDependencies dependencies={['show_cols']}>
                    {value => {
                        const { show_cols = [ ] } = value
                        const col_select_options = convert_list_to_options(show_cols)
                        return <>
                            <div className='col-mapping-title'>{t('列名映射')}</div>
                            <Form.List name='col_mappings' initialValue={[{ }]}>
                                {(fields, { add, remove }) => <>
                                    {fields.map((field, index) => {
                                        return <div className='col-mapping-item' key={index}>
                                            <Form.Item name={[field.name, 'original_col']} initialValue={show_cols[index]}>
                                                <Select options={col_select_options} />
                                            </Form.Item>
                                            <Form.Item name={[field.name, 'mapping_name']}>
                                                <Input />
                                            </Form.Item>
                                            <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }} />
                                        </div>
                                    })}
                                    {fields.length < show_cols.length && <Button type='dashed' icon={<PlusCircleOutlined />} block onClick={() => { add() }}>{t('增加映射')}</Button>}
                                </>}
                            </Form.List>
                            
                            <Divider />
                            
                            <div className='value-format-wrapper'>
                                <Form.Item label={t('数值格式化')} name='need_value_format' initialValue={false}>
                                    <BoolRadioGroup />
                                </Form.Item>
                                <FormDependencies dependencies={['need_value_format']}>
                                    {({ need_value_format }) => {
                                        if (!need_value_format)
                                            return null
                                        return <Space className='value-format-space'>
                                            <Form.Item name={['value_format', 'cols']}>
                                                <Select placeholder={t('格式化的数据列')} mode='multiple' options={col_select_options} />
                                            </Form.Item>
                                            <Form.Item name={['value_format', 'decimal_places']}>
                                                <InputNumber placeholder={t('保留小数位数')} />
                                            </Form.Item>
                                        </Space>
                                    } }
                                </FormDependencies>
                            </div>
                            
                            <Divider />
                            
                            <div className='col-mapping-title'>{t('列属性')}</div>
                            <Form.List name='col_properties' initialValue={col_names.map(item => ({ col: item }))}>
                                {fields => { 
                                    const items: CollapseProps['items'] = fields.map(field => ({
                                        key: field.name,
                                        label: col_names[field.name],
                                        children: <>
                                            <Form.Item name={[field.name, 'col']} hidden>
                                                <Input />
                                            </Form.Item>
                                            <Form.Item label={t('列宽')} name={[field.name, 'width']}>
                                                <InputNumber addonAfter='px'/>
                                            </Form.Item>
                                            <Form.Item label={t('阈值')} tooltip={t('数值列可设置阈值，设置之后后超过阈值的数值展示为红色，低于阈值则展示为绿色，非数值列不生效')} name={[field.name, 'threshold']}>
                                                <InputNumber />
                                            </Form.Item>
                                        </>,
                                        forceRender: true
                                    }))
                                    return <Collapse items={items} size='small'/>
                                }}
                            </Form.List>
                        </>
                    }}
                </FormDependencies>
            </>,
        },
        {
            key: 'pagination',
            label: t('分页设置'),
            forceRender: true,
            children: <Form.Item name={['pagination', 'show']} label={t('需要分页')} initialValue >
                <BoolRadioGroup />
            </Form.Item>,
            
        }
    ]} />
}

