import { Typography, Tooltip } from 'antd'
import useSWR from 'swr'

import { t } from '@i18n'

import { StatusTag, StatusType } from '@/components/tags/index.tsx'
import { DDBTable } from '@/components/DDBTable/index.tsx'

import { model } from '@/model.ts'

import { getStreamGraphMetaList } from './apis.ts'
import { type StreamGraphMeta } from './types.ts'

const { Text } = Typography

// 定义状态映射
const status_map = {
  building: StatusType.PARTIAL_SUCCESS,
  running: StatusType.SUCCESS,
  destroyed: StatusType.FAILED,
  error: StatusType.FAILED,
  failed: StatusType.FAILED,
  destroying: StatusType.PARTIAL_SUCCESS
}

export function JobTable () {
  
  // 使用 useSWR 获取流计算图数据
  const { data: streamGraphs, isLoading } = useSWR(
    'streamGraphs', 
    getStreamGraphMetaList,
    {
      refreshInterval: 30000, // 每30秒刷新一次
      revalidateOnFocus: true
    }
  )
  
  // 行点击处理
  function handleRowClick (record: StreamGraphMeta) {
    model.goto(`/streaming-graph/${record.fqn}`)
  }
  
  // 定义表格列
  const columns = [
    {
      title: t('流图名称'),
      dataIndex: 'fqn',
      key: 'fqn',
      render: (text: string) => <Typography.Text ellipsis>{text || '-'}</Typography.Text>
    },
    {
      title: t('创建者'),
      dataIndex: 'owner',
      key: 'owner',
      render: (text: string) => <Text>{text || '-'}</Text>
    },
    {
      title: t('创建时间'),
      dataIndex: 'createTime',
      key: 'createTime',
      sorter: (a: StreamGraphMeta, b: StreamGraphMeta) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
      render: (time: string) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: t('数据执行次数'),
      dataIndex: 'semantics',
      key: 'semantics',
      render: (semantics: string) => <Text>{semantics}</Text>
    },
    {
      title: t('任务数量'),
      key: 'tasks',
      render: (_: any, record: StreamGraphMeta) => {
        const total = record.tasks.length || 0
        const running = record.tasks.filter(task => task.status === 'running').length
        
        return <div style={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={t('总任务数')}>
              <div style={{ 
                backgroundColor: '#333', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '4px',
                marginRight: '4px'
              }}>
                {total}
              </div>
            </Tooltip>
            
            {running > 0 && (
              <Tooltip title={t('运行中任务数')}>
                <div style={{ 
                  backgroundColor: '#52c41a', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '4px' 
                }}>
                  {running}
                </div>
              </Tooltip>
            )}
          </div>
      }
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      sorter: (a: StreamGraphMeta, b: StreamGraphMeta) => {
        const statusOrder = { 
          running: 0, 
          building: 1, 
          error: 2, 
          failed: 3,
          destroying: 4,
          destroyed: 5
        }
        return statusOrder[a.status] - statusOrder[b.status]
      },
      render: (status: string) => {
        const statuses = {
          building: t('构建中'),
          running: t('运行中'),
          error: t('错误'),
          failed: t('失败'),
          destroying: t('销毁中'),
          destroyed: t('已销毁')
        }
        return <StatusTag status={status_map[status]}>{statuses[status] || status}</StatusTag>
      }
    }
  ]
  
  return <div className='job-table-container'>
      <DDBTable
        title={<>
          <Tooltip title={t('Streaming Graph List')}>{t('流图列表')}</Tooltip>
          ({streamGraphs?.filter(graph => graph.status === 'running').length || 0} {t('个')}{t('运行中')})
        </>}
        columns={columns}
        dataSource={streamGraphs || [ ]}
        rowKey='id'
        loading={isLoading}
        scroll={{ x: 'max-content' }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        onRow={record => ({
          onClick: () => { handleRowClick(record) },
          style: { cursor: 'pointer' }
        })}
      />
    </div>
}
