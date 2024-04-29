import './index.scss'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import useSWR from 'swr'

import { Checkbox, Empty, Menu, Modal, Spin, Tooltip, Typography, message } from 'antd'

import { useMemoizedFn } from 'ahooks'

import { DeleteOutlined, FolderOpenOutlined, PlusCircleOutlined } from '@ant-design/icons'


import NiceModal from '@ebay/nice-modal-react'


import { t } from '../../../../i18n/index.js'
import { ConnectionDetailPage } from '../../components/connection-detail-page/index.js'
import { CreateConnectionModal } from '../../components/create-connection-modal/index.js'
import { InitPage } from '../../components/init-page/index.js'
import { protocols } from '../../constant.js'
import { dcp_model } from '../../model.js'
import { request } from '../../utils.js'

import { type Connection } from '../../type.js'



export function Connections () {
    const [protocol, set_protocol] = useState('mqtt')
    const [connection, set_connection] = useState<number>()
    const [selected_connections, set_selected_connections] = useState<number[]>([ ])
    
    const { database_inited } = dcp_model.use(['database_inited', 'func_inited' ])
    const id = useId()
    
    
    useEffect(() => {
        dcp_model.init()
    }, [ ])
    
    const { isLoading, mutate, data } = useSWR(
        protocol && database_inited === 'inited' ? ['dcp_getConnectList', protocol, id] : null,
        async () => request<{ connections: Connection[] }>('dcp_getConnectList', { protocol })
    )
    
    const on_delete_connection = useCallback(async () => {
        Modal.confirm({
            title: t(`确定要删除选中的 ${selected_connections.length} 项连接吗`),
            okButtonProps: { style: { backgroundColor: 'red' } },
            onOk: async () => {
                await request('dcp_deleteConnect', { ids: selected_connections })
                message.success('删除成功')
                console.log(selected_connections, connection, 'kkkk')
                if (selected_connections.includes(Number(connection)))
                    set_connection(null)
                set_selected_connections([ ])
                mutate()
            }
        })
    }, [ mutate, selected_connections ])
    
    const on_delete_single_connection = useCallback(async ({ name, id }: Connection) => {
        Modal.confirm({
            title: t('确定要删除连接 {{name}}吗？', { name }),
            okButtonProps: { style: { backgroundColor: 'red' } },
            onOk: async () => {
                await request('dcp_deleteConnect', { ids: [id] })
                message.success('删除成功')
                if (selected_connections.includes(Number(id)))
                    set_connection(null)
                mutate()
            }
        })
    }, [ ])
   
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
                : data?.connections?.map(connection => ({
                    label: <div className='connection-menu-item'>
                            <Checkbox onClick={e => {
                            e.stopPropagation()
                            on_select_connection(connection.id)
                        }}>
                            {connection.name}
                        </Checkbox>
                        <DeleteOutlined 
                        onClick={async e => { 
                            e.stopPropagation() 
                            on_delete_single_connection(connection) 
                        }} 
                        className='connection-delete-icon'/>
                    </div>,
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
    
    console.log(database_inited, 'database_inited')
    
    if (isLoading || database_inited === 'unknow')
        return  <Spin>
            <div className='center-spin-div'/>
        </Spin> 
    
    
    return database_inited === 'inited' ? <div className='data-collection-wrapper'>
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
                : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('请选择连接')}/>
            }
        </div>
    </div> : <InitPage />
}
