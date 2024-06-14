import './index.scss'
import { Button, Descriptions, Modal, Space, Spin, Switch, Table, Typography, message } from 'antd'

import { useCallback, useMemo, useState } from 'react'

import type { DescriptionsProps } from 'antd/lib/index.js'

import useSWR from 'swr'

import type { ColumnProps } from 'antd/es/table/Column.js'

import Link from 'antd/es/typography/Link.js'

import { useMemoizedFn } from 'ahooks'


import NiceModal from '@ebay/nice-modal-react'

import { DeleteOutlined, PlusOutlined, RedoOutlined } from '@ant-design/icons'

import { Protocol, type ISubscribe, type ConnectionDetail, type IParserTemplate } from '../../type.js'
import { t } from '../../../../i18n/index.js'
import { request } from '../../utils.js'

import { CreateSubscribeModal } from '../create-subscribe-modal/index.js'

import { safe_json_parse } from '../../../dashboard/utils.js'

import { get_connect_detail, get_parser_templates } from '../../api.js'

import { TemplateViewModal } from './parser-template-view-modal.js'
import { DeleteDescribeModal } from './delete-describe-modal.js'
import { ViewStatusModal } from './view-status-modal.js'


interface IProps {
    connection: string
}

const DEFAULT_TEMPLATES = {
    items: [ ] as IParserTemplate[],
    total: 0
}

export function ConnectionDetail (props: IProps) {
    const { connection } = props
    
    const [selected_subscribes, set_selected_subscribes] = useState<string[]>([ ])    
    
    const { data, isLoading, mutate } = useSWR(
        ['dcp_getConnectAndSubInfo', connection],
        async () => {
            await request('dcp_checkSubStatus', { connectId: connection })
            const res = await get_connect_detail(connection)
            return res
        } 
    )
    
    const { data: { items: templates } = DEFAULT_TEMPLATES } = useSWR(
        data ? ['dcp_getParserTemplateList', data.connectInfo.protocol] : null,
        async () => get_parser_templates(data.connectInfo.protocol)
    )
    
    const desp_items = useMemo<DescriptionsProps['items']>(() => {
        if (!data?.connectInfo)
            return [ ]
        const { name, username, port, protocol, host } = data.connectInfo
        return [
            {
                label: t('连接名称'),
                key: 'name',
                children: name
            },
            ...(protocol === Protocol.MQTT ? [{
                    label: t('用户名'),
                    key: 'username',
                    children: username
            }] : [ ]),
            {
                label: t('协议'),
                key: 'protocol',
                children: protocol,
            },
            {
                label: t('服务器地址'),
                key: 'host',
                children: host
            }, 
            {
                label: t('端口'),
                key: 'port',
                children: port
            }
        ]
    }, [ data ])
    
    const onViewTemplate = useMemoizedFn((template: IParserTemplate) => {
        NiceModal.show(TemplateViewModal, { template })
    })
    
    
    const on_change_status = useCallback(async ({ id: subId, name }: ISubscribe, status: boolean) => {
        Modal.confirm({
            title: t('确定要{{action}}{{name}}吗？', { action: status ? t('启用') : t('停用'), name }),
            onOk: async () => {
                if (status)
                    await request('dcp_startSubscribe', { subId })
                else
                    await request('dcp_stopSubscribe', { subId: [subId] })
                message.success(status ? t('订阅成功') : t('停用订阅'))
                mutate()
            },
            okButtonProps: status ? undefined : { style: { backgroundColor: 'red' } }
        })
    }, [ mutate ])
    
    const columns = useMemo<Array<ColumnProps<ISubscribe>>>(() => [
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name'
        },
        {
            title: t('主题'),
            dataIndex: 'topic',
            key: 'topic'
        },
        {
            title: t('点位解析模板'),
            dataIndex: 'handlerId',
            render: handlerId => {
                const template = templates?.find(item => item.id === handlerId)
                return <div className='parser-template'>
                    {template?.name}
                    <Link className='view-btn' onClick={() => { onViewTemplate(template) }}>{t('查看')}</Link>
                </div>
            }
        },
        {
            title: t('状态'),
            dataIndex: 'status',
            render: (status, record) => <Switch checked={status === 1} onClick={async checked => on_change_status(record, checked)}/>
        },
        {
            title: t('操作'),
            dataIndex: 'operations',
            render: (_, record) => <Space>
                <Typography.Link 
                disabled={record.status === 1}
                onClick={async () => {
                    NiceModal.show(CreateSubscribeModal, { protocol: data.connectInfo.protocol, refresh: mutate, parser_templates: templates, edited_subscribe: record })
                } }>
                    {t('编辑')}
                </Typography.Link>
                
                {/* <Typography.Link onClick={ async () => NiceModal.show(ViewStatusModal, { id: record.id })}>
                    {t('状态')}
                </Typography.Link> */}
                
                <Typography.Link 
                    disabled={record.status === 1} 
                    onClick={async () => { await NiceModal.show(DeleteDescribeModal, { ids: [record.id], refresh: mutate }) }}
                    type='danger' 
                >
                    {t('删除')}
                </Typography.Link>
               
            </Space>
        }
    ], [ templates, mutate, on_change_status, data ])
    
    
    return isLoading
    ? <Spin spinning={isLoading}/> 
    : <div className='connection-detail'>
        <Descriptions 
            className='base-info'
            title={t('基本信息')}
            items={desp_items}
        />
        
        <div className='describe-title'>
            <h3>{t('订阅列表')}</h3>
            <Space>
                <Button 
                    icon={<PlusOutlined />} 
                    type='primary' 
                    onClick={async () => 
                        NiceModal.show(CreateSubscribeModal, { protocol: data.connectInfo.protocol, connection_id: connection, refresh: mutate, parser_templates: templates })}
                >
                    {t('新增订阅')}
                </Button>
                <Button 
                    icon={<DeleteOutlined />} 
                    danger 
                    onClick={async () => { await NiceModal.show(DeleteDescribeModal, { ids: selected_subscribes, refresh: mutate }) }} 
                    disabled={!selected_subscribes.length}
                >
                    {t('批量删除')}
                </Button>
            </Space>
        </div>
        
        
        <Table
            columns={columns} 
            dataSource={data?.subscribes ?? [ ]}
            rowKey='id'
            rowSelection={{
                onChange: selected_keys => { set_selected_subscribes(selected_keys as string[]) },
                getCheckboxProps: (subscribe: ISubscribe) => ({ disabled: subscribe.status === 1 })
            }}
        />
        
    </div>
}
