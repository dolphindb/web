import './index.sass'

import { useEffect, useState } from 'react'

import {
    Button, Input, Popconfirm, Table, Typography, Tooltip, Spin,
    type TablePaginationConfig, type TableColumnType, Modal
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { type DdbObj, format, DdbType } from 'dolphindb/browser.js'

import { Editor } from '@monaco-editor/react'

import { language, t } from '@i18n'

import { model, type DdbJob } from '@model'

import { DDBTable } from '@/components/DDBTable/index.tsx'
import { StatusTag, StatusType } from '@/components/tags/index.tsx'

const { Text, Link } = Typography


const statuses = {
    queuing: t('排队中'),
    running: t('运行中', { context: 'job.status' }),
    completed: t('已完成'),
    failed: t('出错了'),
}

const status_map = {
    queuing: StatusType.PARTIAL_SUCCESS,
    running: StatusType.RUNNING,
    completed: StatusType.SUCCESS,
    failed: StatusType.FAILED
}


const ellipsis_cols = {
    rjobs: ['rootJobId']
}

const expand_cols = ['errorMsg']

export function Job () {
    const { username } = model.use(['username'])
    
    const [refresher, set_refresher] = useState({ })
    
    const [cjobs, set_cjobs] = useState<DdbObj<DdbObj[]>>()
    const [rjobs, set_rjobs] = useState<DdbObj<DdbObj[]>>()
    const [sjobs, set_sjobs] = useState<DdbObj<DdbObj[]>>()
    
    const [query, set_query] = useState('')
    
    useEffect(() => {
        get_cjobs()
        get_rjobs()
        get_sjobs()
    }, [refresher, username])
    
    
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
        // size: 'small',
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
        rjobs.to_rows().map(compute_status_info),
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
            <Input.Search className='search' placeholder={t('输入关键字后按回车可搜索作业')} onSearch={ value => { set_query(value) }} />
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={() => {
                    set_refresher({ })
                }}
            >{t('刷新')}</Button>
        </div>
        
        <div className={`cjobs themed ${ !gjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || gjob_rows.length) ? 'block' : 'none' }}>
            <DDBTable
                title={<>
                    <Tooltip title='getConsoleJobs'>{t('运行中作业')} </Tooltip>
                    ({gjob_rows.length} {t('个进行中')})
                </>}
         
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
                scroll={{ x: 'max-content' }}
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
            
            <DDBTable
                title={<>
                    <Tooltip title='getRecentJobs'>{t('已提交作业')} </Tooltip>
                    ({n_rjob_rows_uncompleted} {t('个进行中')}, {rjob_rows.length - n_rjob_rows_uncompleted} {t('个已完成')})
                </>}
                columns={
                    handle_ellipsis_col(
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
                    )  
                }
                scroll={{ x: 'max-content' }}
                dataSource={rjob_rows}
                rowKey={(job: DdbJob) => `${job.jobId}.${job.node || ''}`}
                pagination={rjob_rows.length > pagination.defaultPageSize && pagination }
            />
        </div>
        
        <div className={`sjobs themed ${ !sjob_rows.length ? 'nojobs' : '' }`} style={{ display: (!query || sjob_rows.length) ? 'block' : 'none' }}>
        
            <DDBTable
                title={<>
                     <Tooltip title='getScheduledJobs'>{t('已定时作业')} </Tooltip>
                     ({sjob_rows.length} {t('个已配置')})
                </>}
                
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
                scroll={{ x: 'max-content' }}
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

function translate_columns (cols: DdbJobColumn[]): DdbJobColumn[] {
    return cols.map(item => {
        const expand = expand_cols.includes(item.dataIndex as string)
        return { 
            ...item, 
            title: column_names[item.title as string] || item.title,
            width: expand ? 400 : item.width,
            render: expand 
                ? value => <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 1, expandable: 'collapsible' }}>{value}</Typography.Paragraph>
                : item.render
        }
    
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


function append_action_col (
    cols: DdbJobColumn[],
    type: 'stop' | 'delete',
    action: (record: DdbJob) => any
) {
    cols.push(
        {
            title: 'actions',
            fixed: 'right',
            render: (value, job) => {
                // 如果是 admin，可以取消所有 job
                // 如果是普通用户，可以 cancel 自己的
                // 如果未登录，不能 cancel job
                
                const completed = job.status && 
                    job.status !== 'queuing' && 
                    job.status !== 'running'
                    
                
                return <div className='action-col'>
                    <JobMessageShow
                        disabled={!job.jobId}
                        job={job} />
                    
                    <Popconfirm
                        title={type === 'stop' ? t('确认停止作业') : t('确认删除作业')}
                        okButtonProps={{ danger: true, type: 'primary' }}
                        onConfirm={async () => {
                            await action(job)
                            model.message.success(
                                type === 'stop' ? t('停止作业指令发送成功') : t('删除作业成功'))
                        }
                    }>
                        <Link
                            type='danger'
                            title={completed ? t('作业已完成') : ''}
                            disabled={!(
                                !completed && 
                                model.logined &&
                                (model.admin || (job.userId || job.userID) === model.username)
                            )}>{
                                type === 'stop' ? t('停止') : t('删除')
                            }
                        </Link>
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
        render: (value, job) => <StatusTag status={status_map[job.status]}>{statuses[job.status] || job.status}</StatusTag>
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


const message_lines_limit = 500

function JobMessageShow ({ job, disabled }: { job: DdbJob, disabled?: boolean }) {
    const [message, set_message] = useState<string[]>([ ])
    const [show, set_show] = useState(false)
    const [show_all, set_show_all] = useState(false)
    const [show_see_more, set_show_see_more] = useState(false)
    const node = job.node
    
    const text = message.join_lines()
    
    async function get_job_message () {
        set_show_all(false)
        await model.ddb.execute(
            'def get_job_message_line_count (jobId) {\n' +
            '    return size(split(getJobMessage(jobId),"\\n"))\n' +
            '}\n'
        )
        
        const count = await model.ddb.invoke<number>(
            'get_job_message_line_count',
            [job.jobId ? job.jobId : job.rootJobId],
            model.node_alias === node ? undefined : { node }
        )
        
        if (count > message_lines_limit) 
            set_show_see_more(true)
        
        await model.ddb.execute(
            'def get_job_message_limit (jobId, count) {\n' +
            '    message_arr = split(getJobMessage(jobId), "\\n")\n' +
            '    message_size = size message_arr\n' +
            '    return subarray(message_arr, pair(0, int(min(count, message_size - 1))))\n' +
            '}\n'
        )
        
        const result = await model.ddb.invoke<string[]>(
            'get_job_message_limit',
            [
                job.jobId ? job.jobId : job.rootJobId, 
                message_lines_limit
            ],
            model.node_alias === node ? undefined : { node }
        )
        set_show(true)
        set_message(result)
    }
    
    async function show_all_messages () {
        set_show_all(true)
        const result = await model.ddb.invoke<string>(
            'getJobMessage',
            [job.jobId ? job.jobId : job.rootJobId],
            model.node_alias === node ? undefined : { node }
        )
        set_message(result.split_lines())
    }
    
    async function copy_to_clipboard () {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
            model.message.success(t('复制成功'))
        } else {
            const textarea = document.createElement('textarea')
            textarea.value = text
            textarea.style.position = 'fixed'  // Avoid scrolling to bottom
            textarea.style.opacity = '0'      // Make it invisible
            document.body.appendChild(textarea)
            textarea.focus()
            textarea.select()
            if (document.execCommand('copy'))
                model.message.success(t('复制成功'))
            document.body.removeChild(textarea)
        }
    }
    
    if (!node)
        return null
    
    return <>
        <Modal
            width='80%'
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
                <Editor height='100%' width='100%' defaultLanguage='plaintext' value={message.join_lines()} options={{ readOnly: true }} />
            </div>
            <div>
                {!show_all && show_see_more && <Link title={t('当前显示的是日志的一部分，点击以查看完整日志')} onClick={show_all_messages}>{t('当前显示的是日志的一部分，点击以查看完整日志')}</Link>}
            </div>
        </Modal>
        <Link disabled={disabled} title={t('查看日志')} onClick={get_job_message}>{
            t('查看日志')
        }</Link>
    </>
}
