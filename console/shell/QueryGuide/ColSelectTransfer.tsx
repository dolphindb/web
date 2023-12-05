import { Transfer, type TransferProps } from 'antd'
import { type IColumn } from './type.js'
import { useCallback, useMemo, useState } from 'react'

interface IProps {
    cols: IColumn[]
    onChange?: (keys: string[]) => void
    value?: string[]
}

export function ColSelectTransfer (props: IProps) {
    const { cols, value = [ ], onChange } = props
    
    const [target_keys, set_target_keys] = useState(value)   
    
    const options = useMemo(() => cols.map(item => ({ title: item.name, key: item.name })), [cols])
    
    const on_value_change = useCallback((keys: string[]) => { 
        set_target_keys(keys)
        onChange(keys)
    }, [ ])
    
    
    
    return <Transfer
        className='col-select-transfer'
        showSearch
        onChange={on_value_change}
        targetKeys={target_keys}
        render={item => item.title}
        dataSource={options}
    />
}
