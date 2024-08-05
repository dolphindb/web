import { Button, Result, message } from 'antd'

import { useMemoizedFn } from 'ahooks'

import { t } from '../../../../i18n/index.js'

import code from '../../dolphindb-scripts/script.dos'

import { model } from '@/model.js'

interface IProps {
    test_init: () => Promise<void>
}

export function InitPage ({ test_init }: IProps) {
    
    const on_init = useMemoizedFn(async () => {
        await model.ddb.eval(code)
        await model.ddb.call('dcp_init')
        message.success(t('采集平台初始化成功！'))
        await test_init()
    })
    
    return <Result 
        title={t('初始化数据采集平台')} 
        subTitle={<>
            {t('初始化操作将新增以下数据库')}
            <div>dfs://dataAcquisition</div>
        </>}
        extra={<Button type='primary' onClick={on_init}>{t('初始化')}</Button>}
    />
}
