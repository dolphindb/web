import './index.scss'

import { Collapse, Descriptions, type DescriptionsProps, Form, InputNumber, Select, type CollapseProps, Input, Pagination } from 'antd'

import { useMemo, useState } from 'react'

import { isNumber } from 'lodash'

import { t } from '@i18n'

import { type Widget } from '../../model.js'
import { convert_list_to_options, format_number, format_time, parse_text } from '../../utils.ts'


import { type IDescriptionsConfig } from '../../type.js'
import { FormDependencies } from '../../../components/FormDependencies/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { format_time_options } from '../../ChartFormFields/constant.js'
import type { GraphComponentProps, GraphConfigProps } from '@/dashboard/graphs.ts'



interface IProps { 
    widget: Widget
    data_source: any[]
}

export function DBDescriptions ({ data_source: { data }, widget }: GraphComponentProps) {
    const config = widget.config as any as IDescriptionsConfig
    
    const items = useMemo<DescriptionsProps['items']>(() => { 
        const { col_properties } = widget.config as unknown as IDescriptionsConfig
        return data.map((item, idx) => {
            const { color: custom_color, threshold, time_format, decimal_places, is_thousandth_place, high_to_threshold_color = 'red', low_to_threshold_color = 'green' } = col_properties?.[idx] ?? { }
            let color = null
            if (isNumber(threshold))
                color = item[config.value_col] > threshold ? high_to_threshold_color : low_to_threshold_color
            
            // 阈值颜色优先级高于自定义颜色高于默认颜色
            color = color || custom_color || '#fff'
            
            let value = item[config.value_col]
            if (time_format)
                value = format_time(value, time_format)
            else
                value = format_number(value, decimal_places, is_thousandth_place)
            
            return {
                key: idx,
                label: item[config.label_col],
                children: value,
                labelStyle: { fontSize: config.label_font_size },
                contentStyle: {
                    fontWeight: 500,
                    color: color,
                    fontSize: config.value_font_size
                }
            }
            
        })
    }, [config, data])
    
    
    return <>
        <Descriptions
            colon={false}
            className='my-descriptions'
            layout='vertical'
            title={<div style={{ fontSize: config.title_size }}>{parse_text(config.title ?? '')}</div>}
            items={items}
            column={config.column_num}
        />
    </>
}


export function DBDescriptionsForm ({ data_source: { data, cols } }: GraphConfigProps) {
    const [page, setPage] = useState(1)
    
    return <>
        <BasicFormFields type='description'/>
        <Collapse items={[{
            children: <div className='description-setting-form'>
                <Form.Item name='label_col' label={t('标签列')} initialValue={cols[0]}>
                    <Select options={convert_list_to_options(cols)} />
                </Form.Item>
                <Form.Item name='value_col' label={t('值列')} initialValue={cols[0]}>
                    <Select options={convert_list_to_options(cols)} />
                </Form.Item>
                
                <Form.Item name='label_font_size' label={t('标签字号')}>
                    <InputNumber addonAfter='px'/>
                </Form.Item>
                
                <Form.Item name='value_font_size' label={t('值字号')}>
                    <InputNumber addonAfter='px'/>
                </Form.Item>
                
                <Form.Item name='column_num' label={t('每行展示数量')} initialValue={4}>
                    <InputNumber />
                </Form.Item>
                <FormDependencies dependencies={['label_col']}>
                    {({ label_col }) => { 
                        if (!label_col)
                            return null
                        return <Form.List name='col_properties' initialValue={data.map(item => ({ label: item[label_col] }))}>
                            {fields => { 
                                const labels = data.map(item => (item[label_col]))
                                const items: CollapseProps['items'] = fields.map((field, idx) => ({
                                    key: idx,
                                    label: labels[field.name],
                                    forceRender: true,
                                    children: <>
                                        <Form.Item name={[field.name, 'label']} hidden>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'color']} label={t('值颜色')}>
                                            <StringColorPicker />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'threshold']} label={t('阈值')}>
                                            <InputNumber />
                                        </Form.Item>
                                        <FormDependencies dependencies={[['col_properties', field.name, 'threshold']]}>
                                            {value => { 
                                                const { threshold } = value?.col_properties?.[field.name]
                                                if (isNaN(threshold))
                                                    return null
                                                return <>
                                                    <Form.Item label={t('低于阈值配色')} name={[field.name, 'low_to_threshold_color']}>
                                                        <StringColorPicker />
                                                    </Form.Item>
                                                    <Form.Item label={t('高于阈值配色')} name={[field.name, 'high_to_threshold_color']} >
                                                        <StringColorPicker />
                                                    </Form.Item>
                                                </>
                                            } }
                                        </FormDependencies>
                                        <Form.Item label={t('时间格式化')} name={[field.name, 'time_format']}>
                                            <Select options={format_time_options} allowClear/>
                                        </Form.Item>
                                    
                                        <Form.Item label={t('小数位数')} name={[field.name, 'decimal_places']} >
                                            <InputNumber min={0} />
                                        </Form.Item>
                                        <Form.Item label={t('是否千分位')} name={ [field.name, 'is_thousandth_place']} initialValue={false}>
                                            <BoolRadioGroup />
                                        </Form.Item>
                                    
                                    </>,
                                }))
                                
                                return <>
                                    <Collapse items={items.slice(10 * (page - 1), page * 10)} size='small' />
                                    <Pagination className='description-pagination' showSizeChanger={false} size='small' total={items.length} onChange={page => { setPage(page) }}/>
                                </>
                            }}
                        </Form.List>
                    } }
                </FormDependencies>
            </div>,
            key: 'col',
            label: t('列属性'),
            forceRender: true
        }]}/>
    </>
}
