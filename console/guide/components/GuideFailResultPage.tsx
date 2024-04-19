import './index.scss'
import { Button, Result } from 'antd'
import { t } from '../../../i18n/index.js'

interface IProps { 
    back: () => void
    on_create_again: () => void
    error_msg?: string
}

export function GuideFailResultPage (props: IProps) { 
    const { back, on_create_again, error_msg } = props
    
    return <Result
        status='error'
        title={t('创建失败')}
        subTitle={error_msg && t('错误信息：{{error_msg}}', { error_msg })}
        extra={[
            <Button onClick={back}>{t('上一步')}</Button>,
            <Button type='primary' onClick={on_create_again}>{t('再次创建')}</Button>
        ]}
    />
}

