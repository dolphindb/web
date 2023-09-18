import { Button, Collapse, Divider, Form, Input, Select, Space } from 'antd'
import { useMemo } from 'react'
import { t } from '../../../i18n/index.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../components/formily/FormDependies/index.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'


interface IProps { 
    col_names: string[]
}

export const BasicTableFields = (props: IProps) => { 
    const { col_names } = props
    
    const ColSettingFields = useMemo(() => { 
        return <>
            <Form.Item name='show_cols' label={t('展示列')} initialValue={col_names}>
                <Select mode='multiple' options={col_names.map(item => ({ label: item, value: item }))} />
            </Form.Item>
    
            <div className='col-mapping-title'>{t('列名映射')}</div>
            <FormDependencies dependencies={['show_cols']}>
                {value => { 
                    const { show_cols = [ ] } = value
                    return <Form.List name='col_mappings' initialValue={[{ }]}>
                    {(fields, { add, remove }) => <>
                        {
                            fields.map((field, index) => { 
                                return <div className='col-mapping-item'>
                                    <Form.Item name={[field.name, 'original_col']} initialValue={show_cols[index]}>
                                        <Select options={show_cols.map(item => ({ label: item, value: item }))} />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'mapping_name']}>
                                        <Input />
                                    </Form.Item>  
                                    <DeleteOutlined className='delete-icon' onClick={() => remove(field.name)} />
                                </div>
                            })
                        }
                            { fields.length < show_cols.length && <Button type='dashed'  icon={<PlusCircleOutlined /> } block onClick={() => add()}>{t('增加映射')}</Button> }
                    </>}
                </Form.List>
                } }
            </FormDependencies>
            
        </>
    }, [col_names])
    
    
    const PaginationSetting = useMemo(() => { 
        const DEFAULT_PAGESIZE_OPTIONS = [5, 10, 15, 20].map(item => ({
            label: item,
            value: item
        }))
        return <>
            <Form.Item name={['pagination', 'show']} label={t('需要分页')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
            {/* <FormDependencies dependencies={[['pagination', 'show']]}>
                {value => { 
                    if (!value?.pagination?.show)
                        return null
                    return <Form.Item name={['pagination', 'pagesize']} label={t('默认分页数')} initialValue={5}>
                        <Select options={DEFAULT_PAGESIZE_OPTIONS} />
                    </Form.Item>
                } }
            </FormDependencies> */}
        </>
    }, [ ])
    
    
    
    
    
    return <Collapse items={[{
                key: 'col',
                label: t('列配置'),
                children: ColSettingFields,
                forceRender: true
            },
            {
                key: 'pagination',
                label: t('分页设置'),
                children: PaginationSetting,
                forceRender: true 
            }
        ]}
    />
}

