


import { useId, type ReactNode } from 'react'
import useSWR from 'swr'

import { Button, message, Result, Spin } from 'antd'

import { useMemoizedFn } from 'ahooks'

import { t } from '@i18n/index.ts'

import { model, NodeType } from '@/model.ts'

import { InitStatus } from '@/data-collection/type.ts'
import { test_init } from '@/data-collection/api.ts'

import { Unlogin } from '@/components/Unlogin.tsx'

import code from './dolphindb-scripts/script.dos'

import { ParserTemplates } from './ParserTemplates.tsx'
import { Connections } from './Connection.tsx'

export function DataCollection () {
    
    if (!model.logined)
        return <Unlogin info={t('数采平台')} />
        
    if (model.node_type === NodeType.controller) 
        return <Result
            status='warning'
            title={t('请注意，控制节点无法使用数采平台')}
        />
    
    const { data = InitStatus.UNKONWN, mutate } = useSWR(
        [test_init.KEY],
        test_init
    )
    
    const on_init = useMemoizedFn(async () => {
        await model.ddb.eval(code)
        await model.ddb.call('dcp_init')
        message.success(t('采集平台初始化成功！'))
        mutate()
    })
    
    
    
    if (data === InitStatus.UNKONWN)
        return <Spin /> 
    
    if (data === InitStatus.NOT_INITED)
        return <Result 
            title={t('初始化数据采集平台')} 
            subTitle={<>
                {t('初始化操作将新增以下数据库')}
                <div>dfs://dataAcquisition</div>
            </>}
            extra={<Button type='primary' onClick={on_init}>{t('初始化')}</Button>}
        />
    else if (data === InitStatus.INITED) 
        switch (model.view) {
            case 'connection':
                return <Connections />
            case 'parser-template':
                return <ParserTemplates />
            default: return null
        }
}
