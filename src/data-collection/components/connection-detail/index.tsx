import './index.scss'
import { Button, Descriptions, Modal, Space, Spin, Switch, Table, Typography, message } from 'antd'

import { useCallback, useMemo, useState } from 'react'

import type { DescriptionsProps } from 'antd/lib/index.js'

import useSWR from 'swr'

import type { ColumnProps } from 'antd/es/table/Column.js'

import Link from 'antd/es/typography/Link.js'

import { useMemoizedFn } from 'ahooks'


import NiceModal from '@ebay/nice-modal-react'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import dayjs from 'dayjs'

import { Protocol, type ISubscribe, type ConnectionDetail, type IParserTemplate } from '../../type.js'
import { t } from '../../../../i18n/index.js'
import { request } from '../../utils.ts'

import { CreateSubscribeModal } from '../create-subscribe-modal/index.js'


import { get_connect_detail, get_parser_templates } from '../../api.js'

import { PROTOCOL_MAP } from '@/data-collection/constant.ts'

import { TemplateViewModal } from './parser-template-view-modal.js'
import { DeleteDescribeModal } from './delete-describe-modal.js'


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
        async () => get_connect_detail(connection)
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
    
    
    const on_change_status = useCallback(async ({ id, name }: ISubscribe, status: boolean) => {
        const modal = Modal.confirm({
            title: t('确定要{{action}}{{name}}吗？', { action: status ? t('启用') : t('停用'), name }),
            onOk: async () => {
                try {
                    if (status) {
                        await request('dcp_startSubscribe', { subId: id })
                        set_selected_subscribes(selected_subscribes.filter(item => item !== id))
                    }
                    else
                        await request('dcp_stopSubscribe', { subId: [id] })
                    message.success(status ? t('订阅成功') : t('已停用订阅'))
                    mutate()
                } catch (error) {
                    modal.destroy()
                    throw error
                }
            },
            okButtonProps: status ? undefined : { style: { backgroundColor: 'red' } }
        })
    }, [ mutate, selected_subscribes ])
    
    const on_create_subscribe = useCallback(async () => 
        NiceModal.show(CreateSubscribeModal, { 
            protocol: data.connectInfo.protocol, 
            connection_id: connection, 
            refresh: mutate
    }), [  data?.connectInfo?.protocol, connection, mutate, templates ])
    
    
    const columns = useMemo<Array<ColumnProps<ISubscribe>>>(() => [
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
            width: 250
        },
        {
            title: t('主题', { context: 'data_collection' }),
            dataIndex: 'topic',
            key: 'topic',
            width: 100,
        },
        {
            title: t('点位解析模板'),
            dataIndex: 'handlerId',
            width: 300,
            render: handlerId => {
                const template = templates?.find(item => item.id === handlerId)
                return <div className='parser-template'>
                    {template?.name}
                    <Link className='view-btn' onClick={() => { onViewTemplate(template) }}>{t('查看')}</Link>
                </div>
            }
        },
        {
            title: t('节点'),
            dataIndex: 'subNode',
            width: 200,
        },
        {
            title: t('创建时间'),
            dataIndex: 'createTime',
            width: 250,
            sorter: (a, b ) => dayjs(a.createTime).valueOf() - dayjs(b.createTime).valueOf()
        },
        {
            title: t('更新时间'),
            dataIndex: 'updateTime',
            width: 250,
            sorter: (a, b) => dayjs(a.updateTime).valueOf() - dayjs(b.updateTime).valueOf()
        },
        {
            title: t('是否启用'),
            dataIndex: 'status',
            width: 100,
            render: (status, record) => <Switch checked={status === 1} onClick={async checked => on_change_status(record, checked)}/>
        },
        {
            title: t('操作'),
            dataIndex: 'operations',
            width: 200,
            render: (_, record) => <Space>
                <Typography.Link 
                disabled={record.status === 1}
                onClick={async () => {
                    NiceModal.show(CreateSubscribeModal, { protocol: data?.connectInfo?.protocol, refresh: mutate, parser_templates: templates, edited_subscribe: record })
                } }>
                    {t('编辑')}
                </Typography.Link>
                
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
    
    
    return <Spin spinning={isLoading}>
        <div className='connection-detail'>
        <Descriptions 
            className='base-info'
            title={t('基本信息')}
            items={desp_items}
        />
        <h3>{t('订阅列表')}</h3>
        <Space className='subscribe-btn-group'>
            <Button 
                icon={<PlusOutlined />} 
                type='primary' 
                onClick={on_create_subscribe}
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
        
        
        <Table
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
