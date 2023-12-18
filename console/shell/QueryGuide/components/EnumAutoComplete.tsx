import { AutoComplete, type AutoCompleteProps, Select } from 'antd'
import useSWR from 'swr'
import { t } from '../../../../i18n/index.js'
import { query_enums } from '../utils.js'

interface IProps extends AutoCompleteProps { 
    table: string
    database: string
    col: string
}

export function EnumAutoComplete (props: IProps) { 
    const { table, database, col, options, ...others } = props
    
    const { data = options } = useSWR(
        options?.length ? null : ['generateEnumerate', table, database, col], 
        async () => query_enums({ dbName: database, tbName: table, col })
    )   
    
    return <AutoComplete
        placeholder={t('请输入对比值')}
        allowClear
        filterOption
        options={data}
        {...others}
    />
    
}
