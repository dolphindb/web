import { Select, type SelectProps } from 'antd'
import useSWR from 'swr'

import type { DefaultOptionType } from 'antd/es/select/index.js'

import { request } from '@/data-collection/utils.js'

export function NodeSelect (props: SelectProps) {
    
    const { data: { nodes } = { nodes: [ ] }, isLoading } = useSWR(
        'dcp_getNodes',
        async () => request<{ nodes: string[] }>('dcp_getNodes')
    )
    
    return <Select 
        loading={isLoading} 
        options={nodes.map(item => ({ label: item, value: item })) as DefaultOptionType[]} 
        {...props}
    />
}
