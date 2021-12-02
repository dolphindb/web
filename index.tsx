import 'antd/dist/antd.css'
import './index.sass'
import 'xshell/scroll-bar.sass'
import 'xshell/myfont.sass'


import { default as React, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import {
    Layout, 
    Menu, 
    Card, 
    Statistic, 
    Row, Col, 
    Table,
    Typography
} from 'antd'
import { AppstoreOutlined, DatabaseOutlined, ProfileOutlined, RightSquareOutlined, TableOutlined } from '@ant-design/icons'


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
    view = 'tasks' as 'overview' | 'shell' | 'tables' | 'tasks'
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
            <Menu.Item key='tasks' icon={<ProfileOutlined />}>任务管理</Menu.Item>
        </Menu>
    </Layout.Sider>
}


function DdbContent () {
    const { view } = model.use(['view'])
    
    switch (view) {
        case 'shell':
            return <Shell />
        case 'tasks':
            return <Tasks />
        default:
            return null
    }
}


function Tasks () {
    const [cjobs, set_cjobs] = useState<DdbObj<DdbObj[]>>()
    const [bjobs, set_bjobs] = useState<DdbObj<DdbObj[]>>()
    const [sjobs, set_sjobs] = useState<DdbObj<DdbObj[]>>()
    
    const [perf, set_perf] = useState<DdbObj>()
    
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
    }, [ ])
    
    if (!cjobs || !bjobs || !sjobs)
        return null
        
    
    return <>
        <Row className='stats' gutter={16}>
            <Col span={8}>
                <Card>
                    <Statistic
                        title='同步作业（交互作业）'
                        value={cjobs.rows}
                    />
                </Card>
            </Col>
            <Col span={8}>
                <Card>
                    <Statistic
                        title='异步作业'
                        value={bjobs.rows}
                    />
                </Card>
            </Col>
            <Col span={8}>
                <Card>
                    <Statistic
                        title='定时作业'
                        value={sjobs.rows}
                    />
                </Card>
            </Col>
        </Row>
        
        <div className='cjobs'>
            <Title level={4}>同步作业 (getConsoleJobs) ({cjobs.rows})</Title>
            
            <Table
                bordered
                columns={cjobs.to_cols()}
                dataSource={cjobs.to_rows()}
                rowKey='rootJobId'
                pagination={false}
            />
        </div>
        
        <div className='bjobs'>
            <Title level={4}>异步作业 (getRecentJobs) ({bjobs.rows})</Title>
            
            <Table
                bordered
                columns={bjobs.to_cols()}
                dataSource={bjobs.to_rows()}
                rowKey='jobId'
                pagination={false}
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
        
        <div className='sjobs'>
            <Title level={4}>定时作业 (getScheduledJobs) ({sjobs.rows})</Title>
            
            <Table
                bordered
                columns={sjobs.to_cols()}
                dataSource={sjobs.to_rows()}
                rowKey='jobId'
                pagination={false}
            />
        </div>
    </>
    
    
}


ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
