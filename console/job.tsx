import './job.sass'

import { default as React, useEffect, useState } from 'react'

import {
    Button,
    Input,
    Popconfirm, 
    Table,
    Typography,
    message,
    type TablePaginationConfig,
} from 'antd'
import type { ColumnType } from 'antd/lib/table'
import { ReloadOutlined } from '@ant-design/icons'

import {
    DdbObj,
    nulls,
} from 'dolphindb/browser' 

import { t } from '../i18n'
import {
    model,
    type DdbJob,
} from './model'


const { Title, Text, Link } = Typography


export function Job () {
    const [refresher, set_refresher] = useState({ })
    
    const [cjobs, set_cjobs] = useState<DdbObj<DdbObj[]>>()
    const [rjobs, set_rjobs] = useState<DdbObj<DdbObj[]>>()
    const [sjobs, set_sjobs] = useState<DdbObj<DdbObj[]>>()
    
    const [query, set_query] = useState('')
    
    useEffect(() => {
        get_cjobs()
        get_rjobs()
        get_sjobs()
    }, [refresher])
    
    
    async function get_cjobs () {
        set_cjobs(
            await model.get_console_jobs()
        )
    }
    
    async function get_rjobs () {
        set_rjobs(
            await model.get_recent_jobs()
        )
    }
    
    async function get_sjobs () {
        set_sjobs(
            await model.get_scheduled_jobs()
        )
    }
    
    
    const pagination: TablePaginationConfig = {
        defaultPageSize: 5,
        pageSizeOptions: ['5', '10', '20', '50', '100'],
        size: 'small',
        showSizeChanger: true,
        showQuickJumper: true,
    }
    
    if (!cjobs || !rjobs || !sjobs)
        return null
    
    const cjob_rows = filter_job_rows(
        cjobs.to_rows(),
        query
    ).sort((l, r) => 
        -Number(l.receiveTime - r.receiveTime))
    
    const cjob_cols: ColumnType<Record<string, any>>[] = cjobs.to_cols()
    
    const gjobs = group_cjob_rows_by_rootid(cjob_rows)
    
    // finishedTasks 大的排在前面
    const gjob_rows = Object.values(gjobs)
        .sort((l, r) => 
            -(l.finishedTasks - r.finishedTasks))
    
    const rjob_rows = filter_job_rows(
        rjobs.to_rows()
            .map(compute_status_info),
        query
    ).sort((l, r) => {
        if (l.status !== r.status) {
            if (l.status === 'running')
                return -1
            if (r.status === 'running')
                return 1
        }
        return -Number(l.receivedTime - r.receivedTime)
    })
    
    const sjob_rows = filter_job_rows(
        sjobs.to_rows(),
        query
    )
    
    const n_rjob_rows_uncompleted = rjob_rows.filter(job => 
            job.status === 'queuing' || job.status === 'running'
        ).length
    
    
    return <>
        <div className='actions'>
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={() => {
                    set_refresher({ })
                }}
            >{t('刷新')}</Button>
            <Input.Search
                className='search'
                placeholder={t('输入关键字后按回车可搜索作业')}
                onSearch={ value => {
                    set_query(value)
                }}
            />
        </div>
        
        <div className={`cjobs ${ !gjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || gjob_rows.length) ? 'block' : 'none' }}>
            <Title level={4}>{t('运行中作业')} (getConsoleJobs) ({gjob_rows.length})</Title>
            
            <Table
                columns={
                    add_progress_col(
                        append_action_col(
                            cjob_cols
                                .filter(col => 
                                    group_cjob_columns.has(col.title as string))
                            ,
                            'stop',
                            async job => {
                                await model.cancel_console_job(job)
                                await get_cjobs()
                            }
                        )
                    )
                }
                dataSource={gjob_rows}
                rowKey='rootJobId'
                pagination={pagination}
                expandable={{
                    expandedRowRender: gjob => 
                        <Table
                            columns={
                                cjob_cols.filter(col => 
                                    expanded_cjob_columns.has(col.title as string))
                            }
                            dataSource={
                                cjob_rows.filter(job => 
                                    job.rootJobId === gjob.rootJobId)
                            }
                            rowKey={(job: DdbJob) => `${job.rootJobId}.${job.node || ''}`}
                            pagination={false}
                        />
                }}
            />
        </div>
        
        <div className={`rjobs ${ !rjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || rjob_rows.length) ? 'block' : 'none' }}>
            <Title level={4}>{t('已提交作业')} (getRecentJobs) ({n_rjob_rows_uncompleted} {t('个进行中')}, {rjob_rows.length - n_rjob_rows_uncompleted} {t('个已完成')})</Title>
            
            <Table
                columns={
                    add_status_col(
                        append_action_col(
                            rjobs.to_cols() as ColumnType<Record<string, any>>[],
                            'stop',
                            async job => {
                                await model.cancel_job(job)
                                await get_rjobs()
                            }
                        )
                    )
                }
                dataSource={rjob_rows}
                rowKey={(job: DdbJob) => `${job.jobId}.${job.node || ''}`}
                pagination={pagination}
            />
        </div>
        
        <div className={`sjobs ${ !sjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || sjob_rows.length) ? 'block' : 'none' }}>
            <Title level={4}>{t('已定时作业')} (getScheduledJobs) ({sjob_rows.length} {t('个已配置')})</Title>
            
            <Table
                columns={
                    append_action_col(
                        fix_scols(sjobs),
                        'delete',
                        async job => {
                            await model.delete_scheduled_job(job)
                            await get_sjobs()
                        }
                    )
                }
                dataSource={sjob_rows}
                rowKey={(job: DdbJob) => `${job.jobId}.${job.node || ''}`}
                pagination={pagination}
            />
        </div>
    </>
}

export default Job


const group_cjob_columns = new Set(['userID', 'rootJobId', 'jobType', 'desc', 'priority', 'parallelism', 'sessionId', 'remoteIP', 'remotePort', 'totalTasks', 'finishedTasks', 'runningTask'])
const expanded_cjob_columns = new Set(['node', 'receiveTime', 'firstTaskStartTime', 'latestTaskStartTime', 'queue', 'totalTasks', 'finishedTasks', 'runningTask'])

function group_cjob_rows_by_rootid (cjobs: DdbJob[]) {
    let gjobs: Record<string, DdbJob> = { }
    
    for (const job of cjobs) {
        const { rootJobId } = job
        if (rootJobId in gjobs) {
            let gjob = gjobs[rootJobId]
            gjob.totalTasks += job.totalTasks
            gjob.finishedTasks += job.finishedTasks
            gjob.runningTask += job.runningTask
        } else {
            let gjob: DdbJob = { }
            for (const col of group_cjob_columns)
                gjob[col] = job[col]
            gjobs[rootJobId] = gjob
        }
    }
    
    return gjobs
}


function fix_scols (sjobs: DdbObj<DdbObj[]>) {
    const cols: ColumnType<Record<string, any>>[] = sjobs.to_cols()
    
    const index = cols.findIndex(col => 
        col.title === 'node')
    
    if (index === -1)
        return cols
    
    return [cols[index], ...cols.slice(0, index), ...cols.slice(index + 1, cols.length)]
}

function append_action_col (
    cols: ColumnType<DdbJob>[],
    type: 'stop' | 'delete',
    action: (record: DdbJob) => any
) {
    cols.push(
        {
            title: 'actions',
            render: (value, job) => {
                const disabled = job.status && job.status !== 'queuing' && job.status !== 'running'
                
                return <Popconfirm
                    title={ type === 'stop' ? t('确认停止作业') : t('确认删除作业')}
                    onConfirm={async () => {
                        try {
                            await action(job)
                            message.success(
                                type === 'stop' ? t('停止作业指令发送成功') : t('删除作业成功')
                            )
                        } catch (error) {
                            message.error(error.message)
                        }
                    }}
                >
                    <Link title={ disabled ? t('作业已完成') : '' } disabled={disabled}>{
                        type === 'stop' ? t('停止') : t('删除')
                    }</Link>
                </Popconfirm>
            }
        }
    )
    
    return cols
}


/**
    异步作业更清晰的展示作业状态（根据 receivedTime, startTime, endTime 展示），增加 status 列，放到 jobDesc 后面
    - 如果无 startTime 说明还未开始 -> 排队中 (queuing) 黑色
    - 如果有 endTime 说明已完成 -> 已完成 (completed)  绿色 success
    - 有 startTime 无 endTime -> 执行中 (running)  黄色 warning
    - 有 errorMsg -> 出错了 (error)  红色 danger
 */
function add_status_col (cols: ColumnType<DdbJob>[]) {
    const i_priority = cols.findIndex(col => 
        col.title === 'priority')
    
    const col_status: ColumnType<DdbJob> = {
        title: 'status',
        key: 'status',
        render: (value, job) => 
            <Text type={job.theme}>{job.status}</Text>
    }
    
    cols.splice(i_priority, 0, col_status)
    
    return cols
}


function add_progress_col (cols: ColumnType<DdbJob>[]) {
    const i_priority = cols.findIndex(col => 
        col.title === 'priority')
    
    const col_progress: ColumnType<DdbJob> = {
        title: 'progress',
        key: 'progress',
        render: (value, job) => 
            <Text type='warning'>{(job.finishedTasks / job.totalTasks).toFixed(1)} %</Text>
    }
    
    cols.splice(i_priority, 0, col_progress)
    
    return cols
}


function filter_job_rows (jobs: DdbJob[], query: string) {
    return jobs.filter(({ jobId, rootJobId, desc, jobDesc, status, node, userId, userID }) =>
        !query ||
        jobId?.includes(query) ||
        rootJobId?.includes(query) ||
        (desc || jobDesc)?.includes(query) ||
        status?.includes(query) ||
        node?.includes(query) ||
        (userId || userID)?.includes(query)
    )
}

function compute_status_info (job: DdbJob) {
    const { startTime, endTime, errorMsg } = job
    
    if (startTime === nulls.int64) {
        job.status = 'queuing'
        return job
    }
    
    if (errorMsg) {
        job.status = 'error'
        job.theme = 'danger'
        return job
    }
    
    if (endTime === nulls.int64) {
        job.status = 'running'
        job.theme = 'warning'
        return job
    }
    
    job.status = 'completed'
    job.theme = 'success'
    
    return job
}

