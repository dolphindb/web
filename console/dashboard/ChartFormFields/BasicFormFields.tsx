import { Collapse, Form, Input, Select } from 'antd'
import { t } from '../../../i18n/index.js'
import { useMemo } from 'react'
import './AxisFormFields.scss'

export const BasicFormFields = () => { 
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={ t('标题') } initialValue={ t('标题') }>
                <Input />
            </Form.Item>
        </div>
    }, [ ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        
        children: FormFields
     }]} />
}




