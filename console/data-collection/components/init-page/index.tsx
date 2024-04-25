import { Button, Result } from 'antd'

import { useMemoizedFn } from 'ahooks'

import { t } from '../../../../i18n/index.js'

export function InitPage () {
    
    const on_init = useMemoizedFn(() => {
        
    })
    
    return <Result 
        title={t('初始化数据采集平台')} 
        subTitle={<div>
            {t('初始化操作将新增以下数据库')}
            <div>数据库1</div>
            <div>数据库2</div>
        </div>}
        extra={<Button type='primary' onClick={on_init}>初始化</Button>}
    />
}
