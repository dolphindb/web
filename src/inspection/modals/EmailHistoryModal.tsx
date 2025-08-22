import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n'
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, type TableColumnsType } from 'antd'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import type { Dayjs } from 'dayjs'
import { datetime_format } from 'xshell/utils.browser.js'

import { inspection } from '@/inspection/model.ts'
import type { EmailHistory } from '@/inspection/type.ts' 

const { RangePicker } = DatePicker

export const EmailHistoryModal = NiceModal.create(() => {
    const modal = useModal()
    const [form] = Form.useForm()
    
    const [filters, set_filters] = useState({
        planId: '',
        reportId: '',
        userId: '',
        recipient: '',
        startTime: '',
        endTime: '',
        status: ''
    })
    
    const [refresh, set_refresh] = useState(0)
    
    const { data: email_history, isLoading, mutate } = useSWR(
        ['email_history', filters, refresh],
        async () => inspection.get_email_history(
                filters.planId || undefined,
                filters.reportId || undefined,
                filters.userId || undefined,
                filters.recipient || undefined,
                filters.startTime || undefined,
                filters.endTime || undefined,
                filters.status as 'sending' | 'sent' | 'failed' || undefined
            )
    )
    
    function handle_search (values: any) {
        const { dateRange, ...rest } = values
        const [startTime, endTime] = dateRange || [null, null]
        
        set_filters({
            ...rest,
            startTime: startTime ? startTime.format(datetime_format) : '',
            endTime: endTime ? endTime.format(datetime_format) : ''
        })
    }
    
    function handle_reset () {
        form.resetFields()
        set_filters({
            planId: '',
            reportId: '',
            userId: '',
            recipient: '',
            startTime: '',
            endTime: '',
            status: ''
        })
    }
    
    const columns: TableColumnsType<EmailHistory> = [
        {
            title: t('计划 ID'),
            dataIndex: 'planId',
            key: 'planId',
            width: 120,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        },
        {
            title: t('报告 ID'),
            dataIndex: 'reportId',
            key: 'reportId',
            width: 120,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        },
        {
            title: t('发送人'),
            dataIndex: 'userId',
            key: 'userId',
            width: 100,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        },
        {
            title: t('收件人'),
            dataIndex: 'recipient',
            key: 'recipient',
            width: 200,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        },
        {
            title: t('邮件主题'),
            dataIndex: 'subject',
            key: 'subject',
            width: 400,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        },
        {
            title: t('发送时间'),
            dataIndex: 'sendTime',
            key: 'sendTime',
            width: 160,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        },
        {
            title: t('发送状态'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (status: string) => {
                const status_config = {
                    sending: { color: 'processing', icon: <LoadingOutlined />, text: t('发送中') },
                    sent: { color: 'success', icon: <CheckCircleOutlined />, text: t('发送成功') },
                    failed: { color: 'error', icon: <CloseCircleOutlined />, text: t('发送失败') }
                }
                const config = status_config[status as keyof typeof status_config]
                return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>
            }
        },
        {
            title: t('错误信息'),
            dataIndex: 'errorMessage',
            key: 'errorMessage',
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (errorMessage: string) => errorMessage || '-'
        }
    ]
    
    return <Modal
            open={modal.visible}
            afterClose={modal.remove}
            onCancel={modal.hide}
            title={t('邮件告警历史')}
            width='90vw'
            footer={null}
        >
            <Form
                form={form}
                layout='inline'
                onFinish={handle_search}
                style={{ marginBottom: 16, gap: 16 }}
            >
                <Form.Item name='dateRange' label={t('发送时间')}>
                    <RangePicker showTime />
                </Form.Item>
                <Form.Item name='status' label={t('发送状态')}>
                    <Select placeholder={t('请选择发送状态')} allowClear style={{ width: 120 }}>
                        <Select.Option value='sending'>{t('发送中')}</Select.Option>
                        <Select.Option value='sent'>{t('发送成功')}</Select.Option>
                        <Select.Option value='failed'>{t('发送失败')}</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type='primary' htmlType='submit'>{t('搜索')}</Button>
                        <Button onClick={handle_reset}>{t('重置')}</Button>
                        <Button onClick={() => { set_refresh(r => r + 1) }}>{t('刷新')}</Button>
                    </Space>
                </Form.Item>
            </Form>
            
            <Table
                dataSource={email_history || [ ]}
                columns={columns}
                loading={isLoading}
                rowKey='sendTime'
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => t('第 {{start}}-{{end}} 条，共 {{total}} 条', {
                        start: range[0],
                        end: range[1],
                        total
                    })
                }}
                scroll={{ x: 1500 }}
            />
        </Modal>
}) 
