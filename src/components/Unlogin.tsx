import { Button, Result } from 'antd'

import { t } from '@i18n'

import { model } from '@model'


export function Unlogin ({ info }: { info: string }) {
    return <Result
        status='warning'
        className='interceptor'
        title={t('登录后可查看{{info}}', { info })}
        extra={
            <Button type='primary' onClick={async () => { await model.goto_login() }}>
                {t('去登录')}
            </Button>
        }
    />
}
