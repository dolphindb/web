import './index.scss'

import { Collapse, Form, Input, InputNumber, Select } from 'antd'

import { t } from '../../../i18n/index.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { type CollapseProps } from 'antd/lib'
import { format_time_options } from './constant.js'
import { StringColorPicker } from '../../components/StringColorPicker/index.js'
import { convert_list_to_options } from '../utils.js'


export function BasicTableFields ({ col_names }: { col_names: string[] }) {
    
    return <Collapse items={[
        {
            key: 'col',
            label: t('列配置'),
            forceRender: true,
            children: <Form.List name='col_properties' initialValue={col_names.map(item => ({ col: item, show: true, with_value_format: false }))}>
                {fields => { 
                    const items: CollapseProps['items'] = fields.map(field => ({
                        key: field.name,
                        label: col_names[field.name],
                        children: <div className='axis-wrapper'>
                            <Form.Item name={[field.name, 'col']} hidden>
                                <Input />
                            </Form.Item>
                            <Form.Item label={t('是否展示')} name={[field.name, 'show']} initialValue>
                                <BoolRadioGroup />
                            </Form.Item>
                            <Form.Item label={t('展示列名')} name={[field.name, 'display_name']}>
                                <Input />
                            </Form.Item>
                            <Form.Item label={t('列宽')} name={[field.name, 'width']}>
                                <InputNumber addonAfter='px'/>
                            </Form.Item>
                            <Form.Item label={t('阈值')} tooltip={t('数值列可设置阈值，设置之后后超过阈值的数值展示为红色，低于阈值则展示为绿色，非数值列不生效')} name={[field.name, 'threshold']}>
                                <InputNumber />
                            </Form.Item>
                            
                            <Form.Item label='字体颜色' name={[field.name, 'color']}>
                                <StringColorPicker />
                            </Form.Item>
                            
                            <Form.Item label='背景颜色' name={[field.name, 'background_color']}>
                                <StringColorPicker />
                            </Form.Item>
                            
                            <Form.Item label={t('时间格式化')} name={[field.name, 'time_format']}>
                                <Select options={format_time_options} allowClear/>
                            </Form.Item>
                            
                            <Form.Item label={t('小数位数')} name={[field.name, 'decimal_places']}>
                                <InputNumber min={0} />
                            </Form.Item>
                            <Form.Item label='是否千分位' name={[field.name, 'is_thousandth_place']} initialValue={false}>
                                <BoolRadioGroup />
                            </Form.Item>
                            
                            <Form.Item label='对齐方式' name={[field.name, 'align']} initialValue='left'>
                                <Select options={convert_list_to_options(['left', 'center', 'right'])} />
                            </Form.Item>
                            {/* <Form.Item label='是否排序' name={ [field.name, 'sort']} initialValue={false}>
                                <BoolRadioGroup />
                            </Form.Item> */}
                            
                            
                        </div>,
                        forceRender: true
                    }))
                    return <Collapse items={items} size='small'/>
                }}
            </Form.List>,
        },
        {
            key: 'pagination',
            label: t('分页设置'),
            forceRender: true,
            children: <div className='axis-wrapper'>
                <Form.Item name={['pagination', 'show']} label={t('需要分页')} initialValue >
                    <BoolRadioGroup />
                </Form.Item>
            </div>,
            
        }
    ]} />
}

