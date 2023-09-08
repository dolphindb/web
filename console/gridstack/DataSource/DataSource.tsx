import { useCallback, useRef, useState } from 'react'

import { Button, Modal, Menu, Collapse } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/modal.js'

import { model } from '../../model.js'
import { shell } from '../../shell/model.js'
import { t } from '../../../i18n/index.js'

import { NodeTable } from './NodeTable.js'
import { SqlEditor } from './SqlEditor.js'
import { StreamEditor } from './StreamEditor.js'

import { data_source_nodes, type dataSourceNodePropertyType, find_data_source_node_index, save_data_source_node, type dataSourceNodeType } from '../storage/date-source-node.js'
import { formatter } from '../utils.js'

export function DataSource ({ trigger_index }: { trigger_index: string }) {
    const { visible, open, close } = use_modal()
    
    const [show_preview, set_show_preview] = useState(false) 
    const [current_data_source_node, set_current_data_source_node] = useState(data_source_nodes[0] || null)
    
    const change_current_data_source_node = useCallback((key: string | number) => {
        if (key === -1) {
            set_current_data_source_node(null)
            return
        }
            
        set_current_data_source_node({ ...data_source_nodes[find_data_source_node_index(key)] })
        shell.editor.setValue(current_data_source_node?.code || '')
        set_show_preview(false)
    }, [ ])
    
    const change_current_data_source_node_property = useCallback((key: string, value: dataSourceNodePropertyType) => {
        set_current_data_source_node((pre: dataSourceNodeType) => {
            pre[key] = value
            return { ...pre }
        })
    }, [ ])
    
    const execute_code = async () => {
        if (shell.executing)
            model.message.warning(t('当前连接正在执行作业，请等待'))
        else 
            try {
                await shell.execute_('all')
                shell.set({
                    dashboard_result: shell.result,
                })
                change_current_data_source_node_property('error_message', '')
                current_data_source_node.data.length = 0
            } catch (error) {
                change_current_data_source_node_property('error_message', error.message)
            }
        
    }
    
    const handle_preview = async () => {
        await execute_code()
        set_show_preview(true)
    }
    
    const handle_save = async () => {
        await execute_code()
        if (shell.dashboard_result && 'value' in shell.dashboard_result.data)
            for (let i = 0;  i < shell.dashboard_result.data.cols;  i++)
                current_data_source_node.data.push(formatter(shell.dashboard_result.data.value[i]))
        current_data_source_node.code = shell.editor.getValue()
        save_data_source_node(current_data_source_node)
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
            onCancel={handle_close} 
            maskClosable={false}
            maskStyle={{ backgroundColor: 'rgba(0,0,0,.2)' }}
            afterOpenChange={() => {
                set_current_data_source_node({ ...data_source_nodes[0] } )
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
                    current_data_source_node={current_data_source_node}
                />
                {data_source_nodes.length
                    ? <div className='data-source-config-right'>
                        <div className='data-source-config-right-top'>
                            <Menu 
                                onClick={
                                    e => {
                                        change_current_data_source_node_property('mode', e.key)
                                    }
                                } 
                                selectedKeys={[current_data_source_node.mode]} 
                                mode='horizontal' 
                                items={[
                                    {
                                        label: 'DolphinDB 脚本 / SQL',
                                        key: 'sql',
                                    },
                                    {
                                        label: '流数据',
                                        key: 'stream'
                                    }
                                ]} 
                            />
                        </div>
                        {current_data_source_node.mode === 'sql'
                            ? <SqlEditor 
                                show_preview={show_preview} 
                                close_preview={() => { set_show_preview(false) }} 
                                current_data_source_node={current_data_source_node}
                                change_current_data_source_node_property={change_current_data_source_node_property}
                            />
                            : <StreamEditor show_preview={show_preview} close_preview={() => { set_show_preview(false) }}/>
                        }
                    </div>
                    : <></>
                }
            </div>
        </Modal>
    </>
}
