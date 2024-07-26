import { Button, type MenuProps, type ButtonProps, Dropdown } from 'antd'
import { useMemo } from 'react'
import { PlusSquareOutlined } from '@ant-design/icons'

import { variables } from '../Variable/variable.js'
import { t } from '../../../i18n/index.js'

interface IProps extends ButtonProps { 
    on_insert: (val: string) => void
}

export function InsertVariableBtn (props: IProps) { 
    const { on_insert, ...others } = props
    
    
    const { variable_infos = [ ] } = variables.use(['variable_infos'])
    
    const items = useMemo<MenuProps['items']>(() => { 
        return variable_infos.map(item => ({
            label: <a onMouseDown={e => { e.preventDefault() }} onClick={e => {
                e.preventDefault()
                try {
                    on_insert?.(`{{${item.name}}}`)
                } catch { }
            }}>{item.name}</a>,
            key: item.id
        }))
    }, [variable_infos, on_insert])
    
    return !!variable_infos?.length && <Dropdown trigger={['hover']} menu={{ items }} overlayClassName='variable-dropdown'>
        <Button onMouseDown={e => { e.preventDefault() }} {...others} icon={<PlusSquareOutlined />}>{t('插入变量')}</Button>
    </Dropdown>
    
}
