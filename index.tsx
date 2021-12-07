import 'antd/dist/antd.css'
import './index.sass'
import 'xshell/scroll-bar.sass'
import 'xshell/myfont.sass'


import { default as React, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import {
    Button,
    Input,
    Layout, 
    Menu, 
    Popconfirm, 
    Table,
    Typography,
    message,
    type TablePaginationConfig,
} from 'antd'
import type { ColumnType } from 'antd/lib/table'
import type { BaseType } from 'antd/lib/typography/Base'
import { AppstoreOutlined, DatabaseOutlined, ProfileOutlined, RightSquareOutlined, TableOutlined, ReloadOutlined } from '@ant-design/icons'


import { delay } from 'xshell/utils.browser'

import Model from 'react-object-model'

import { t, Trans } from './i18n'

import Shell from './shell'
import {
    ddb,
    DdbObj,
    nulls,
} from './ddb.browser' 


const { Title, Text, Link } = Typography

class DdbModel extends Model <DdbModel> {
    view = 'jobs' as 'overview' | 'shell' | 'tables' | 'jobs'
}

let model = new DdbModel()


function DolphinDB () {
    const [connected, set_connected] = useState(false)
    
    useEffect(() => {
        (async () => {
            console.log(t('添加', { language: 'en' }))
            
            await ddb.connect()
            await ddb.call('login', ['admin', '123456'], { urgent: true })
            set_connected(true)
        })()
    }, [ ])
    
    if (!connected)
        return null
    
    return <Layout className='root-layout'>
        <Layout.Header className='header'>
            <div className='logo'>
                <img src='./ddb.png' />
                <span className='title'>DolphinDB 控制台</span>
            </div>
        </Layout.Header>
        <Layout className='body'>
            <DdbSider />
            <Layout.Content className='view'>
                <div className='view-card'>
                    <DdbContent />
                </div>
            </Layout.Content>
        </Layout>
    </Layout>
}


function DdbSider () {
    return <Layout.Sider width={200} className='sider' theme='dark'>
        <Menu
            className='menu'
            mode='inline'
            theme='dark'
            defaultSelectedKeys={[model.view]}
            onSelect={({ key }) => {
                model.set({ view: key as DdbModel['view'] })
            }}
        >
            <Menu.Item key='overview' icon={<AppstoreOutlined />}>总览</Menu.Item>
            <Menu.Item key='shell' icon={<RightSquareOutlined />}>Shell</Menu.Item>
            <Menu.SubMenu key='data' title='数据' icon={<DatabaseOutlined />}>
                <Menu.Item key='tables' icon={<TableOutlined />}>数据表</Menu.Item>
            </Menu.SubMenu>
            <Menu.Item key='jobs' icon={<ProfileOutlined />}>作业管理</Menu.Item>
        </Menu>
    </Layout.Sider>
}


function DdbContent () {
    const { view } = model.use(['view'])
    
    switch (view) {
        case 'shell':
            return <Shell />
        case 'jobs':
            return <Jobs />
        default:
            return null
    }
}


function Jobs () {
    const [refresher, set_refresher] = useState({ })
    
    const [cjobs, set_cjobs] = useState<DdbObj<DdbObj[]>>()
    const [bjobs, set_bjobs] = useState<DdbObj<DdbObj[]>>()
    const [sjobs, set_sjobs] = useState<DdbObj<DdbObj[]>>()
    
    const [query, set_query] = useState('')
    
    
    async function get_cjobs () {
        set_cjobs(
            await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getConsoleJobs)', { urgent: true })
        )
    }
    
    async function get_bjobs () {
        set_bjobs(
            await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getRecentJobs)', { urgent: true })
        )
    }
    
    async function get_sjobs () {
        set_sjobs(
            await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getScheduledJobs)', { urgent: true })
        )
    }
    
    useEffect(() => {
        get_cjobs()
        get_bjobs()
        get_sjobs()
    }, [refresher])
    
    const pagination: TablePaginationConfig = {
        defaultPageSize: 5,
        pageSizeOptions: ['5', '10', '20', '50', '100'],
        size: 'small',
        showSizeChanger: true,
        showQuickJumper: true,
    }
    
    if (!cjobs || !bjobs || !sjobs)
        return null
    
    const cjob_rows = filter_job_rows(
        cjobs.to_rows(),
        query
    )
    
    const bjob_rows = filter_job_rows(
        bjobs.to_rows()
            .map(compute_status_info),
        query
    )
    
    const sjob_rows = filter_job_rows(
        sjobs.to_rows(),
        query
    )
    
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
                placeholder='输入关键字搜索'
                onSearch={ value => {
                    set_query(value)
                }}
            />
        </div>
        
        <div className='cjobs' style={{ display: cjob_rows.length ? 'block' : 'none' }}>
            <Title level={4}>{t('同步作业')} (getConsoleJobs) ({cjob_rows.length})</Title>
            
            <Table
                columns={
                    append_action_col(
                        cjobs.to_cols(),
                        async ({ rootJobId }) => {
                            await ddb.call('cancelConsoleJob', [rootJobId], { urgent: true })
                            await get_cjobs()
                        }
                    )
                }
                dataSource={cjob_rows}
                rowKey='rootJobId'
                pagination={pagination}
            />
        </div>
        
        <div className='bjobs' style={{ display: bjob_rows.length ? 'block' : 'none' }}>
            <Title level={4}>{t('异步作业')} (getRecentJobs) ({bjob_rows.length})</Title>
            
            <Table
                columns={
                    add_status_col(
                        append_action_col(
                            bjobs.to_cols(),
                            async ({ jobId }) => {
                                await ddb.call('cancelJob', [jobId], { urgent: true })
                                await get_bjobs()
                            }
                        )
                    )
                }
                dataSource={bjob_rows}
                rowKey='jobId'
                pagination={pagination}
            />
        </div>
        
        <div className='sjobs' style={{ display: sjob_rows.length ? 'block' : 'none' }}>
            <Title level={4}>{t('定时作业')} (getScheduledJobs) ({sjob_rows.length})</Title>
            
            <Table
                columns={
                    append_action_col(
                        fix_scols(sjobs),
                        async ({ jobId }) => {
                            await ddb.call('deleteScheduledJob', [jobId], { urgent: true })
                            await get_sjobs()
                        }
                    )
                }
                dataSource={sjobs.to_rows()}
                rowKey='jobId'
                pagination={pagination}
            />
        </div>
    </>
}


