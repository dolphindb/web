import { Transfer } from 'antd'
import { type IColumn } from '../type.js'
import { useCallback, useMemo, useState } from 'react'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { t } from '../../../../i18n/index.js'

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
                <CloseCircleOutlined className='not-selected-icon' />{t('未选查询列')}
            </div>,
            <div className='transfer-list-title'>
                <CheckCircleOutlined className='selected-icon'/>
                {t('已选查询列')}
            </div>
        ]}
        className='col-select-transfer'
        showSearch
        onChange={on_value_change}
        targetKeys={target_keys}
        render={item => item.title}
        dataSource={options}
        operations={[t('增加查询列'), t('删除查询列')]}
    />
}
