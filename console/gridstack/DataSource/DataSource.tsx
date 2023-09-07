import { useCallback, useRef, useState } from 'react'

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

import { data_source_nodes, dataSourceNodePropertyType, type dataSourceNodeType } from '../storage/date-source-node.js'

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
    const current_data_source_node_index = useRef(0)
    
    const { visible, open, close } = use_modal()
    
    const [show_preview, set_show_preview] = useState(false)
    const [error_message, set_error_message] = useState('') 
    const [current_data_source_node, set_current_data_source_node] = useState({ ...data_source_nodes[0] })
    
    const change_current_data_source_node = useCallback((key: string) => {
        set_current_data_source_node({ ...(data_source_nodes.find(
            (data_source_node, index) => {
                if (data_source_node.id === Number(key)) {
                    current_data_source_node_index.current = index
                    shell.editor.setValue(data_source_node.code || '')
                    return true
                }
            }
        )) })
    }, [ ])
    
    const change_current_data_source_node_property = useCallback((key: string, value: dataSourceNodePropertyType) => {
        set_current_data_source_node(pre => {
            pre[key] = value
            return { ...pre }
        })
    }, [ ])
    
    const data_mode_click_handler: MenuProps['onClick'] = e => {
        change_current_data_source_node_property('mode', e.key)
    }
    
    const handle_preview = async () => {
        if (shell.executing) 
            model.message.warning(t('当前连接正在执行作业，请等待'))
        
        else {
            try {
                await shell.execute_('all')
                shell.set({
                    dashboard_result: shell.result,
                })
                set_error_message('')
            } catch (error) {
                set_error_message(error.message)
            }
            set_show_preview(true)
        }
    }
    
    const handle_save = async () => {
        current_data_source_node.code = shell.editor.getValue()
        data_source_nodes[current_data_source_node_index.current] = { ...current_data_source_node }
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
            destroyOnClose
            open={visible}
            onCancel={close} 
            maskClosable={false}
            maskStyle={{ backgroundColor: 'rgba(0,0,0,.2)' }}
            afterClose={() => { 
                set_current_data_source_node(data_source_nodes[0]) 
            }}
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
                <NodeTable 
                    data_source_nodes={data_source_nodes} 
                    change_current_data_source_node={change_current_data_source_node}
                />
                <div className='data-source-config-right'>
                    <div className='data-source-config-right-top'>
                        <Menu onClick={data_mode_click_handler} selectedKeys={[current_data_source_node.mode]} mode='horizontal' items={data_mode_items} />
                    </div>
                    {current_data_source_node.mode === 'sql'
                        ? <SqlEditor 
                            show_preview={show_preview} 
                            close_preview={() => { set_show_preview(false) }} 
                            error_message={error_message}
                            current_data_source_node={current_data_source_node}
                            change_current_data_source_node_property={change_current_data_source_node_property}
                        />
                        : <StreamEditor show_preview={show_preview} close_preview={() => { set_show_preview(false) }}/>
                    }
                    {current_data_source_node.mode === 'sql'
                        ? <SqlConfig 
                            current_data_source_node={current_data_source_node}
                            change_current_data_source_node_property={change_current_data_source_node_property}
                        />
                        : <StreamConfig />
                    }
                </div>
            </div>
        </Modal>
    </>
}
