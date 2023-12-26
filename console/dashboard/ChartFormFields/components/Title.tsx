import { Form, Input, InputNumber } from 'antd'
import { t } from '../../../../i18n/index.js'

export function TitleFields () { 
    return <>
        <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
            <Input />
        </Form.Item>
        
        <Form.Item name='title_size' label={t('标题字号' )}initialValue={18}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
    </>
}
