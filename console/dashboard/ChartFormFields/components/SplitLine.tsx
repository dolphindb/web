import { Form, InputNumber, Select } from 'antd'
import { t } from '../../../../i18n/index.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'
import { line_type_options } from '../constant.js'
import { ILineType } from '../type.js'

export function SplitLineFields () { 
    return <>
        <Form.Item name={['splitLine', 'show']} label={t('是否展示')} initialValue={false}>
            <BoolRadioGroup />
        </Form.Item>
        <Form.Item name={['splitLine', 'lineStyle', 'color']} label={t('线条颜色')} initialValue='#6E6F7A'>
            <StringColorPicker />
        </Form.Item>
        <Form.Item name={['splitLine', 'lineStyle', 'width']} label={t('线宽')} initialValue={1}>
            <InputNumber addonAfter='px' />
        </Form.Item>
        <Form.Item name={['splitLine', 'lineStyle', 'type']}  label={t('线类型')} initialValue={ILineType.DASHED}>
            <Select options={line_type_options} />
        </Form.Item>
    </>
}
