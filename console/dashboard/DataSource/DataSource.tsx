import { useCallback, useRef, useState } from 'react'

import { Button, Modal, Menu } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/modal.js'

import { NodeTable } from './NodeTable.js'
import { SqlEditor } from './SqlEditor.js'
import { StreamEditor } from './StreamEditor.js'

import { data_source_nodes,
         find_data_source_node_index, 
         save_data_source_node, 
         execute_code,
         type dataSourceNodePropertyType, 
         type dataSourceNodeType 
    } from '../storage/date-source-node.js'
import { formatter } from '../utils.js'
import { shell } from '../../shell/model.js'
import { DdbObj } from 'dolphindb'

const save_confirm_config = {
    cancelText: '不保存',
    okText: '保存',
    maskClosable: true,
    style: { top: '250px' },
    maskStyle: { backgroundColor: 'rgba(0,0,0,.2)' },
    content: (
        <p>此数据源存在未保存的更改。你想保存吗？</p>
    ),   
}

export function DataSource ({ trigger_index }: { trigger_index: string }) {
    const { visible, open, close } = use_modal()
    
    const [modal, contextHolder] = Modal.useModal()
    
    const [show_preview, set_show_preview] = useState(false) 
    const [current_data_source_node, set_current_data_source_node] = useState(data_source_nodes[0] || null)
    
    const no_save_flag = useRef(false)
    
    const change_current_data_source_node = useCallback((key: string) => {
        if (key === '') {
            set_current_data_source_node(null)
            return
        }    
        set_current_data_source_node({ ...data_source_nodes[find_data_source_node_index(key)] })
        set_show_preview(false)
    }, [ ])
    
    const change_current_data_source_node_property = useCallback((key: string, value: dataSourceNodePropertyType) => {
        set_current_data_source_node((pre: dataSourceNodeType) => {
            pre[key] = value
            return { ...pre }
        })
        if (key !== 'name')
            no_save_flag.current = true
    }, [ ])
    
    const handle_close = useCallback(async () => {
        if (no_save_flag.current && await modal.confirm(save_confirm_config) ) {
            handle_save()
            no_save_flag.current = false
        }    
        close()
        set_show_preview(false)
    }, [no_save_flag.current])
    
    const handle_save = useCallback(async () => {
        current_data_source_node.code = shell.editor.getValue()
        
        const { type, result } = await execute_code()
        change_current_data_source_node_property('error_message', type === 'success' ? '' : result as string)
        current_data_source_node.data.length = 0
        console.log(result)
        if (typeof result === 'object') {
            for (let i = 0;  i < result.cols;  i++)
                current_data_source_node.data.push(formatter(result.value[i]))  
            console.log(current_data_source_node.data)
        }
               
            
        save_data_source_node(current_data_source_node)
        
        no_save_flag.current = false
        console.log(current_data_source_node)
        console.log(data_source_nodes)
    }, [current_data_source_node])
    
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
                    <Button 
                        key='preview' 
                        onClick={
                            async () => {
                                const { type, result } = await execute_code()
                                if (type === 'error')
                                    change_current_data_source_node_property('error_message', result as string)
                                set_show_preview(true)
                            }
                        }>
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
            {/* 未保存提示框 */}
            {contextHolder}
            <div className='data-source-config-main'>
                <NodeTable 
                    data_source_nodes={data_source_nodes} 
                    current_data_source_node={current_data_source_node}
                    no_save_flag={no_save_flag}
                    save_confirm={() => modal.confirm(save_confirm_config) }
                    handle_save={handle_save}
                    change_current_data_source_node={change_current_data_source_node}
                    change_current_data_source_node_property={change_current_data_source_node_property}
                />
                {data_source_nodes.length
                    ? <div className='data-source-config-right'>
                        <div className='data-source-config-right-top'>
                            <Menu 
                                onClick={e => { change_current_data_source_node_property('mode', e.key) }} 
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
                                current_data_source_node={current_data_source_node}
                                close_preview={() =>  set_show_preview(false) } 
                                change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                                change_current_data_source_node_property={change_current_data_source_node_property}
                            />
                            : <StreamEditor 
                                show_preview={show_preview}
                                current_data_source_node={current_data_source_node} 
                                close_preview={() =>  set_show_preview(false) }
                                change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                            />
                        }
                    </div>
                    : <></>
                }
            </div>
        </Modal>
    </>
}
