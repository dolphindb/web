import { Select } from 'antd'
import { type SelectProps } from 'antd/lib'
import { useId, useState } from 'react'
import useSWR from 'swr'

import { t } from '@i18n'
import { model } from '@model'
import { shell } from '@/shell/model.ts'

export function ExistDBSelect (props: SelectProps) {
    
    const [options, set_options] = useState([ ])
    const id = useId()
    
    const { isLoading } = useSWR(
        ['getClusterDFSDatabases', id],
        async () => model.ddb.invoke<string[]>(
            'getClusterDFSDatabases',
            await shell.can_hide_sysdb() ? [false] : undefined),
        {
            onSuccess (data: string[]) { 
                set_options(data?.map(item => 
                    ({ label: item.slice(6), value: item.slice(6) }))) 
            }
        }
    )
    
    return <Select 
        loading={isLoading} 
        placeholder={t('请选择现有库')} 
        {...props} 
        options={options}
    />
}
