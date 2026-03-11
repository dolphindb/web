import { Form, InputNumber, Select } from 'antd'

import { t } from '@i18n'

import { BoolRadioGroup } from '@components/BoolRadioGroup/index.tsx'
import { StringColorPicker } from '@components/StringColorPicker/index.tsx'
import { line_type_options } from '@/dashboard/ChartFormFields/constant.ts'
import { ILineType } from '@/dashboard/ChartFormFields/type.ts'

export function SplitLineFields () { 
    return <>
        <Form.Item name={['splitLine', 'show']} label={t('是否展示')} initialValue={false}>
            <BoolRadioGroup />
        </Form.Item>
        <Form.Item name={['splitLine', 'lineStyle', 'color']} label={t('线颜色')} initialValue='#6E6F7A'>
            <StringColorPicker />
        </Form.Item>
        <Form.Item name={['splitLine', 'lineStyle', 'width']} label={t('线宽')} initialValue={1}>
            <InputNumber suffix='px' />
        </Form.Item>
        <Form.Item name={['splitLine', 'lineStyle', 'type']}  label={t('线类型')} initialValue={ILineType.DASHED}>
            <Select options={line_type_options} />
        </Form.Item>
    </>
}
