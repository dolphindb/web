import './index.sass'
import 'antd/dist/antd.css'

import { default as React, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Layout, Menu, Card, Statistic, Row, Col } from 'antd'
import { AppstoreOutlined, DatabaseOutlined, ProfileOutlined, RightSquareOutlined, TableOutlined } from '@ant-design/icons'

import Model from 'react-object-model'

import Shell from './shell'
import {
    ddb,
    DdbObj,
    type DdbValue
} from './ddb.browser'


class DdbModel extends Model <DdbModel> {
    view = 'tasks' as 'overview' | 'shell' | 'tables' | 'tasks'
}

let model = new DdbModel()


function DolphinDB () {
    const [connected, set_connected] = useState(false)
    
    useEffect(() => {
        (async () => {
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
                <DdbContent />
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
        }}>
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
    const [cjobs, set_cjobs] = useState<DdbObj>()
    const [perf, set_perf] = useState<DdbObj>()
    
    useEffect(() => {
        (async () => {
            (async () => {
                console.log(
                    await ddb.eval('pnodeRun(getScheduledJobs)')
                )
                
                console.log(
                    await ddb.eval('pnodeRun(getRecentJobs)')
                )
                
                const cjobs = await ddb.eval('pnodeRun(getConsoleJobs)')
                console.log(cjobs)
                set_cjobs(cjobs)
            })()
        })()
    }, [ ])
    
    return <Row gutter={16}>
        <Col span={8}>
            <Card>
                <Statistic
                    title='同步作业（交互作业）'
                    value={cjobs?.value[0].rows as number}
                />
            </Card>
        </Col>
        <Col span={16}>
            <Card>
                <Statistic
                    title='异步作业'
                    value={cjobs?.value[0].rows as number}
                />
            </Card>
        </Col>
    </Row>
    
}


ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
