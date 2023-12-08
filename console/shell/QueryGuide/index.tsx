import './index.scss'

import { Drawer, Tooltip, Segmented } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { QueryGuideType } from './type.js'
import { t } from '../../../i18n/index.js'
import { QueryGuide } from './QueryGuide.js'
import { SqlEditGuide } from './SqlEditGuide.js'
import { FileSearchOutlined } from '@ant-design/icons'
import { useBoolean } from 'ahooks'

interface IProps { 
    database: string
    table: string
}

const components = {
    [QueryGuideType.QUERY_GUIDE]: QueryGuide,
    [QueryGuideType.SQL]: SqlEditGuide
}

export function QueryGuideIcon (props: IProps) {
    
    const { table, database } = props
    
    const [open, action] = useBoolean(false)
    
    const [type, set_type] = useState<QueryGuideType>(QueryGuideType.QUERY_GUIDE)
    
    useEffect(() => { 
        set_type(QueryGuideType.QUERY_GUIDE)
    }, [ ])
    
    const change_type = useCallback(value => {
        set_type(value)
    }, [ ]) 
    
    const Component = useMemo(() => components[type], [type])
    
    return <>
        <Tooltip title={t('进入查询向导')}>
            <FileSearchOutlined onClick={action.setTrue} className='query-icon'/>
        </Tooltip>
        <Drawer
            destroyOnClose
            title={`${database}/${table}` }
            extra={
                <Segmented value={type} onChange={change_type} options={[{ label: t('向导界面'), value: QueryGuideType.QUERY_GUIDE }, { label: t('编辑界面'), value: QueryGuideType.SQL }]} />
            }
            maskClosable={false}
            onClose={action.setFalse}
            width={820}
            className='query-guide-drawer'
            open={open}
            placement='left'
        >
        <Component {...props} />
    </Drawer>
    
    </>
 }
