import { Form, InputNumber } from 'antd'
import { t } from '../../../../i18n/index.js'

export function WrapperFields () { 
    return <>
        <Form.Item name={['padding', 'top']} label={t('上内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        
        <Form.Item name={['padding', 'bottom']} label={t('下内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        <Form.Item name={['padding', 'left']} label={t('左内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        
        <Form.Item name={['padding', 'right']} label={t('右内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
    </>
} 
