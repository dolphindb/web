import './index.scss'

import useSWR from 'swr'

import { Button, message, Result, Spin } from 'antd'

import { t } from '@i18n/index.ts'


import type { DdbObj } from 'dolphindb/browser.js'

import { useCallback, useState } from 'react'

import { model, NodeType } from '@/model.ts'

import { InitStatus, Protocol } from '@/data-collection/type.ts'
import { has_data_collection_auth, test_init } from '@/data-collection/api.ts'

import { Unlogin } from '@/components/Unlogin.tsx'

import code from './script.dos'
import window_code from './script.windows.dos'

import { ParserTemplates } from './ParserTemplates.tsx'
import { Connections } from './Connection.tsx'
import { protocols } from './constant.ts'


export function DataCollection () {
    const { logined, node_type, admin } = model.use(['logined', 'node_type', 'admin'])
    const [is_win, set_is_win] = useState<boolean>()
    
    const { data = { is_inited: InitStatus.UNKONWN, has_auth: undefined }, mutate, isValidating } = useSWR(
        [test_init.KEY],
        async () => {
            const { value } = await model.ddb.eval<DdbObj<boolean>>('existsDatabase("dfs://dataAcquisition")')
            const version = await model.ddb.invoke<string>('version')
            const is_windows = version.toLocaleLowerCase().includes('win')
            set_is_win(is_windows)
            let has_auth = undefined
            if (value) {
                 await model.ddb.eval(is_windows ? window_code : code)
                 has_auth = await has_data_collection_auth()
            }
            return {
                is_inited: value ? InitStatus.INITED : InitStatus.NOT_INITED,
                has_auth
            }
        }
    )
    
    
    
    const on_init = useCallback(async () => {
        await model.ddb.eval(is_win ? window_code : code)
        await model.ddb.call('dcp_init')
        message.success(t('采集平台初始化成功！'))
        mutate()
    }, [is_win])
    
    
    if (!logined)
        return <Unlogin info={t('数据采集平台')} />
        
    if (node_type === NodeType.controller) 
        return <Result
            status='warning'
            title={t('请注意，控制节点无法使用数据采集平台')}
        />
    
    
    if (data.is_inited === InitStatus.UNKONWN || isValidating )
        return <Spin className='data-collection-spin'/> 
    else if (data.is_inited === InitStatus.NOT_INITED)
        return admin 
            ? <Result 
                title={t('初始化数据采集平台')} 
                subTitle={<>
                    {t('初始化操作将新增以下数据库')}
                    <div>dfs://dataAcquisition</div>
                </>}
                extra={<Button type='primary' onClick={on_init}>{t('初始化')}</Button>}
            /> 
            : <Result title={t('数据采集平台功能未初始化，请联系管理员初始化数据采集平台功能')} />
    else if (data.is_inited === InitStatus.INITED) 
        if (!data.has_auth && !admin)
            return <Result title={t('无库表权限，请联系管理员赋权')} />
        else
            switch (model.view) {
                case 'data-connection':
                    return <Connections protocols={is_win ? protocols.filter(item => item !== Protocol.KAFKA) : protocols}/>
                case 'parser-template':
                    return <ParserTemplates />
                default:
                    return null
        }
}
