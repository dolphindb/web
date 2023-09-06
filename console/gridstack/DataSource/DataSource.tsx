import { useState } from 'react'

import { Button, Modal, Menu } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

import { use_modal } from 'react-object-model/modal.js'

import { model } from '../../model.js'
import { shell } from '../../shell/model.js'
import { t } from '../../../i18n/index.js'

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

export function DataSource ({ trigger_index }: { trigger_index: string }) {
    const { visible, open, close } = use_modal()
    
    const [data_mode, set_data_mode] = useState('sql')
    const [show_preview, set_show_preview] = useState(false)
    
    const data_mode_click_handler: MenuProps['onClick'] = e => {
        set_data_mode(e.key)
        set_show_preview(false)
    }
  
    const handle_preview = async () => {
        if (shell.executing) 
            model.message.warning(t('当前连接正在执行作业，请等待'))
        
        else {
            await shell.execute_('all')
            shell.set({
                dashboard_result: shell.result,
            })
            set_show_preview(true)
        }
    }
    const handle_save = async () => {
        await shell.execute_('all')
            shell.set({
                dashboard_result: shell.result,
            })
        close()
        set_show_preview(false)
    }
    const handle_close = () => {
        close()
        set_show_preview(false)
    }
    
    const trigger = {
        navigation: (
            <div className='data-source-config-trigger-navigation' onClick={open}>
                <DatabaseOutlined className='data-source-config-trigger-navigation-icon'/>
                数据源
            </div>
        ),
        graph: (
            <div className='graph-hint' onClick={open}>点击填充数据源</div>
        )
    }
    
    return <>
        {trigger[trigger_index]}
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
                        {trigger_index === 'navigation' ? '保存' : '应用'}
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
