import './Connection.scss'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import useSWR from 'swr'

import { Button, Checkbox, Empty, Menu, Modal, Space, Spin, Tooltip, Typography, message } from 'antd'

import { DeleteOutlined, EditOutlined, FileTextOutlined, LinkOutlined, PlusCircleOutlined } from '@ant-design/icons'


import NiceModal from '@ebay/nice-modal-react'


import { t } from '../../i18n/index.js'

import { ConnectionDetail } from './components/connection-detail/index.js'
import { CreateConnectionModal } from './components/create-connection-modal/index.js'
import { InitPage } from './components/init-page/index.js'
import { protocols } from './constant.js'
import { dcp_model } from './model.js'
import { request } from './utils.js'

import { Protocol, type Connection } from './type.js'
import { ViewLogModal } from './components/view-log-modal/index.js'

const DEFAULT_DATA = {
    [Protocol.KAFKA]: [ ],
    [Protocol.MQTT]: [ ]
}

export function Connections () {
    const [connection, set_connection] = useState<string>()
    const [selected_connections, set_selected_connections] = useState<string[]>([ ])
    
    const { database_inited } = dcp_model.use(['database_inited', 'func_inited' ])
    
    useEffect(() => {
        dcp_model.init()
    }, [ ])
    
    const { isLoading, mutate, data = DEFAULT_DATA } = useSWR(
        database_inited === 'inited' ? 'dcp_getConnectList' : null,
        async () => request<{ [key in Protocol]: Connection[] }>('dcp_getConnectList')
    )
    
    /** 批量删除连接 */
    const on_batch_delete_connection = useCallback(async () => {
        Modal.confirm({
            title: t('确定要删除选中的 {{num}} 项连接吗', { num: selected_connections.length }),
            okButtonProps: { type: 'primary', danger: true  },
            onOk: async () => {
                await request('dcp_deleteConnect', { ids: selected_connections })
                message.success(t('删除成功'))
                
                if (selected_connections.includes(connection)) 
                    set_connection(null)
                set_selected_connections([ ])
                mutate()
            }
        })
    }, [ mutate, selected_connections ])
    
    /** 删除单个连接 */
    const on_delete_single_connection = useCallback(async ({ name, id }: Connection) => {
        Modal.confirm({
            title: t('确定要删除连接 {{name}}吗？', { name }),
            okButtonProps: { type: 'primary', danger: true  },
            onOk: async () => {
                await request('dcp_deleteConnect', { ids: [id] })
                message.success(t('删除成功'))
                if (selected_connections.includes(id))
                    set_connection(null)
                mutate()
            }
        })
    }, [ ])
   
    /** 选择连接， 主要用于批量删除 */
    const on_select_connection = useCallback((id: string) => {
        if (selected_connections.includes(id))
            set_selected_connections(list => list.filter(item => item !== id))
        else
            set_selected_connections(list => [...list, id])
    }, [ selected_connections ])
    
    
    /** 点击连接 */
    const on_click_connection = useCallback(({ key }) => {
        set_connection(key)
    }, [ ])
    
    
    const menu_items = useMemo(() => {
        if (isLoading)
            return [ ]
        return protocols.map(protocol => {
            const connections = data[protocol] ?? [ ]
            return {
                label: <div className='protocol_menu_item'>
                    <LinkOutlined />
                    <div className='protocol_menu_label'>
                        {protocol}
                        <Tooltip title={t('新建连接')} >
                           <Button type='link' className='link-btn'>
                                <PlusCircleOutlined 
                                    className='add-connection-icon' 
                                    onClick={async e => { 
                                        e.stopPropagation()
                                        NiceModal.show(CreateConnectionModal, { protocol, refresh: mutate })
                                    }}
                                />
                           </Button>
                        </Tooltip>
                        
                        <Tooltip title={t('查看日志')} >
                            <Button type='link' className='link-btn'>
                                <FileTextOutlined 
                                    onClick={async e => {
                                        e.stopPropagation()
                                        await NiceModal.show(ViewLogModal, { protocol })
                                    }} 
                                    className='add-connection-icon' 
                                />
                                
                            </Button>
                        </Tooltip>
                        
                    </div>
                </div>,
                key: protocol,
                children: connections?.map(connection => ({
                    label: <div className='connection-menu-item'>
                            <Checkbox onClick={e => {
                            e.stopPropagation()
                            on_select_connection(connection.id)
                        }}>
                            {connection.name}
                        </Checkbox>
                        <Space>
                            <Button type='link' className='link-btn'>
                                <EditOutlined 
                                    className='connection-edit-icon'
                                    onClick={async e => {
                                        e.stopPropagation()
                                        NiceModal.show(CreateConnectionModal, { protocol, refresh: mutate, editedConnection: connection })
                                    }}
                                />
                            </Button>
                            <Button danger type='link' className='link-btn'>
                                <DeleteOutlined 
                                    onClick={async e => { 
                                        e.stopPropagation() 
                                        on_delete_single_connection(connection) 
                                    }} 
                                    className='connection-delete-icon'
                                />
                            </Button>
                            
                        </Space>
                    </div>,
                    key: connection.id
                }))
            }
        })
    }, [isLoading, data, on_select_connection])
    
    
    
    if (isLoading || database_inited === 'unknow')
        return  <Spin>
            <div className='center-spin-div'/>
        </Spin> 
    
    
    return database_inited === 'inited' ? <div className='data-collection-wrapper'>
        <div className='connection-list'>
        
            <div className='connection-list-title'>
                <h4>{t('连接')}</h4>
                <Typography.Link 
                    className='delete-link' 
                    type='danger' 
                    onClick={on_batch_delete_connection} 
                    disabled={!selected_connections.length}
                >
                    <DeleteOutlined className='delete-link-icon'/>
                    {t('批量删除')}
                </Typography.Link>
            </div>
            <Menu 
                mode='inline' 
                items={menu_items} 
                className='connection-menu'
                onClick={on_click_connection}
            />
        </div>
        
        <div className='connection-detail'>
            {
            !!connection 
                ? <ConnectionDetail connection={connection}/>
                : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('请选择连接')}/>
            }
        </div>
    </div> : <InitPage />
}
