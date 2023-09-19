import { Collapse, Form, Input, Select } from 'antd'
import { t } from '../../../i18n/index.js'
import { useMemo } from 'react'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'

import './index.scss'

export const BasicFormFields = (props: { type: 'chart' | 'table' }) => { 
    const { type  } = props
    const FormFields = useMemo(() => { 
        const is_table = type === 'table'
        const is_chart = type === 'chart'
        
        const BasicChartSetting = <>
            <Form.Item name='with_legend' label={t('图例')} initialValue>
            <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='x_datazoom' label={t('X 轴缩略轴')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='y_datazoom' label={t('Y 轴缩略轴')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
        </>
  
        const BasicTableSetting =  <>
            <Form.Item initialValue={false} name='bordered' label={t('展示边框')}>
                <BoolRadioGroup />
            </Form.Item>
        </>
        
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={ t('标题') } initialValue={ t('标题') }>
                <Input />
            </Form.Item>
            {is_chart && BasicChartSetting}
            {is_table && BasicTableSetting}
        </div>
    }, [ type ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}




