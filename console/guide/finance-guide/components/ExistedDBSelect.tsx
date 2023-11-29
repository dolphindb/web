import { Select } from 'antd'
import { type SelectProps } from 'antd/lib'
import { useState } from 'react'
import { model } from '../../../model.js'
import useSWR from 'swr'

export function ExistDBSelect (props: SelectProps) {
    
    const [options, set_options] = useState([ ])
    
    const { isLoading } = useSWR(
        'getClusterDFSDatabases',
        async () => model.ddb.eval('getClusterDFSDatabases()'),
        { onSuccess: (data: any) => { set_options(data?.value?.map(item => ({ label: item.slice(6), value: item.slice(6) }))) } }
    )
    
    return <Select loading={isLoading} placeholder='请选择现有库' {...props} options={options}/>
}
