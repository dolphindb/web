import { AutoComplete, type AutoCompleteProps } from 'antd'

import { useCallback, useEffect, useState } from 'react'

import { t } from '../../../../i18n/index.js'
import { query_enums } from '../utils.js'

interface IProps extends AutoCompleteProps { 
    table: string
    database: string
    col: string
}

export function EnumAutoComplete (props: IProps) { 
    const { table, database, col, options: custom_options, ...others } = props
    
    const [options, set_options] = useState(custom_options)
    
    const get_options = useCallback(async () => { 
        const opt = await query_enums({ dbName: database, tbName: table, col })
        set_options(opt)
    }, [database, table, col])
    
    useEffect(() => { 
        if (!custom_options?.length)
            get_options()
    }, [ col, database, table])
    
    return <AutoComplete
        placeholder={t('请输入对比值')}
        allowClear
        filterOption
        options={options}
        {...others}
    />
    
}
