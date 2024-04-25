import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'

import { Checkbox, Empty, Menu, Modal, Spin, Tooltip, Typography, message } from 'antd'

import { useMemoizedFn } from 'ahooks'

import { DeleteOutlined, FolderOpenOutlined, PlusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import cn from 'classnames'


import NiceModal from '@ebay/nice-modal-react'

import { model } from '../model.js'

import { t } from '../../i18n/index.js'

import type { Connection } from './type.js'
import { request } from './utils.js'
import { protocols } from './constant.js'
import code from './script.dos'
import './index.scss'
import { CreateConnectionModal } from './components/create-connection-modal/index.js'
import { ConnectionDetailPage } from './components/connection-detail-page/index.js'



export function DataCollection () {
    const [protocol, set_protocol] = useState('mqtt')
    const [connection, set_connection] = useState<string>()
    const [selected_connections, set_selected_connections] = useState<number[]>([ ])
    
    const { is_data_collection_func_inited } = model.use(['is_data_collection_func_inited'])
    
    const { isLoading: initLoading } = useSWR(
        !is_data_collection_func_inited ? 'dcp_loading' : null, 
        async () => model.ddb.eval(code),
        { onSuccess: () => { model.set({ is_data_collection_func_inited: true }) } }
    )
    
    const { isLoading, mutate, data } = useSWR(
        protocol ? ['dcp_getConnectList', protocol] : null,
        async () => request<{ connections: Connection[] }>('dcp_getConnectList', { protocol })
    )
    
    const on_delete_connection = useCallback(async () => {
        Modal.confirm({
            title: t(`确定要删除选中的 ${selected_connections.length} 项连接吗`),
            okButtonProps: { style: { backgroundColor: 'red' } },
            onOk: async () => {
                await request('dcp_deleteConnect', { ids: selected_connections })
                message.success('删除成功')
                mutate()
            }
        })
    }, [ mutate, selected_connections ])
   
    const on_select_connection = useCallback((id: number) => {
        if (selected_connections.includes(id))
            set_selected_connections(list => list.filter(item => item !== id))
        else
            set_selected_connections(list => [...list, id])
    }, [ selected_connections ])
    
    
    const menu_items = useMemo(() => {
        if (isLoading)
            return [ ]
        return protocols.map(item => {
            return {
                label: <div className='protocol_menu_item'>
                    <FolderOpenOutlined />
                    <div className='protocol_menu_label'>
                        {item}
                        <Tooltip title={t('新建连接')} >
                        <PlusCircleOutlined className='add-connection-icon' onClick={async e => { 
                            e.stopPropagation()
                            await NiceModal.show(CreateConnectionModal, { protocol: item, refresh: mutate })
                        }}/>
                        </Tooltip>
                    </div>
                </div>,
                key: item,
                children: item !== protocol 
                ? [ ]
                : data.connections.map(connection => ({
                    label: <Checkbox onClick={e => {
                        e.stopPropagation()
                        console.log(111)
                        on_select_connection(connection.id)
                    }}>
                        {connection.name}
                    </Checkbox>,
                    key: connection.id
                }))
            }
        })
    }, [data, on_select_connection])
    
    const on_click_protocol = useMemoizedFn((open_keys: string[]) => {
        if (!open_keys?.length) {
            set_connection(null)
            
            set_protocol(null)
        } else
            set_protocol(open_keys?.[0])
    })
    
    const on_click_connection = useCallback(({ key }) => {
        set_connection(key)
    }, [ ])
    
    
    return (isLoading || initLoading) 
    ? <Spin>
        <div className='center-spin-div'/>
    </Spin> 
    : <div className='data-collection-wrapper'>
            <div className='connection-list'>
               
                <div className='connection-list-title'>
                    <h4>连接</h4>
                    <Typography.Link 
                        className='delete-link' 
                        type='danger' 
                        onClick={on_delete_connection} 
                        disabled={!selected_connections.length}
                    >
                        <DeleteOutlined className='delete-link-icon'/>
                        批量删除
                    </Typography.Link>
                </div>
                <Menu 
                    mode='inline' 
                    items={menu_items} 
                    onOpenChange={on_click_protocol} 
                    openKeys={ protocol ? [protocol] : [ ]} 
                    className='connection-menu'
                    onClick={on_click_connection}
                />
            </div>
            
            <div className='connection-detail'>
                {
                !!connection 
                    ? <ConnectionDetailPage connection={connection}/>
                    : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                }
            </div>
        </div>
}
