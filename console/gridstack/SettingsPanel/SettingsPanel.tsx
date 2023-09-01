import { MailOutlined, AppstoreOutlined } from '@ant-design/icons'
import { Menu, MenuProps } from 'antd'
import { useState } from 'react'
import { CanvasSetting } from './CanvasSetting.js'

const items: MenuProps['items'] = [
    {
      label: '画布',
      key: 'canvas',
      icon: <MailOutlined />,
    },
    {
      label: '图表',
      key: 'graph',
      icon: <AppstoreOutlined />,
    },
]

export function SettingsPanel () {
    const [current_page, set_current_page] = useState('canvas')
    
    const pageChange: MenuProps['onClick'] = e => {
        console.log('click ', e)
        set_current_page(e.key)
    }
return <>
        <div className='dashboard-settings-panel'>
            <div className='settings-change'>
                <Menu onClick={pageChange} selectedKeys={[current_page]} mode='horizontal' items={items} />
            </div>
            
            <div className='setting-options'>
                {
                    current_page === 'canvas' ?
                        <CanvasSetting/>
                    :
                    <>
                        <div>图标</div>
                        <div>页面大小</div>
                    </>
                }
            </div>
        </div>
    </>
}


