import { Button, Result, message } from 'antd'

import { useMemoizedFn } from 'ahooks'

import { t } from '../../../../i18n/index.js'
import { dcp_model } from '../../model.js'

export function InitPage () {
    
    const on_init = useMemoizedFn(async () => {
        await dcp_model.init_database()
        message.success(t('采集平台初始化成功！'))
    })
    
    return <Result 
        title={t('初始化数据采集平台')} 
        subTitle={<>
            {t('初始化操作将新增以下数据库')}
            <div>dfs://dataAcquisition</div>
        </>}
        extra={<Button type='primary' onClick={on_init}>初始化</Button>}
    />
}
