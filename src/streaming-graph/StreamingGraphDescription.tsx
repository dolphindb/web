import { Descriptions, Button, Typography, Popconfirm, Modal, Input } from 'antd'
import useSWR from 'swr'
import { DeleteOutlined, ReloadOutlined, StopOutlined, WarningOutlined } from '@ant-design/icons'
import { useState } from 'react'

import { t } from '@i18n'

import { StatusTag, StatusType } from '@/components/tags/index.tsx'

import { model } from '@/model.ts'

import { getStreamGraphMeta } from './apis.ts'
import { type StreamGraphMeta } from './types.ts'


// Status mapping
const status_map = {
  building: StatusType.PARTIAL_SUCCESS,
  running: StatusType.SUCCESS,
  destroyed: StatusType.FAILED,
  error: StatusType.FAILED,
  failed: StatusType.FAILED,
  destroying: StatusType.PARTIAL_SUCCESS
}

interface StreamingGraphDescriptionProps {
  id: string
}

export function StreamingGraphDescription ({ id }: StreamingGraphDescriptionProps) {
  // Use useSWR to fetch streaming graph details
  const { data, error, isLoading, mutate } = useSWR(
    ['streamGraphs', id], 
    async () => getStreamGraphMeta(id),
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true
    }
  )
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [inputValue, setInputValue] = useState('')
  
  // Handle refresh
  function handleRefresh () {
    mutate()
  }
  
  // Calculate duration
  function getDuration (createTime: string) {
    if (!createTime)
        return '-'
    
    const start = new Date(createTime).getTime()
    const end = Date.now()
    const durationMs = end - start
    
    // Format duration
    const seconds = Math.floor(durationMs / 1000) % 60
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Get status display text
  function getStatusText (status: string) {
    const statuses = {
      building: 'Building',
      running: 'Running',
      error: 'Error',
      failed: 'Failed',
      destroying: 'Destroying',
      destroyed: 'Destroyed'
    }
    return statuses[status] || status
  }
  
  // Render action button
  function renderActions (graph: StreamGraphMeta) {
    const isActive = graph.status === 'running' || graph.status === 'building'
    
    return <>
        <Modal
          className='computing-delete-modal'
          title={
            <div className='delete-warning-title'>
              <WarningOutlined />
              <span>
                {t('确认删除流图')} <Typography.Text>{data.id}</Typography.Text> {t('吗？此操作不可恢复。')}
              </span>
            </div>
          }
          open={deleteModalVisible}
          onCancel={() => {
            setInputValue('')
            setDeleteModalVisible(false)
          }}
          cancelButtonProps={{ className: 'hidden' }}
          okText={t('删除流图')}
          okButtonProps={{ 
            disabled: inputValue !== 'YES', 
            danger: true 
          }}
          onOk={async () => {
            try {
              await model.cancel_job({ jobId: data.id })
              await model.ddb.invoke('dropStreamGraph', [data.id])
              model.message.success(t('删除流图成功'))
              setInputValue('')
              setDeleteModalVisible(false)
            } catch (error) {
              model.message.error(t('删除流图失败：') + error.message)
            }
          }}
        >
          <Input 
            placeholder={t("请输入 'YES' 以确认该操作")}
            value={inputValue}
            onChange={({ target: { value } }) => {
              setInputValue(value)
            }}
          />
        </Modal>
        <Button 
          icon={<DeleteOutlined />} 
          danger
          disabled={!isActive}
          size='small'
          onClick={() => { setDeleteModalVisible(true) }}
        >
          {t('删除流图')}
        </Button>
      </>
  }
  
  if (isLoading)
      return <Descriptions title='Streaming Graph Details' bordered size='small' />
  
  if (error || !data)
      return <Typography.Text type='danger'>{t('加载失败：')} {error?.message || 'Unknown error'}</Typography.Text>
  
  return <Descriptions 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span>{t('流图详情')}</span>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} size='small'>{t('刷新')}</Button>
        </div>
      }
      bordered
      column={3}
      size='small'
      className='compact-descriptions'
      style={{ 
        marginBottom: '16px' 
      }}
    >
      <Descriptions.Item label={t('流图 ID')}>{data.id}</Descriptions.Item>
      <Descriptions.Item label={t('流图状态')}>
        <StatusTag status={status_map[data.status]}>
          {getStatusText(data.status)}
        </StatusTag>
      </Descriptions.Item>
      <Descriptions.Item label={t('操作')}>
        {renderActions(data)}
      </Descriptions.Item>
      <Descriptions.Item label={t('创建时间')}>
        {data.createTime ? new Date(data.createTime).toLocaleString() : '-'}
      </Descriptions.Item>
      <Descriptions.Item label={t('持续时间')}>
        {getDuration(data.createTime)}
      </Descriptions.Item>
      <Descriptions.Item label={t('执行次数')}>
        {data.semantics}
      </Descriptions.Item>
    </Descriptions>
}
