import './index.scss'

import { useMemo } from 'react'
import { Form, Input, Collapse, InputNumber } from 'antd'

import { t } from '../../../i18n/index.js'

import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'
import { StringColorPicker } from '../../components/StringColorPicker/index.js'
import { PaddingSetting, VariableSetting } from './BasicFormFields.js'

export function BasicFormFields ({ type }: { type: 'chart' | 'table' }) { 
    const { variable_infos } = variables.use(['variable_infos'])
    
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
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
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_split_line' label={t('Y 轴分割线')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
        </div>
    }, [ type, variable_infos ])
    
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

export function OrderFormFields () {
    const FormFields = useMemo(() => { 
        return  <>
            <Form.Item name='bar_color' label={t('柱状图颜色')} initialValue={null}>
                <StringColorPicker />
            </Form.Item>
            <Form.Item name='line_color' label={t('曲线颜色')} initialValue={null}>
                <StringColorPicker />
            </Form.Item>
            <Form.Item label={t('倍率')} name='time_rate' initialValue={100}>
                <Input type='number'/>
            </Form.Item>
            <Form.Item label={t('行情数据档数')} name='market_data_files_num' initialValue={10}>
                <Input type='number'/>
            </Form.Item>
        </>
    }, [ ])
    return <Collapse items={[
        {
            key: 'series',
            label: t('订单图'),
            children: FormFields,
            forceRender: true,
        }
    ]} />
}


