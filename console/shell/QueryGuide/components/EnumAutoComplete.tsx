import { AutoComplete, Select } from 'antd'
import useSWR from 'swr'
import { request } from '../../../guide/utils.js'
import { t } from '../../../../i18n/index.js'
import { query_enums } from '../utils.js'

interface IProps { 
    table: string
    database: string
    col: string
}

const DEFAULT_DATA = {
    enumList: [ ]
}

export function EnumAutoComplete (props: IProps) { 
    const { table, database, col, ...others } = props
    
    const { data } = useSWR(
        ['generateEnumerate', table, database, col],
        async () => query_enums({ dbName: database, tbName: table, col })
    )
    
    
    return <AutoComplete
        {...others}
        placeholder={t('请输入对比值')}
        allowClear
        filterOption
        options={data}
    />
    
}
