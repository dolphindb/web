import { useCallback, useRef, useState } from 'react'
import { cloneDeep } from 'lodash'

import { Button, Modal, Menu, ButtonProps } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/modal.js'

import { NodeTable } from './NodeTable.js'
import { SqlEditor } from './SqlEditor.js'
import { StreamEditor } from './StreamEditor.js'

import { dashboard } from '../model.js'
import { type Widget } from '../model.js'
import { data_sources,
    find_data_source_index, 
    get_data_source,
    save_data_source, 
    sub_data_source,
    DataSource,
    type DataSourcePropertyType, 
} from './date-source.js'

const save_confirm_config = {
    cancelText: '不保存',
    okText: '保存',
    style: { top: '250px' },
    maskStyle: { backgroundColor: 'rgba(0,0,0,.2)' },
    title: '此数据源存在未保存的更改。你想保存吗？',   
}

interface IProps extends ButtonProps {
    widget?: Widget
    text?: string
}

export const DataSourceConfig = (props: IProps, ref) => {
    const { widget, text, ...btn_props } = props
    const { visible, open, close } = use_modal()
    const [modal, contextHolder] = Modal.useModal()
    
    const [show_preview, set_show_preview] = useState(false) 
    const [current_data_source, set_current_data_source] = useState(data_sources[0] || null)
    const [connecting, set_connecting] = useState(false)
    
    const no_save_flag = useRef(false)
    
    const change_current_data_source = useCallback((key: string) => {
        if (key === '') {
            set_current_data_source(null)
            return
        }    
        set_current_data_source(cloneDeep(get_data_source(key)))
        set_show_preview(false)
    }, [ ])
    
    const change_current_data_source_property = useCallback(
        (key: string, value: DataSourcePropertyType, save_confirm = true) => {
            set_current_data_source((pre: DataSource) => {
                pre[key] = value
                return cloneDeep(pre)
            })
            if (save_confirm)
                no_save_flag.current = true 
    }, [ ])
    
    const handle_close = useCallback(async () => {
        if (no_save_flag.current && await modal.confirm(save_confirm_config) ) {
            await handle_save()
            no_save_flag.current = false
        }    
        close()
        set_show_preview(false)
    }, [no_save_flag.current])
    
    const handle_save = useCallback(async () => {
        await save_data_source(current_data_source)
        no_save_flag.current = false
    }, [current_data_source])
    
    return <>
        <Button
            icon={<DatabaseOutlined className='data-source-config-trigger-navigation-icon' />}
            type='dashed'
            onClick={open}
            {...btn_props}
        >
            {!widget ? '数据源' : text || '点击填充数据源'}
        </Button>
            
        
        <Modal 
            title='配置数据源'
            width='80%' 
            destroyOnClose
            open={visible}
            onCancel={handle_close} 
            maskClosable={false}
            maskStyle={{ backgroundColor: 'rgba(84,84,84,0.5)' }}
            afterOpenChange={() => {
                set_current_data_source(cloneDeep(data_sources[widget?.source_id ? find_data_source_index(widget.source_id) : 0]))
            }}
            footer={
                [
                    current_data_source?.mode === 'sql'
                    ? <Button 
                        key='preview' 
                        onClick={
                            async () => {
                                const { type, result } = await dashboard.execute()
                                change_current_data_source_property('error_message', type === 'success' ? '' : result as string, false)
                                set_show_preview(true)
                            }
                        }>
                        预览
                    </Button>
                    : <div key='preview' />,
                    <Button key='save' type='primary' loading={current_data_source.mode === 'stream' && connecting} onClick={async () => {
                        try {
                            set_connecting(true)
                            if (no_save_flag.current)
                                await handle_save()
                            if (widget) {
                                if (!widget.source_id || widget.source_id !== current_data_source.id) {
                                    await sub_data_source(widget, current_data_source.id)
                                    dashboard.update_widget({ ...widget, source_id: current_data_source.id })
                                }
                                close()
                                set_show_preview(false)
                            } 
                        } finally {
                            set_connecting(false)
                        }
                    }}>
                        {widget ? '应用' : '保存'}
                    </Button>,
                    <Button key='close' onClick={handle_close}>
                        关闭
                    </Button>,
                ]
            }
        >
            {/* 未保存提示框 */}
            {contextHolder}
            <div className='data-source-config-main'>
                <NodeTable 
                    current_data_source={current_data_source}
                    no_save_flag={no_save_flag}
                    save_confirm={() => modal.confirm(save_confirm_config) }
                    handle_save={handle_save}
                    change_current_data_source={change_current_data_source}
                    change_current_data_source_property={change_current_data_source_property}
                />
                {data_sources.length
                    ? <div className='config-right'>
                        <div className='config-right-top'>
                            <Menu 
                                onClick={event => { change_current_data_source_property('mode', event.key) }} 
                                selectedKeys={[current_data_source.mode]} 
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
                        {current_data_source.mode === 'sql'
                            ? <SqlEditor 
                                show_preview={show_preview} 
                                current_data_source={current_data_source}
                                close_preview={() =>  set_show_preview(false) } 
                                change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                                change_current_data_source_property={change_current_data_source_property}
                            />
                            : <StreamEditor 
                                current_data_source={current_data_source} 
                                change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                                change_current_data_source_property={change_current_data_source_property}
                            />
                        }
                    </div>
                    : <></>
                }
            </div>
        </Modal>
    </>
}