function fix_scols (sjobs: DdbObj<DdbObj[]>) {
    let cols = sjobs.to_cols()
    let index = 0
    for (let item of cols) {
        if (item.title === 'node') break
        else index++
    }
    if (index) {
        let a = cols.slice(0, index)
        let b = cols.slice(index + 1, cols.length)
        cols = [cols[index], ...a, ...b]
    }
    return cols
}

function append_action_col (
    cols: ColumnType<Job>[],
    cancel: (record: { jobId?: string, rootJobId?: string }) => any
) {
    cols.push(
        {
            title: 'action',
            render: (value, job) => (
                <Popconfirm
                    title={t('确认取消作业')}
                    onConfirm={async () => {
                        try {
                            await cancel(job)
                            message.success(t('取消作业成功'))
                        } catch (error) {
                            message.error(error.message)
                        }
                    }}
                >
                    <Link disabled={job.status && job.status !== 'queuing' && job.status !== 'running'}>{t('取消')}</Link>
                </Popconfirm>
            )
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
function add_status_col (
    cols: ColumnType<Job>[]
) {
    const i_priority = cols.findIndex(col => 
        col.title === 'priority')
    
    const col_status: ColumnType<Job> = {
        title: 'status',
        key: 'status',
        render: (value, job) => 
            <Text type={job.theme}>{job.status}</Text>
    }
    
    cols.splice(i_priority, 0, col_status)
    
    return cols
}


function filter_job_rows (jobs: Job[], query: string) {
    return jobs.filter(({ jobId, rootJobId, desc, jobDesc, status, node, userId, userID }) =>
        !query ||
        (jobId || rootJobId)?.includes(query) || 
        (desc || jobDesc)?.includes(query) ||
        status?.includes(query) ||
        node?.includes(query) ||
        (userId || userID)?.includes(query)
    )
}

function compute_status_info (job: Job) {
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


interface Job {
    startTime?: bigint
    endTime?: bigint
    errorMsg?: string
    
    jobId?: string
    rootJobId?: string
    
    jobDesc?: string
    desc?: string
    
    node?: string
    
    userId?: string
    userID?: string
    
    // -- computed
    status: 'queuing' | 'error' | 'running' | 'completed'
    theme: BaseType
}

ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
