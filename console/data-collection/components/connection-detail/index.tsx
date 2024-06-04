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

import type { Connection, ParserTemplate, Subscribe } from '../../type.js'
import { t } from '../../../../i18n/index.js'
import { request } from '../../utils.js'

import { CreateSubscribeModal } from '../create-subscribe-modal/index.js'

import { TemplateViewModal } from './parser-template-view-modal.js'
import { DeleteDescribeModal } from './delete-describe-modal.js'


interface IProps {
    connection: number
}

const DEFAULT_TEMPLATES = {
    items: [ ],
    total: 0
}

export function ConnectionDetail (props: IProps) {
    const { connection } = props
    
    const [selected_subscribes, set_selected_subscribes] = useState<number[]>([ ])    
    
    const { data, isLoading, mutate } = useSWR(
        ['dcp_getConnectAndSubInfo', connection],
        async () => {
            await request('dcp_subStatusMonitor', { connectId: Number(connection) })
            const res = await request<{ subscribes: Subscribe[], total: number, connectInfo: Connection }>('dcp_getConnectAndSubInfo', { connectId: Number(connection) })
            return res
        } 
    )
    
    const { data: { items: templates } = DEFAULT_TEMPLATES } = useSWR(
        'dcp_getParserTemplateList',
        async () => request<{ items: ParserTemplate[], total: number }>('dcp_getParserTemplateList', { protocol: data?.connectInfo?.protocol })
    )
    
    
    const desp_items = useMemo<DescriptionsProps['items']>(() => {
        if (!data?.connectInfo)
            return [ ]
        const { name, username, port, protocol, host } = data.connectInfo
        return [
            {
                label: t('连接名称'),
                key: '1',
                children: name
            },
            {
                label: t('用户名'),
                key: '2',
                children: username
            },
            {
                label: t('协议'),
                key: '3',
                children: protocol,
            },
            {
                label: t('服务器地址'),
                key: '4',
                children: host
            }, 
            {
                label: t('端口'),
                key: '5',
                children: port
            }
        ]
    }, [ data ])
    
    const onViewTemplate = useMemoizedFn((template: ParserTemplate) => {
        NiceModal.show(TemplateViewModal, { template })
    })
    
    
    const on_change_status = useCallback(async ({ id: subId, name }: Subscribe, status: boolean) => {
        Modal.confirm({
            title: t('确定要{{action}}{{name}}吗？', { action: status ? '启用' : '停用', name }),
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
    
    const columns = useMemo<Array<ColumnProps<Subscribe>>>(() => [
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
                    NiceModal.show(CreateSubscribeModal, { refresh: mutate, parser_templates: templates, edited_subscribe: record })
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
    ], [ templates, mutate, on_change_status ])
    
    
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
                        NiceModal.show(CreateSubscribeModal, { connection_id: connection, refresh: mutate, parser_templates: templates })}
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
                <Button icon={<RedoOutlined />} onClick={async () => mutate()}>
                    {t('检测订阅状态')}
                </Button>
            </Space>
        </div>
        
        
        <Table
            columns={columns} 
            dataSource={data?.subscribes ?? [ ]}
            rowKey='id'
            rowSelection={{
                onChange: selected_keys => { set_selected_subscribes(selected_keys as number[]) },
                getCheckboxProps: (subscribe: Subscribe) => ({ disabled: subscribe.status === 1 })
            }}
        />
        
    </div>
}
