import { Button, Result } from 'antd'

import { t } from '@i18n/index.js'

import { model } from '@/model.ts'

export function Unlogin ({ info }: { info: string }) {
    return <Result
        status='warning'
        className='interceptor'
        title={t('登录后可查看{{info}}', { info: t(info) })}
        extra={
            <Button type='primary' onClick={async () => { await model.goto_login() }}>
                {t('去登录')}
            </Button>
        }
    />
}
