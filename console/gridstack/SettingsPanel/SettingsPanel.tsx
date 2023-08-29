import { MailOutlined, AppstoreOutlined } from '@ant-design/icons'
import { Collapse, CollapseProps, Menu, MenuProps } from 'antd'
import { useState } from 'react'

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
const text = `
  A dog is a type of domesticated animal.
  Known for its loyalty and faithfulness,
  it can be found as a welcome guest in many households across the world.
`
const canvas_collapsse: CollapseProps['items'] = [
    {
      key: '1',
      label: '基础',
      children: <p>{text}</p>,
    },
    {
      key: '2',
      label: '画布样式',
      children: <p>{text}</p>,
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
                    <>
                        <Collapse defaultActiveKey={['1']} ghost expandIconPosition='end' items={canvas_collapsse} />
                    </>
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


