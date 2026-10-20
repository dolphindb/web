import { Button, Input, Tooltip } from 'antd'
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { ProviderFormData } from './types.ts'


export function ProviderHeaders ({ headers, on_change }: {
    headers: ProviderFormData['headers']
    on_change: (headers: ProviderFormData['headers']) => void
}) {
    return <div className='ai-provider-headers'>
        <div className='ai-provider-headers-title'>
            {t('自定义 HTTP Header')}
            <Tooltip title={t('DolphinX 调用外部 AI API 时添加的请求头，同名时覆盖。')}>
                <InfoCircleOutlined className='ai-provider-headers-info' tabIndex={0} />
            </Tooltip>
        </div>
        {headers.map((header, index) => <div className='ai-provider-header-row' key={index}>
            <Input
                aria-label={t('Header 名称')}
                placeholder={t('Header 名称')}
                value={header.name}
                onChange={e => {
                    on_change(headers.map((item, i) => i === index ? { ...item, name: e.target.value } : item))
                }}
            />
            <Input
                aria-label={t('Header 值')}
                placeholder={t('Header 值')}
                value={header.value}
                onChange={e => {
                    on_change(headers.map((item, i) => i === index ? { ...item, value: e.target.value } : item))
                }}
            />
            <Button
                type='text'
                danger
                icon={<DeleteOutlined />}
                aria-label={t('删除 Header')}
                title={t('删除 Header')}
                onClick={() => { on_change(headers.filter((_, i) => i !== index)) }}
            />
        </div>)}
        <Button
            type='dashed'
            icon={<PlusOutlined />}
            onClick={() => { on_change([...headers, { name: '', value: '' }]) }}
        >{t('添加 Header')}</Button>
    </div>
}
