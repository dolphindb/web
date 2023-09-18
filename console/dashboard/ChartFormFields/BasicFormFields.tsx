import { Collapse, Form, Input, Select } from 'antd'
import { t } from '../../../i18n/index.js'
import { useMemo } from 'react'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'

import './AxisFormFields.scss'



export const BasicFormFields = () => { 
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={ t('标题') } initialValue={ t('标题') }>
                <Input />
            </Form.Item>
            <Form.Item name='with_legend' label={t('图例')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item  name='x_datazoom' label={t('X轴缩略轴')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item  name='y_datazoom' label={t('Y轴缩略轴')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
        </div>
    }, [ ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}




