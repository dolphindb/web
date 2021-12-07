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
    Table,
    Typography,
    type TablePaginationConfig,
    Popconfirm,
} from 'antd'
import { AppstoreOutlined, DatabaseOutlined, ProfileOutlined, RightSquareOutlined, TableOutlined, ReloadOutlined, RadiusSettingOutlined } from '@ant-design/icons'


import { delay } from 'xshell/utils.browser'

import Model from 'react-object-model'

import { t, Trans } from './i18n'

import Shell from './shell'
import {
    ddb,
    DdbObj,
} from './ddb.browser' 


const { Title } = Typography

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
            await ddb.call('login', ['admin', '123456'])
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
    const [searchValue, set_sValue] = useState('')

    const getcjobs = (async () => {
        set_cjobs(
            await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getConsoleJobs)')
        )
    })
    const getbjobs = (async () => {
        set_bjobs(
            await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getRecentJobs)')
        )
    })
    const getsjobs = (async () => {
        set_sjobs(
            await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getScheduledJobs)')
        )
    })

    let cjobsRows 
    let bjobsRows 
    let sjobsRows 

    useEffect(() => {
        ;(async () => {
            set_cjobs(
                await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getConsoleJobs)')
            )
        })()
        
        ;(async () => {
            set_bjobs(
                await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getRecentJobs)')
            )
        })()
        
        ;(async () => {
            set_sjobs(
                await ddb.eval<DdbObj<DdbObj[]>>('pnodeRun(getScheduledJobs)')
            )
        })()
        set_sValue('')
    }, [refresher])
    

    function getRows(jobs: DdbObj<DdbObj[]>, searchValue: string, jobType: string){
        let rows = jobs.to_rows()
        if(searchValue != ''){
            rows = rows.filter((item) => {
                const {rootJobId, jobId, desc, jobDesc} = item
                let flag = false
                if(rootJobId !== undefined){
                    flag = flag || rootJobId.includes(searchValue) ? true : false
                }
                if(desc !== undefined){
                    flag = flag || desc.includes(searchValue) ? true : false
                }
                if(jobId !== undefined){
                    flag = flag || jobId.includes(searchValue) ? true : false
                }
                if(jobDesc !== undefined){
                    flag = flag || jobDesc.includes(searchValue) ? true : false
                }
                return flag
            })
        }
        console.log(rows)
        return rows
    }

    

    function addAction (jobs : DdbObj<DdbObj[]>, func: string){
        let cols = jobs.to_cols();
        const action: Record<string, any> = { title: 'Action', fixed: 'right', width: 100 ,render: (_, record: { jobId?:string, rootJobId?: string }) => (
            <Popconfirm title="Sure to delete?" onConfirm={() => {
                const { jobId, rootJobId, ...others } = record
                let args:string[] = []
                if(jobId != undefined) args.push(jobId)
                if(rootJobId != undefined) args.push(rootJobId)
                ;(async () => {
                    await ddb.call(func, args)
                    switch(func){
                        case 'deleteScheduledJob':
                            getsjobs()
                            break
                        case 'cancelJob':
                            getbjobs()
                            break
                        case 'cancelConsoleJob':
                            getcjobs()
                            break
                    }
                })()

            }}>
                <a>Cancel</a>
            </Popconfirm>
        ) }
        cols.push(action)
        return cols
    }

    function fix_scols (sjobs: DdbObj<DdbObj[]>) {
        let cols = addAction(sjobs, 'deleteScheduledJob')
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
    
    
    if (!cjobs || !bjobs || !sjobs)
        return null
        
    const pagination: TablePaginationConfig = {
        defaultPageSize: 5,
        pageSizeOptions: ['5', '10', '20', '50', '100'],
        size: 'small',
        showSizeChanger: true,
        showQuickJumper: true,
    }
    
    cjobsRows = getRows(cjobs, searchValue, 'cjobs')
    bjobsRows = getRows(bjobs, searchValue, 'bjobs')
    sjobsRows = getRows(sjobs, searchValue, 'sjobs')

    return <>
        <div className='actions'>
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={() => { set_refresher({ }) }}
            >{t('刷新')}</Button>
            <Input.Search
                className='search'
                placeholder='输入作业 ID 或作业描述'
                onSearch={(value) => { 
                    console.log(value)
                    set_sValue(value)
                }}
            />
        </div>
        
        <div className='cjobs' style={{display: searchValue !== '' && !cjobsRows.length? 'none' : 'block'}}>
            <Title level={4}>同步作业 (getConsol eJobs) ({cjobs.rows})</Title>
            
            <Table
                bordered
                columns={addAction(cjobs, 'cancelConsoleJob')}
                dataSource={cjobsRows}
                rowKey='rootJobId'
                pagination={pagination}
            />
        </div>
        
        <div className='bjobs' style={{display:  searchValue !== '' && !bjobsRows.length? 'none' : 'block'}}>
            <Title level={4}>异步作业 (getRecentJobs) ({bjobs.rows})</Title>
            
            <Table
                bordered
                columns={addAction(bjobs, 'cancelJob')}
                dataSource={bjobsRows}
                rowKey='jobId'
                pagination={pagination}
                expandable={{
                    expandedRowRender (row) {
                        return 'expanded'
                    },
                    rowExpandable () {
                        return true
                    },
                }}
            />
        </div>
        
        <div className='sjobs' style={{display:  searchValue !== '' && !sjobsRows.length? 'none' : 'block'}}>
            <Title level={4}>定时作业 (getScheduledJobs) ({sjobs.rows})</Title>
            
            <Table
                bordered
                columns={fix_scols(sjobs)}
                dataSource={sjobsRows}
                rowKey='jobId'
                pagination={pagination}
            />
        </div>
    </>
}


ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
