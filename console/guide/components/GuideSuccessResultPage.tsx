import './index.scss'

import { Button, Result } from 'antd'
import { t } from '../../../i18n/index.js'


interface IProps { 
    back: () => void
    on_create_again: () => void
    database: string
    table: string
}


export function GuideSuccessResultPage (props: IProps) { 
    const { back, on_create_again, database, table } = props
    
    return <Result
        status='success'
        title={t('创建成功')}
        subTitle={<>
            {t('数据库：{{name}}', { name: database })}
            <br />
            {t('数据表：{{name}}', { name: table })}
        </>}
        extra={
            [
                <Button onClick={back}>{t('上一步')}</Button>,
                <Button type='primary' onClick={on_create_again}>{t('再次创建')}</Button>
            ]
         }
    />
    
}
