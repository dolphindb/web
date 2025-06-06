import './index.scss'
import { Button, Descriptions, Popconfirm, Spin, Switch, Typography } from 'antd'

import { useCallback, useMemo, useState } from 'react'

import type { DescriptionsProps } from 'antd/lib/index.js'

import useSWR from 'swr'

import type { ColumnProps } from 'antd/es/table/Column.js'


import { useMemoizedFn } from 'ahooks'


import NiceModal from '@ebay/nice-modal-react'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import dayjs from 'dayjs'


import { t } from '@i18n'

import { model } from '@model'

import { request } from '@/data-collection/utils.ts'

import { PROTOCOL_MAP } from '@/data-collection/constant.ts'

import { get_connect_detail, get_parser_templates } from '@/data-collection/api.ts'
import { type IParserTemplate, Protocol, type ISubscribe } from '@/data-collection/type.ts'
import { CreateSubscribeModal } from '../create-subscribe-modal/index.tsx'

import { DDBTable } from '@/components/DDBTable/index.tsx'

import { TableOperations } from '@/components/TableOperations/index.tsx'


import { DeleteDescribeModal } from './delete-describe-modal.tsx'
import { TemplateViewModal } from './parser-template-view-modal.tsx'


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
    
    const { data, mutate, isLoading } = useSWR(
        ['dcp_getConnectAndSubInfo', connection],
        async () => {
            set_selected_subscribes([ ])
            return get_connect_detail(connection)
        }
    )
    
    const { data: { items: templates } = DEFAULT_TEMPLATES } = useSWR(
        data?.connectInfo?.protocol ? ['dcp_getParserTemplateList', data?.connectInfo?.protocol] : null,
        async () => get_parser_templates(data?.connectInfo?.protocol)
    )
    
    const desp_items = useMemo<DescriptionsProps['items']>(() => {
        const { name, username, port, protocol, host } = data?.connectInfo ?? { }
        return [
            {
                label: t('连接名称'),
                key: 'name',
                children: name ?? '-'
            },
            ...(protocol === Protocol.MQTT ? [{
                    label: t('用户名'),
                    key: 'username',
                    children: username ?? '-'
            }] : [ ]),
            {
                label: t('协议'),
                key: 'protocol',
                children: PROTOCOL_MAP[protocol] ?? '-',
            },
            {
                label: t('服务器地址'),
                key: 'host',
                children: host ?? '-'
            }, 
            {
                label: t('端口', { context: 'data_collection' }),
                key: 'port',
                children: port ?? '-'
            }
        ]
    }, [ data ])
    
    const onViewTemplate = useMemoizedFn((template: IParserTemplate) => {
        NiceModal.show(TemplateViewModal, { template })
    })
    
    
    const on_change_status = useCallback(async ({ id, status }: ISubscribe) => {
        const is_enable = status === 0
        if (is_enable) {
            await request('dcp_startSubscribe', { subId: id })
            set_selected_subscribes(selected_subscribes.filter(item => item !== id))
        }
        else
            await request('dcp_stopSubscribe', { subId: [id] })
        model.message.success(is_enable  ? t('订阅成功') : t('已停用订阅'))
        mutate()
    }, [mutate, selected_subscribes])
    
    const on_create_subscribe = useCallback(async () => 
        NiceModal.show(CreateSubscribeModal, { 
            protocol: data.connectInfo.protocol, 
            connection_id: connection, 
            refresh: mutate,
            mode: 'create'
    }), [  data?.connectInfo?.protocol, connection, mutate, templates ])
    
    
    const columns = useMemo<Array<ColumnProps<ISubscribe>>>(() => [
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 200,
            ellipsis: true
        },
        {
            title: t('主题', { context: 'data_collection' }),
            dataIndex: 'topic',
            key: 'topic',
            width: 150,
            ellipsis: true,
        },
        {
            title: t('点位解析模板'),
            dataIndex: 'handlerId',
            width: 300,
            render: handlerId => {
                const template = templates?.find(item => item.id === handlerId)
                return <div className='parser-template'>
                    {template?.name}
                    <Typography.Link className='view-btn' onClick={() => { onViewTemplate(template) }}>{t('查看')}</Typography.Link>
                </div>
            }
        },
        {
            title: t('是否启用'),
            dataIndex: 'status',
            width: 120,
            render: (status, record) => <Popconfirm 
                okButtonProps={{ danger: status === 1 }}
                title={t('确定要{{action}}{{name}}吗？', { action: status !== 1 ? t('启用') : t('停用'), name: record.name })} 
                onConfirm={async () => on_change_status(record)}
            >
                <Switch checked={status === 1}/>
            </Popconfirm>
        },
        {
            title: t('节点'),
            dataIndex: 'subNode',
            width: 120,
        },
        {
            title: t('创建时间'),
            dataIndex: 'createTime',
            width: 180,
            sorter: (a, b ) => dayjs(a.createTime).valueOf() - dayjs(b.createTime).valueOf()
        },
        {
            title: t('更新时间'),
            dataIndex: 'updateTime',
            width: 180,
            sorter: (a, b) => dayjs(a.updateTime).valueOf() - dayjs(b.updateTime).valueOf()
        },
        {
            title: t('操作'),
            dataIndex: 'operations',
            width: 150,
            fixed: 'right',
            render: (_, record) => {
                const disabled = record.status === 1
                return  <TableOperations>
                    <Typography.Link 
                        onClick={() => {
                            NiceModal.show(CreateSubscribeModal, { 
                                protocol: data?.connectInfo?.protocol, 
                                refresh: mutate, 
                                parser_templates: templates, 
                                edited_subscribe: record, 
                                mode: disabled ?  'view' as const : 'edit' as const
                            })
                        } }
                    >
                        {disabled ? t('查看') : t('编辑')} 
                    </Typography.Link>
                    
                    <Typography.Link 
                        disabled={record.status === 1} 
                        onClick={async () => { await NiceModal.show(DeleteDescribeModal, { ids: [record.id], refresh: mutate }) }}
                        type='danger' 
                    >
                        {t('删除')}
                    </Typography.Link>
                
                </TableOperations>
            }
        }
    ], [ templates, mutate, on_change_status, data ])
    
    
    return <Spin spinning={isLoading}>
        <div className='connection-detail'>
            <h2>{t('基本信息')}</h2>
            <Descriptions 
                className='base-info'
                items={desp_items}
            />
        
            <DDBTable<ISubscribe> 
                title={t('订阅列表')} 
                buttons={
                    <>
                        <Button type='primary' icon={<PlusOutlined />} onClick={on_create_subscribe}>{t('新增订阅')}</Button>
                        <Button 
                            danger
                            disabled={!selected_subscribes.length} 
                            icon={<DeleteOutlined />}
                            onClick={async () => { 
                                await NiceModal.show(
                                    DeleteDescribeModal, 
                                    { ids: selected_subscribes, refresh: mutate }
                                ) }}
                        >{t('批量删除')}</Button>
                    </>} 
                columns={columns} 
                scroll={{ x: '100%' }}
                dataSource={data?.subscribes ?? [ ]}
                rowKey='id'
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    hideOnSinglePage: true
                }}
                rowSelection={{
                    onChange: selected_keys => { set_selected_subscribes(selected_keys as string[]) },
                    getCheckboxProps: (subscribe: ISubscribe) => ({ disabled: subscribe.status === 1 }),
                    selectedRowKeys: selected_subscribes
                }}
            />
        </div>
    </Spin>
}
