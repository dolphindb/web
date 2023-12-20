import { Select } from 'antd'
import useSWR from 'swr'
import { query_enums } from '../utils.js'
import { t } from '../../../../i18n/index.js'

interface IProps { 
    table: string
    database: string
    col: string
}

export function EnumSelect (props: IProps) { 
    const { table, database, col, ...others } = props
    
    const { data, isLoading } = useSWR(
        ['generateEnumerate', table, database, col],
        async () => query_enums({ dbName: database, tbName: table, col })
    )
    
    
    return <Select
        {...others}
        loading={isLoading}
        showSearch
        mode='tags'
        options={data}
        placeholder={t('请输入对比值')}
    />
}
