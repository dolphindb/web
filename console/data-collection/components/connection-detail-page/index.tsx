import { Descriptions, Empty, Space, Typography } from 'antd'

import { useMemo } from 'react'

import type { DescriptionsProps } from 'antd/lib/index.js'

import useSWR from 'swr'

import type { ColumnProps } from 'antd/es/table/Column.js'

import Link from 'antd/es/typography/Link.js'

import { useMemoizedFn } from 'ahooks'

import type { Connection, Subscribe } from '../../type.js'
import { t } from '../../../../i18n/index.js'
import { request } from '../../utils.js'


interface IProps {
    connection: Connection
}
export function ConnectionDetailPage (props: IProps) {
    const { connection } = props
    
    const desp_items = useMemo<DescriptionsProps['items']>(() => [
        {
            label: t('用户名'),
            key: connection.name,
            children: connection.name
        },
        {
            label: t('协议'),
            key: connection.protocol,
            children: connection.protocol,
        },
        {
            label: t('服务器地址'),
            key: connection.host,
            children: connection.host
        }, 
        {
            label: t('端口'),
            key: connection.port,
            children: connection.port
        },
        {
            label: t('数据包大小'),
            key: connection.batchSize,
            children: connection.batchSize
        },
        {
            label: t('发送缓冲区大小'),
            key: connection.sendbufSize,
            children: connection.sendbufSize
        }
    ], [ ])
    
    const { data, isLoading } = useSWR(
        '',
        async () => request<{ items: Subscribe[], total: number }>('', { id: connection.id })
    )
    
    const onViewTemplate = useMemoizedFn((id: string) => {
        
    })
    
    const onEdit = useMemoizedFn((id: string) => { })
    
    
    
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
            dataIndex: 'handler',
            render: (_, { id }) => <Link onClick={() => { onViewTemplate(id) }}>查看</Link>
        },
        {
            title: t('操作'),
            dataIndex: 'operations',
            render: (_, record) => <Space>
                <Typography.Link>编辑</Typography.Link>
                <Typography.Link type='danger'>删除</Typography.Link>
            </Space>
        }
    ], [ ])
    
    
    return <div className='connection-detail'>
        <Descriptions 
            title={t('基本信息')}
            items={desp_items}
        />
        
    </div>
}
