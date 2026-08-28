import { useEffect, useState } from 'react'

import { Button, Empty, Input, Modal, Select, Space, Table, message } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { IMemoryJob } from '@/agent/model/types.ts'
import {
    AgentListLayout,
    ellipsis_text,
    format_browser_time,
    show_error,
    use_agent_options,
    use_user_options,
    use_valid_agent_selection,
} from '@/agent/dolphinx/common.tsx'


const memory_job_kind_options = ['memory_stage1', 'memory_phase2', 'memory_derive_fields'].map(value => ({ value, label: value }))
const memory_job_status_options = ['running', 'done', 'pending', 'error', 'failed'].map(value => ({ value, label: value }))


export function MemoryJobsSection () {
    const { options } = use_agent_options()
    const user_options = use_user_options()
    const memory_job_user_options = user_options.some(user => user.value === 'admin')
        ? user_options
        : [{ value: 'admin', label: 'admin' }, ...user_options]
    
    const [selected_agent_id, set_selected_agent_id] = useState('')
    const [kind, set_kind] = useState('')
    const [status, set_status] = useState('')
    const [target_user_id, set_target_user_id] = useState('')
    const [jobs, set_jobs] = useState<IMemoryJob[]>([ ])
    const [job_page, set_job_page] = useState(1)
    const [job_page_size, set_job_page_size] = useState(20)
    const [job_total, set_job_total] = useState(0)
    const [job_detail, set_job_detail] = useState<IMemoryJob | null>(null)
    const [job_detail_loading_key, set_job_detail_loading_key] = useState('')
    const [loading, set_loading] = useState(false)
    use_valid_agent_selection(options, selected_agent_id, set_selected_agent_id)
    
    useEffect(() => {
        if (selected_agent_id)
            load_jobs(1, job_page_size)
    }, [selected_agent_id, kind, status, target_user_id])
    
    async function load_jobs (page = job_page, page_size = job_page_size) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const offset = (page - 1) * page_size
            const result = await chat_model.memory.list_memory_jobs({
                agentId: selected_agent_id,
                kind: kind || undefined,
                status: status || undefined,
                targetUserId: target_user_id || undefined,
                offset,
                limit: page_size,
            })
            set_jobs(result.items)
            set_job_page(page)
            set_job_page_size(page_size)
            set_job_total(result.total)
        } catch (error) {
            show_error(error, t('加载记忆任务失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function retry_job (job: IMemoryJob) {
        if (!selected_agent_id)
            return
        set_loading(true)
        try {
            await chat_model.memory.retry_memory_job(selected_agent_id, job.kind, job.jobKey)
            message.success(t('记忆任务重试次数已重置'))
            await load_jobs(job_page)
        } catch (error) {
            show_error(error, t('重置记忆任务重试次数失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function open_job_detail (job: IMemoryJob) {
        if (!selected_agent_id)
            return
        const key = `${job.kind}:${job.jobKey}`
        set_job_detail_loading_key(key)
        try {
            set_job_detail(await chat_model.memory.get_memory_job(selected_agent_id, job.kind, job.jobKey))
        } catch (error) {
            show_error(error, t('加载记忆任务详情失败'))
        } finally {
            set_job_detail_loading_key('')
        }
    }
    
    return <AgentListLayout
        detail_title={t('记忆任务')}
        list_subtitle={t('选择需要查看记忆任务的 Agent')}
        options={options}
        selected_agent_id={selected_agent_id}
        set_selected_agent_id={set_selected_agent_id}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Select allowClear showSearch style={{ width: 180 }} placeholder={t('任务类型')} value={kind || undefined} onChange={value => { set_kind(value || '') }} options={memory_job_kind_options} />
            <Select allowClear showSearch style={{ width: 140 }} placeholder={t('任务状态')} value={status || undefined} onChange={value => { set_status(value || '') }} options={memory_job_status_options} />
            <Select allowClear showSearch style={{ width: 180 }} placeholder={t('用户')} value={target_user_id || undefined} onChange={value => { set_target_user_id(value || '') }} options={memory_job_user_options} />
            <Button style={{ marginLeft: 'auto' }} loading={loading} onClick={() => { load_jobs(1) }}>{t('刷新')}</Button>
        </div>
        <Table
            size='small'
            rowKey={job => `${job.kind}:${job.jobKey}`}
            loading={loading}
            dataSource={jobs}
            tableLayout='fixed'
            scroll={{ x: 1250 }}
            pagination={{
                current: job_page,
                pageSize: job_page_size,
                total: job_total,
                showSizeChanger: true,
                onChange: load_jobs,
            }}
            columns={[
                { title: t('任务类型'), dataIndex: 'kind', width: 130 },
                { title: t('任务状态'), dataIndex: 'status', width: 120 },
                { title: t('用户'), dataIndex: 'targetUserId', width: 120, render: ellipsis_text },
                { title: t('任务 Key'), dataIndex: 'jobKey', ellipsis: true, render: ellipsis_text },
                { title: t('开始时间'), dataIndex: 'startedTime', width: 170, render: format_browser_time },
                { title: t('完成时间'), dataIndex: 'finishedTime', width: 170, render: format_browser_time },
                { title: t('剩余重试'), dataIndex: 'retryRemaining', width: 90 },
                { title: t('最近错误'), dataIndex: 'lastError', ellipsis: true, render: ellipsis_text },
                {
                    title: t('操作'),
                    width: 230,
                    render: (_: unknown, job: IMemoryJob) => <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                        <Button size='small' loading={job_detail_loading_key === `${job.kind}:${job.jobKey}`} onClick={() => { open_job_detail(job) }}>{t('详情')}</Button>
                        <Button size='small' onClick={() => { retry_job(job) }}>{t('重置次数')}</Button>
                    </Space>,
                },
            ]}
        />
        <Modal
            title={t('记忆任务详情')}
            open={Boolean(job_detail)}
            onCancel={() => { set_job_detail(null) }}
            footer={null}
            width={760}
        >
            {job_detail && <Space direction='vertical' style={{ width: '100%' }}>
                <Table
                    size='small'
                    pagination={false}
                    showHeader={false}
                    rowKey='key'
                    tableLayout='fixed'
                    dataSource={[
                        { key: 'kind', label: t('任务类型'), value: job_detail.kind },
                        { key: 'status', label: t('任务状态'), value: job_detail.status || '-' },
                        { key: 'targetUserId', label: t('用户'), value: job_detail.targetUserId || '-' },
                        { key: 'jobKey', label: t('任务 Key'), value: job_detail.jobKey },
                        { key: 'workerId', label: t('Worker'), value: job_detail.workerId || '-' },
                        { key: 'startedTime', label: t('开始时间'), value: format_browser_time(job_detail.startedTime) },
                        { key: 'finishedTime', label: t('完成时间'), value: format_browser_time(job_detail.finishedTime) },
                        { key: 'retryAt', label: t('重试时间'), value: format_browser_time(job_detail.retryAt) },
                        { key: 'retryRemaining', label: t('剩余重试'), value: job_detail.retryRemaining ?? '-' },
                        { key: 'inputWatermark', label: t('输入水位'), value: job_detail.inputWatermark || '-' },
                        { key: 'lastSuccessWatermark', label: t('成功水位'), value: job_detail.lastSuccessWatermark || '-' },
                    ]}
                    columns={[
                        { dataIndex: 'label', width: 140 },
                        { dataIndex: 'value', render: ellipsis_text },
                    ]}
                />
                {job_detail.lastError && <Input.TextArea value={job_detail.lastError} rows={4} readOnly />}
                {job_detail.extra && <Input.TextArea value={job_detail.extra} rows={4} readOnly />}
            </Space>}
        </Modal>
    </AgentListLayout>
}
