import { useState } from 'react'

import { Button, Modal, Menu } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

import { use_modal } from 'react-object-model/modal.js'

import { NodeTable } from './NodeTable.js'
import { SqlConfig } from './SqlConfig.js'
import { StreamConfig } from './StreamConfig.js'
import { SqlEditor } from './SqlEditor.js'
import { StreamEditor } from './StreamEditor.js'

const data_mode_items: MenuProps['items'] = [
    {
        label: 'DolphinDB 脚本 / SQL',
        key: 'sql',
    },
    {
        label: '流数据',
        key: 'stream'
    }
]

export function DateSource () {
    const { visible, open, close } = use_modal()
    
    const [data_mode, set_data_mode] = useState('sql')
    const [show_preview, set_show_preview] = useState(false)
    
    const data_mode_click_handler: MenuProps['onClick'] = e => {
        set_data_mode(e.key)
        set_show_preview(false)
    }
  
    const handle_preview = () => {
        set_show_preview(true)
    }
    const handle_save = () => {
        close()
        set_show_preview(false)
    }
    const handle_close = () => {
        close()
        set_show_preview(false)
    }
    
    return <>
        <div className='data-source-config-trigger' onClick={open}>
            <DatabaseOutlined style={{ marginRight: '5px' }}/>
            数据源
        </div>
        <Modal 
            title='配置数据源'
            width={1000} 
            open={visible}
            onCancel={close} 
            maskClosable={false}
            maskStyle={{ backgroundColor: 'rgba(0,0,0,.2' }}
            footer={
                [
                    <Button key='preview' onClick={handle_preview}>
                        预览
                    </Button>,
                    <Button key='save' onClick={handle_save}>
                        保存
                    </Button>,
                    <Button key='close' type='primary' onClick={handle_close}>
                        关闭
                    </Button>,
                ]
            }
        >
            <div className='data-source-config-main'>
                <NodeTable />
                <div className='data-source-config-right'>
                    <div className='data-source-config-right-top'>
                        <Menu onClick={data_mode_click_handler} selectedKeys={[data_mode]} mode='horizontal' items={data_mode_items} />
                    </div>
                    {data_mode === 'sql'
                        ? <SqlEditor show_preview={show_preview} close_preview={() => { set_show_preview(false) }}/>
                        : <StreamEditor show_preview={show_preview} close_preview={() => { set_show_preview(false) }}/>
                    }
                    {data_mode === 'sql'
                        ? <SqlConfig />
                        : <StreamConfig />
                    }
                </div>
            </div>
        </Modal>
    </>
}
