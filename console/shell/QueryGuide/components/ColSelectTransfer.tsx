import { Transfer } from 'antd'
import { type IColumn } from '../type.js'
import { useCallback, useMemo, useState } from 'react'
import { CheckSquareFilled, CloseSquareFilled } from '@ant-design/icons'

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
        titles={[
            <div className='transfer-list-title'>
                <CloseSquareFilled className='not-selected-icon'/>未选查询列
            </div>,
            <div className='transfer-list-title'>
                <CheckSquareFilled className='selected-icon'/>
                已选查询列
            </div>
        ]}
        className='col-select-transfer'
        showSearch
        onChange={on_value_change}
        targetKeys={target_keys}
        render={item => item.title}
        dataSource={options}
        operations={['增加查询列', '删除查询列']}
    />
}
