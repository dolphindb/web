import { MailOutlined, AppstoreOutlined } from '@ant-design/icons'
import { Form, Menu, MenuProps } from 'antd'
import { useMemo, useState } from 'react'
import { CanvasSetting } from './CanvasSetting.js'
import { GraphSetting, PropsType, SettingOption } from './GraphSetting.js'
import { graph_config } from '../graph-config.js'
import { GraphType } from '../graph-types.js'


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

interface IProps {
    hidden: boolean
    type: string
    id: string
}

export function SettingsPanel (props: IProps) {
    const { hidden, type = GraphType.TABLE, id } = props
    const [current_page, set_current_page] = useState('canvas')
    
    const pageChange: MenuProps['onClick'] = e => {
        console.log('click ', e)
        set_current_page(e.key)
    }
    
    
    const GraphSetting = useMemo(() => { 
        if (type in GraphType)
            return graph_config[type]?.config_form_fields ?? <></>
        else
            return null
    }, [ type ])
    
    
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
                    <Form>
                         <GraphSetting />
                   </Form>
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

