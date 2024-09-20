import './job.sass'

import { useEffect, useState } from 'react'

import {
    Button, Input, Popconfirm, Table, Typography, Tooltip, Spin,
    type TablePaginationConfig, type TableColumnType, Modal
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { type DdbObj, format, DdbType, DdbFunctionType } from 'dolphindb/browser.js'

import { language, t } from '../i18n/index.js'

import { model, type DdbJob } from './model.js'

import { TableCellDetail } from './components/TableCellDetail/index.js'

const { Title, Text, Link } = Typography


const statuses = {
    queuing: t('排队中'),
    running: t('运行中', { context: 'job.status' }),
    completed: t('已完成'),
    failed: t('出错了'),
}

const cols_width = {
   rjobs: {
    userID: 120,
    jobId: 150,
    errorMsg: 220,
    priority: 65,
    parallelism: 65,
    clientIp: 120,
    clientPort: 90
   }
}


const ellipsis_cols = {
    rjobs: ['rootJobId']
}

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
        set_cjobs(await model.get_console_jobs())
    }
    
    async function get_rjobs () {
        set_rjobs(await model.get_recent_jobs())
    }
    
    async function get_sjobs () {
        set_sjobs(await model.get_scheduled_jobs())
    }
    
    
    const pagination: TablePaginationConfig = {
        defaultPageSize: 5,
        pageSizeOptions: ['5', '10', '20', '50', '100'],
        size: 'small',
        showSizeChanger: true,
        showQuickJumper: true,
    }
    
    if (!cjobs || !rjobs || !sjobs)
        return <div className='spin-container'>
            <Spin size='large' delay={300}/>
        </div>
    
    const cjob_rows = filter_job_rows(cjobs.to_rows(), query)
        .sort((l, r) => 
            -Number(l.receiveTime - r.receiveTime))
    
    const cjob_cols: TableColumnType<Record<string, any>>[] = cjobs.to_cols()
    
    const gjobs = group_cjob_rows_by_rootid(cjob_rows)
    
    // finishedTasks 大的排在前面
    const gjob_rows = Object.values(gjobs)
        .sort((l, r) => 
            -(l.finishedTasks - r.finishedTasks))
    
    const rjob_rows = filter_job_rows(
        set_detail_row(rjobs.to_rows().map(compute_status_info), [ 'errorMsg']),
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
    
    const sjob_rows = filter_job_rows(sjobs.to_rows(), query)
    
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
            <Input.Search className='search' placeholder={t('输入关键字后按回车可搜索作业')} onSearch={ value => { set_query(value) }} />
        </div>
        
        <div className={`cjobs themed ${ !gjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || gjob_rows.length) ? 'block' : 'none' }}>
            <Title level={4} className='title'>
                <Tooltip title='getConsoleJobs'>{t('运行中作业')} </Tooltip>
                ({gjob_rows.length} {t('个进行中')})
            </Title>
            
            <Table
                size='small'
                columns={
                    translate_columns(
                        add_progress_col(
                            append_action_col(
                                cjob_cols.filter(col => group_cjob_columns.has(col.title as string)),
                                'stop',
                                async job => {
                                    await model.cancel_console_job(job)
                                    await get_cjobs()
                                }
                            )
                        )
                    )
                }
                dataSource={gjob_rows}
                rowKey='rootJobId'
                pagination={gjob_rows.length > pagination.defaultPageSize && pagination }
                expandable={{
                    expandedRowRender: gjob => 
                        <Table
                            size='small'
                            columns={
                                translate_columns(
                                    cjob_cols.filter(col => 
                                        expanded_cjob_columns.has(col.title as string))
                                )
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
        
        <div className={`rjobs themed ${ !rjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || rjob_rows.length) ? 'block' : 'none' }}>
            <Title level={4} className='title'>
                <Tooltip title='getRecentJobs'>{t('已提交作业')} </Tooltip>
                ({n_rjob_rows_uncompleted} {t('个进行中')}, {rjob_rows.length - n_rjob_rows_uncompleted} {t('个已完成')})
            </Title>
            
            <Table
                size='small'
                columns={
                    handle_ellipsis_col(
                        set_col_width(
                            translate_columns(
                                add_status_col(
                                    append_action_col(
                                        rjobs.to_cols() as TableColumnType<Record<string, any>>[],
                                        'stop',
                                        async job => {
                                            await model.cancel_job(job)
                                            await get_rjobs()
                                        }
                                    )
                                )
                            ), 'rjobs'
                        ), 'rjobs'
                    )  
                }
                dataSource={rjob_rows}
                rowKey={(job: DdbJob) => `${job.jobId}.${job.node || ''}`}
                pagination={rjob_rows.length > pagination.defaultPageSize && pagination }
            />
        </div>
        
        <div className={`sjobs themed ${ !sjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || sjob_rows.length) ? 'block' : 'none' }}>
            <Title level={4} className='title'>
                <Tooltip title='getScheduledJobs'>{t('已定时作业')} </Tooltip>
                ({sjob_rows.length} {t('个已配置')})
            </Title>
            
            <Table
                size='small'
                columns={
                    translate_columns(
                        append_action_col(
                            fix_scols(sjobs),
                            'delete',
                            async job => {
                                await model.delete_scheduled_job(job)
                                await get_sjobs()
                            }
                        )
                    )
                }
                dataSource={sjob_rows}
                rowKey={(job: DdbJob) => `${job.jobId}.${job.node || ''}`}
                pagination={ sjob_rows.length > pagination.defaultCurrent && pagination }
            />
        </div>
    </>
}


const group_cjob_columns = new Set(['userID', 'rootJobId', 'jobType', 'desc', 'priority', 'parallelism', 'sessionId', 'remoteIP', 'remotePort', 'totalTasks', 'finishedTasks', 'runningTask'])
const expanded_cjob_columns = new Set(['node', 'receiveTime', 'firstTaskStartTime', 'latestTaskStartTime', 'queue', 'totalTasks', 'finishedTasks', 'runningTask'])


const column_names = {
    startTime: t('开始时间'),
    endTime: t('结束时间'),
    errorMsg: t('错误信息'),
    jobId: t('作业 ID'),
    rootJobId: t('根作业 ID'),
    jobDesc: t('详情'),
    desc: t('详情'),
    jobType: t('类型', { context: 'job' }),
    priority: t('优先级'),
    parallelism: t('并行度'),
    node: t('节点'),
    userID: t('用户 ID'),
    userId: t('用户 ID'),
    receiveTime: t('收到作业时间'),
    receivedTime: t('收到作业时间'),
    
    sessionId: t('会话 ID'),
    
    remoteIP: t('客户端 IP'),
    remotePort: t('客户端端口'),
    
    clientIp: t('客户端 IP'),
    clientPort: t('客户端端口'),
    
    totalTasks: t('全部任务'),
    
    finishedTasks: t('已完成任务'),
    
    runningTask: t('正在运行的任务'),
    
    // --- computed (getRecentJobs),
    status: t('状态', { context: 'job' }),
    theme: t('主题'),
    
    // --- computed (getConsoleJobs),
    progress: t('进度'),
    
    startDate: t('开始日期'),
    endDate: t('结束日期'),
    frequency: t('执行频率'),
    scheduledTime: t('执行定时任务的时间'),
    days: t('执行定时任务的日期'),
    actions: t('操作', { context: 'job' }),
    firstTaskStartTime: t('首个任务开始时间'),
    latestTaskStartTime: t('最后任务开始时间'),
    queue: t('队列')
}

const detail_title = {
    errorMsg: t('错误详细信息'),
    rootJobId: t('根作业 ID')
}

function translate_columns (cols: DdbJobColumn[]): DdbJobColumn[] {
    return cols.map(item => 
        ({ ...item, title: column_names[item.title as string] || item.title }))
}

function set_detail_row (table: Record<string, any>[], col_names: string[]) {
    return table.map(row => {
        for (let col_name of col_names)
            row[col_name] = <TableCellDetail title={detail_title[col_name]} content={row[col_name]}/>
        return row
    })
}


function handle_ellipsis_col (table: Record<string, any>[], table_name: string) {
    return table.map(row => {
        if (ellipsis_cols[table_name].includes(row.dataIndex)) 
            row = {
                ...row,
                render: text => <Tooltip placement='topLeft' title={text}>
                    <div className='ellipsis'>{text}</div>
                </Tooltip>
            }
        return row
    })
}


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
    const cols: TableColumnType<Record<string, any>>[] = sjobs.to_cols()
    
    const index = cols.findIndex(col => col.title === 'node')
    
    if (index === -1)
        return cols
    
    return [cols[index], ...cols.slice(0, index), ...cols.slice(index + 1, cols.length)]
}


/** 设置列宽 */
function set_col_width (cols: TableColumnType<Record<string, any>>[], type: string) {
    for (let width_key of Object.keys(cols_width[type])) 
        cols.find(col => col.dataIndex === width_key).width = cols_width[type][width_key]
    return cols
}


function append_action_col (
    cols: DdbJobColumn[],
    type: 'stop' | 'delete',
    action: (record: DdbJob) => any
) {
    cols.push(
        {
            title: 'actions',
            render: (value, job) => {
                const disabled = job.status && job.status !== 'queuing' && job.status !== 'running'
                const no_job_id = !job.jobId
                
                return <div className='action-col'>
                    {!no_job_id && <JobMessageShow job={job}/>}
                    
                    <Popconfirm
                        title={type === 'stop' ? t('确认停止作业') : t('确认删除作业')}
                        onConfirm={async () => {
                            await action(job)
                            model.message.success(
                                type === 'stop' ? t('停止作业指令发送成功') : t('删除作业成功')
                            )
                        }
                        }>
                        <Link title={disabled ? t('作业已完成') : ''} disabled={disabled}>{
                            type === 'stop' ? t('停止') : t('删除')
                        }</Link>
                    </Popconfirm>
                </div>
            }
        }
    )
    
    return cols
}


/** 异步作业更清晰的展示作业状态（根据 receivedTime, startTime, endTime 展示），增加 status 列，放到 jobDesc 后面
    - 如果无 startTime 说明还未开始 -> 排队中 (queuing) 黑色
    - 如果有 endTime 说明已完成 -> 已完成 (completed)  绿色 success
    - 有 startTime 无 endTime -> 执行中 (running)  黄色 warning
    - 有 errorMsg -> 出错了 (error)  红色 danger */
function add_status_col (cols: DdbJobColumn[]) {
    const i_priority = cols.findIndex(col => 
        col.title === 'priority')
    
    const col_status: DdbJobColumn = {
        title: 'status',
        key: 'status',
        width: language === 'zh' ? '80px' : '100px',
        render: (value, job) => 
            <Text type={job.theme}>{statuses[job.status] || job.status}</Text>
    }
    
    cols.splice(i_priority, 0, col_status)
    
    return cols
}


function add_progress_col (cols: DdbJobColumn[]) {
    const i_priority = cols.findIndex(col => 
        col.title === 'priority')
    
    const col_progress: DdbJobColumn = {
        title: 'progress',
        key: 'progress',
        render: (value, job) => 
            <Text type='warning'>{(job.finishedTasks * 100 / job.totalTasks).toFixed(1)} %</Text>
    }
    
    cols.splice(i_priority, 0, col_progress)
    
    return cols
}


function filter_job_rows (jobs: DdbJob[], query: string) {
    return jobs.filter(({ jobId, rootJobId, desc, jobDesc, status, node, userId, userID, remoteIP }) =>
        !query ||
        jobId?.includes(query) ||
        rootJobId?.includes(query) ||
        (desc || jobDesc)?.includes(query) ||
        (status && (status.includes(query) || statuses[status]?.includes(query))) ||
        node?.includes(query) ||
        (userId || userID)?.includes(query) ||
        (remoteIP && format(DdbType.ipaddr, remoteIP, true).includes(query))
    )
}

function compute_status_info (job: DdbJob) {
    const { startTime, endTime, errorMsg } = job
    if (!startTime) {
        job.status = 'queuing'
        return job
    }
    
    if (errorMsg) {
        job.status = 'failed'
        job.theme = 'danger'
        return job
    }
    
    if (!endTime) {
        job.status = 'running'
        job.theme = 'warning'
        return job
    }
    
    job.status = 'completed'
    job.theme = 'success'
    
    return job
}


type DdbJobColumn = TableColumnType<DdbJob>


function JobMessageShow ({ job }: { job: DdbJob }) {
    const [message, set_message] = useState<string>('')
    const [show, set_show] = useState(false)
    const node = job.node
    
    async function get_job_message () {
        const result = await model.ddb.invoke(
            'getJobMessage',
            [job.jobId ? job.jobId : job.rootJobId],
            model.node_alias === node ? undefined : { node, func_type: DdbFunctionType.SystemFunc }
        )
        set_show(true)
        set_message(result)
    }
    
    function copy_to_clipboard () {
        navigator.clipboard.writeText(message)
        model.message.success(t('复制成功'))
    }
    
    if (!node)
        return null
    
    return <>
        <Modal
            width='80vw'
            className='job-message-modal'
            title={t('作业日志')}
            footer={<div className='copy-button'>
                <Button style={{ marginRight: 8 }} onClick={copy_to_clipboard}>{t('复制')}</Button>
                <Button onClick={() => { set_show(false) }}>{t('关闭')}</Button>
            </div>}
            onCancel={() => { set_show(false) }}
            open={show}
        >
            <div className='job-message'>
                {message.split_lines().map((line, i) => <p key={i}>{line}</p>)}
            </div>
        </Modal>
        <Link title={t('查看日志')} onClick={get_job_message}>{
            t('查看日志')
        }</Link>
    </>
}
