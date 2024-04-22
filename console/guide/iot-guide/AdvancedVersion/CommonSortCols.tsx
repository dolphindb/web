import './index.scss'

import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Form, InputNumber, Select, Tooltip } from 'antd'
import { type SelectProps } from 'antd/lib'
import { countBy } from 'lodash'
import { useCallback } from 'react'

import { t } from '../../../../i18n/index.js'

interface IProps {
    initial_value?: any
    options: SelectProps['options']
    max?: number
}

export function CommonSortCols (props: IProps) {
    const { options, max } = props
    
    const form = Form.useFormInstance()
    
    const validator = useCallback(async (_, value) => { 
        const otherSortKeyInfo = form.getFieldValue('otherSortKeyInfo') ?? [ ]
        const name_list = otherSortKeyInfo.map(item => item?.colName)
        if (countBy(name_list)?.[value] > 1)  
            return Promise.reject(t('已配置该常用筛选列，请修改'))
        for (let i = 0;  i < name_list.length;  i++)  
            if (name_list[i] && !options.find(item => item.value === name_list[i]) && name_list[i])
                return Promise.reject(t('表结构中无 {{name}} 列，请修改', { name: name_list[i] }))
    }, [ options ])
    
    return <div className='sort-cols-wrapper'>
        <h4>{t('常用筛选列')}</h4>
        <Form.List name='otherSortKeyInfo' initialValue={[{ }]}>
            {(fields, { add, remove }) => <>
                {fields.map(field =>
                    <div key={field.name} className='sort-col-item'>
                        <Form.Item
                            label={t('列名')}
                            name={[field.name, 'colName']}
                            rules={[
                                { required: true, message: t('请选择列名') },
                                { validator }
                            ]}
                            labelCol={{ span: 10 }}
                            wrapperCol={{ span: 14 }}
                        >
                            <Select showSearch options={options} placeholder={t('请选择列名')} />
                        </Form.Item>
                        <Form.Item
                            label={t('唯一值数量')}
                            name={[field.name, 'uniqueNum']}
                            rules={[{ required: true, message: t('请填入唯一值数量') }]}
                            labelCol={{ span: 10 }}
                            wrapperCol={{ span: 14 }}
                        >
                            <InputNumber placeholder={t('请填入唯一值数量')} min={1} precision={0} />
                        </Form.Item>
                        {fields.length > 1 && <Tooltip title={t('删除')}><DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }} /></Tooltip>}
                    </div>)}
                {fields.length < max && <Button onClick={() => { add() }} block type='dashed' icon={<PlusCircleOutlined />}>{t('增加筛选列')}</Button>}
            </>}
        </Form.List>
    </div>
}
