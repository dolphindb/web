import './index.scss'

import { Collapse, Form, Input } from 'antd'

import { t } from '../../../i18n/index.js'
import { useMemo } from 'react'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'


export const BasicFormFields = ({ type }: { type: 'chart' | 'table' }) => { 
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            {type === 'chart' && <>
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
                <Form.Item name='with_split_line' label='展示网格线' initialValue={false}>
                    <BoolRadioGroup />
                </Form.Item>
            </>}
            {type === 'table' && <>
                <Form.Item initialValue={false} name='bordered' label={t('展示边框')}>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item initialValue name='need_select_cols' label={t('展示列选择')}>
                    <BoolRadioGroup />
                </Form.Item>
            </>}
        </div>
    }, [ type ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}




