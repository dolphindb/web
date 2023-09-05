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
                <div className='data-source-config-sqlconfig-left-refresh'>
                    自动刷新：
                    <Switch size='small' onChange={auto_refresh_change_handler} />
                </div>
                {is_auto_refresh 
                    ? <div>
                        间隔时间：
                        <Input size='small' className='data-source-config-sqlconfig-left-intervals-input'/>
                        s
                    </div> 
                    : <></>
                }
            </div>
            <div className='data-source-config-sqlconfig-right'>
                <div>
                    最大行数：
                    <Input size='small' className='data-source-config-sqlconfig-right-maxline-input'/>
                </div>
            </div>
        </div>
    </>
}
