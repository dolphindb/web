import { MailOutlined, AppstoreOutlined } from '@ant-design/icons'
import { Menu, MenuProps } from 'antd'
import { useState } from 'react'
import { CanvasSetting } from './CanvasSetting.js'
import { GraphSetting, PropsType, SettingOption } from './GraphSetting.js'

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

export function SettingsPanel ({ hidden }: { hidden: boolean }) {
    const [current_page, set_current_page] = useState('canvas')
    
    const pageChange: MenuProps['onClick'] = e => {
        console.log('click ', e)
        set_current_page(e.key)
    }
    
    
return <>
        <div className={`dashboard-settings-panel  ${hidden ? '' : 'hidden'}`}>
            <div className='settings-change'>
                <Menu onClick={pageChange} selectedKeys={[current_page]} mode='horizontal' items={items} />
            </div>
            
            <div className='setting-options'>
                {
                    current_page === 'canvas' ?
                        <CanvasSetting/>
                    :
                        <GraphSetting setting_option={setting_option}/>
                }
            </div>
        </div>
    </>
}

const setting_option: SettingOption[] = [
    {
        key: '基础',
        label: '基础',
        children: [
            {
                type: 'Input',
                title: '标题',
                value: '',
                name: 'title'
            }
        ]
    },
    {
        key: '样式',
        label: '样式',
        children: [
            {
                type: 'Input',
                title: '标题',
                value: '',
                name: 'style'
            }
        ]
    },
    {
        key: 'X轴',
        label: 'X轴',
        children: [
            {
                type: 'Input',
                title: '标题',
                value: '',
                name: 'x'
            }
        ]
    },
    {
        key: 'Y轴',
        label: 'Y轴',
        children: [
            {
                type: 'Input',
                title: '标题',
                value: '',
                name: 'y'
            }
        ]
    },
    
]

