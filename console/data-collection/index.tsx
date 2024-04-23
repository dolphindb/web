import { Children, useMemo, useState } from 'react'
import useSWR from 'swr'

import { Empty, Menu, Spin } from 'antd'

import { useMemoizedFn } from 'ahooks'

import { FolderOpenOutlined, PlusOutlined } from '@ant-design/icons'

import type { Connection } from './type.js'
import { request } from './utils.js'
import { protocols } from './constant.js'
import './index.scss'

const DEFAULT_DATA = {
    connections: [ ]
}

export function DataCollection () {
    const [protocol, set_protocol] = useState('mqtt')
    const [connection, set_connection] = useState<string>()
    const [menu_items, set_menu_items] = useState([ {
        label: <div className='protocol_menu_item'>
            <FolderOpenOutlined />
            <div className='protocol_menu_label'>
                mqtt
                <PlusOutlined />
            </div>
        </div>,
        key: 'mqtt',
        children: [ ]
    }])
    
    
    const { isLoading } = useSWR(
        '',
        async () => request<{ connections: Connection[] }>('', { protocol }),
       {
        onSuccess: data => {
            set_menu_items(protocols.map(item => {
                return {
                    label: <div className='protocol_menu_item'>
                        <FolderOpenOutlined />
                        <div className='protocol_menu_label'>
                            {item}
                            <PlusOutlined />
                        </div>
                    </div>,
                    key: item,
                    children: item !== protocol 
                    ? [ ]
                    : data.connections.map(connection => ({
                        label: connection.name,
                        key: connection.id,
                        isLeaf: true
                    }))
                }
            }))
            set_connection(data.connections?.[0]?.id)
        }
       }
    )
    
    const onClickProtocol = useMemoizedFn((open_keys: string[]) => {
        if (!open_keys?.length) {
            set_connection(null)
            set_protocol(null)
        } else
            set_protocol(open_keys?.[0])
    })
    
    return <Spin spinning={isLoading}>
        <div className='data-collection-wrapper'>
            
            <div className='connection-list'>
                <h4>连接</h4>
                <Menu expandIcon={null} items={menu_items} onOpenChange={onClickProtocol} openKeys={[protocol]} className='connection-menu'/>
            </div>
            
            <div className='connection-detail'>
                {
                !!connection 
                    ? <div /> 
                    : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                }
            </div>
        </div>
    </Spin>
}
