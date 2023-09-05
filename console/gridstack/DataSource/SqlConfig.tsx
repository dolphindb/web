import { useState } from 'react'

import { Switch, Input } from 'antd'

export function SqlConfig () {
    const [is_auto_refresh, set_is_auto_refresh] = useState(false)
    
    const auto_refresh_change_handler = (checked: boolean) => {
        set_is_auto_refresh(checked)
    }
    
    return <>
        <div className='data-source-config-sqlconfig'>
            <div className='data-source-config-sqlconfig-left'>
                <div style={{ marginRight: '20px' }}>
                    自动刷新：
                    <Switch size='small' onChange={auto_refresh_change_handler} />
                </div>
                {is_auto_refresh 
                    ? <div>
                        间隔时间：
                        <Input size='small' style={{ width: 50, marginRight: '5px' }}/>
                        s
                    </div> 
                    : <></>
                }
            </div>
            <div className='data-source-config-sqlconfig-right'>
                <div>
                    最大行数：
                    <Input size='small' style={{ width: 50 }}/>
                </div>
            </div>
        </div>
    </>
}
