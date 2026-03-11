import { Form } from 'antd'

import { t } from '@i18n'
import { BoolRadioGroup } from '@components/BoolRadioGroup/index.tsx'

export function DataZoomFields () { 
    return <>
         <Form.Item name='x_datazoom' label={t('X 轴缩略轴')} initialValue={false}>
            <BoolRadioGroup />
        </Form.Item>
        <Form.Item name='y_datazoom' label={t('Y 轴缩略轴')} initialValue={false}>
            <BoolRadioGroup />
        </Form.Item>
    </>
}
