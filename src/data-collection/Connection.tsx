import './Connection.scss'

import { useCallback, useId, useMemo, useState } from 'react'
import useSWR from 'swr'

import { Button, Empty, Result, Space, Spin, Tooltip, Tree, Typography, type TreeDataNode } from 'antd'

import { DeleteOutlined, EditOutlined, FileTextOutlined, LinkOutlined, PlusCircleOutlined } from '@ant-design/icons'


import NiceModal from '@ebay/nice-modal-react'


import { t } from '../../i18n/index.js'

import { ConnectionDetail } from './components/connection-detail/index.js'
import { CreateConnectionModal } from './components/create-connection-modal/index.js'
import { InitPage } from './components/init-page/index.js'
import { protocols } from './constant.js'

import { request } from './utils.js'

import { InitStatus, Protocol, type Connection } from './type.js'
import { ViewLogModal } from './components/view-log-modal/index.js'

import { is_inited } from './api.js'

import { DeleteConnectionModal } from './components/delete-connections-modal/index.js'

import { model, NodeType } from '@/model.js'


const DEFAULT_DATA = {
    [Protocol.KAFKA]: [ ],
    [Protocol.MQTT]: [ ]
}

export function Connections () {
    const [connection, set_connection] = useState<string>()
    const [selected_connections, set_selected_connections] = useState<string[]>([ ])
    const id = useId()
    
    
    if (model.node_type === NodeType.controller) 
        return  <Result
        status='warning'
        title={t('请注意，控制节点无法使用数采平台')}
      />
    
    
    
    const { data: isInited = InitStatus.UNKONWN, mutate: test_init } = useSWR(
        [is_inited.KEY, id],
        is_inited
    )
    
    const { isLoading, mutate, data = DEFAULT_DATA } = useSWR(
        isInited === InitStatus.INITED ? ['dcp_getConnectList', isInited] : null,
        async () =>  request<{ [key in Protocol]: Connection[] }>('dcp_getConnectList'),
    )
    
    /** 批量删除连接 */
    const on_batch_delete_connection = useCallback(async () => {
        NiceModal.show(DeleteConnectionModal, {
            ids: selected_connections,
            after_delete: async () => {
                if (selected_connections.includes(connection)) 
                    set_connection(null)
                set_selected_connections([ ])
                mutate()
            }
        })
    }, [ mutate, selected_connections, connection ])
    
    
    console.log(connection, 'connection')
    
    /** 删除单个连接 */
    const on_delete_connection = useCallback(async ({ name, id }: Connection) => {
        console.log(connection, 'connection')
        NiceModal.show(DeleteConnectionModal, { 
            ids: [id], 
            name,
            after_delete: async () => {
                // console.log(connection, 111)
                console.log(connection, id, connection === id, 'isEqual')
                if (connection === id) {
                    console.log('ttt')
                    set_connection(null)
                }
                mutate()
            } 
        })
    }, [connection])
    
    const menu_items = useMemo<TreeDataNode[]>(() => {
        if (isLoading)
            return [ ]
        return protocols.map(protocol => {
            const connections = data[protocol] ?? [ ]
            return {
                icon: <LinkOutlined />,
                title: <div className='protocol-tree-item'>
                        <LinkOutlined className='protocol-icon'/>
                        {protocol}
                    <Space className='protocol-operations'>
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
                       </Space>
                </div>,
                key: protocol,
                value: protocol,
                isLeaf: false,
                selectable: false,
                checkable: !!connections?.length,
                children: connections?.map(connection => ({
                    isLeaf: true,
                    title: <div className='connection-tree-item'>
                        <div className='connection-tree-label'>
                            {connection.name}
                        </div>
                        <Space className='connection-operations'>
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
                                        on_delete_connection(connection) 
                                    }} 
                                    className='connection-delete-icon'
                                />
                            </Button>
                        </Space>
                    </div>,
                    key: connection.id,
                    value: connection.id
                }))
            }
        })
    }, [isLoading, data, selected_connections, on_delete_connection])
    
    if (isInited === InitStatus.UNKONWN)
        return  <Spin>
            <div className='center-spin-div'/>
        </Spin> 
    
    
    return  isInited === InitStatus.INITED ? <div className='data-collection-wrapper'>
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
            <Tree  
                treeData={menu_items} 
                className='connection-tree'
                checkable
                blockNode
                onSelect={keys => { 
                    set_connection(keys[0] as string) 
                }}
                onCheck={keys => { 
                    set_selected_connections((keys as string[]).filter(item => !protocols.includes(item as any)))
                }}
            />
        </div>
        
        {
        !!connection 
            ? <ConnectionDetail connection={connection}/>
            : <Empty className='empty-content' image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('请选择连接')}/>
        }
    </div> : <InitPage test_init={test_init as any}/>
}
