import { Select } from 'antd'
import { type SelectProps } from 'antd/lib'
import { useId, useState } from 'react'

import useSWR from 'swr'

import { model } from '../../../model.js'
import { t } from '@i18n'

export function ExistDBSelect (props: SelectProps) {
    
    const [options, set_options] = useState([ ])
    const id = useId()
    
    const { isLoading } = useSWR(
        ['getClusterDFSDatabases', id],
        async () => model.ddb.eval('getClusterDFSDatabases()'),
        { onSuccess: (data: any) => { 
            set_options(data?.value?.map(item => ({ label: item.slice(6), value: item.slice(6) }))) 
        } }
    )
    
    return <Select 
        loading={isLoading} 
        placeholder={t('请选择现有库')} 
        {...props} 
        options={options}
    />
}
