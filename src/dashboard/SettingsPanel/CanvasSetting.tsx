import { type CollapseProps, Form, Input, Collapse } from 'antd'

import { t } from '../../../i18n/index.js'

export function CanvasSetting () {
    interface SettingOptions {
        title: string
        column: number
        row: number
    }
    
    const canvas_collapsse: CollapseProps['items'] = [
        {
            key: '1',
            label: t('基础'),
            children: (
                <Form.Item<SettingOptions> label={t('标题')} name='title'>
                    <Input />
                </Form.Item>
            )
        },
        {
            key: '2',
            label: t('画布样式'),
            children: (
                <div>
                    <Form.Item<SettingOptions> label={t('列数')} name='column'>
                        <Input />
                    </Form.Item>
                    <Form.Item<SettingOptions> label={t('行数')} name='row'>
                        <Input />
                    </Form.Item>
                </div>
            )
        }
    ]
    
    return <Form
            name='basic'
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 600 }}
            initialValues={{ remember: true }}
            autoComplete='off'
            size='small'
        >
            <Collapse defaultActiveKey={['1']} ghost expandIconPosition='end' items={canvas_collapsse} />
        </Form>
}
