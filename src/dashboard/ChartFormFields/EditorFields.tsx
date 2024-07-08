import './index.scss'

import { Collapse, Form, Input } from 'antd'

import { useMemo } from 'react'

import { t } from '../../../i18n/index.js'

export function EditorFields () { 
    
    
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            <Form.Item name='button_text' label={t('运行按钮文字')} initialValue={t('按钮文字')}>
                <Input />
            </Form.Item>
         </div>
    }, [  ])
    
    return <Collapse
            activeKey='basic'
            items={[{
                key: 'basic',
                label: t('基本属性'),
                children: FormFields,
                forceRender: true
        }]} />
}




