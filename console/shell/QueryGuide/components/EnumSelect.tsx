import { Select } from 'antd'
import useSWR from 'swr'
import { query_enums } from '../utils.js'
import { t } from '../../../../i18n/index.js'
import { useCallback, useEffect, useState } from 'react'

interface IProps { 
    table: string
    database: string
    col: string
}

export function EnumSelect (props: IProps) { 
    const { table, database, col, ...others } = props
    
    const [options, set_options] = useState([ ])
    
    const get_options = useCallback(async () => { 
        const opt = await query_enums({ dbName: database, tbName: table, col })
        set_options(opt)
    }, [database, table, col ])
    
    useEffect(() => { 
        get_options()
    }, [ database, table, col ])
    
    
    return <Select
        {...others}
        showSearch
        mode='tags'
        options={options}
        placeholder={t('请输入对比值')}
    />
}
