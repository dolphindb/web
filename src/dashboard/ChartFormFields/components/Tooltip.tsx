import { Form } from 'antd'

import { t } from '../../../../i18n/index.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'

export function TooltipFields () { 
    return <>
        <Form.Item name={['tooltip', 'show']} label={t('是否展示')} initialValue>
            <BoolRadioGroup />
        </Form.Item>
    
    </>
}
