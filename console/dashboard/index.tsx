import 'gridstack/dist/gridstack.css'
import 'gridstack/dist/gridstack-extra.css'
import './index.sass'


import { useEffect, useRef, useState } from 'react'

import { App, ConfigProvider, theme, Table, type TableColumnType, Button } from 'antd'

import * as echarts from 'echarts'


import { dashboard } from './model.js'

import { Sider } from './Sider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Header } from './Header.js'


import config from './chart.config.json' assert { type: 'json' }

echarts.registerTheme('my-theme', config.theme)


/** 基于 GridStack.js 开发的拖拽图表可视化面板  
    https://gridstackjs.com/
    https://github.com/gridstack/gridstack.js/tree/master/doc
    
    GridStack.init 创建实例保存到 dashboard.grid  
    所有的 widgets 配置保存在 dashboard.widgets 中  
    通过 widget.ref 保存对应的 dom 节点，在 widgets 配置更新时将 ref 给传给 react `<div>` 获取 dom  
    通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理  
    通过 GridStack.on('dropped', ...) 监听用户从外部添加拖拽 widget 到 GridStack 的事件  
    通过 GridStack.on('change', ...) 响应 GridStack 中 widget 的位置或尺寸变化的事件 */
export function DashBoard () {
    return <ConfigProvider
        theme={{
            hashed: false,
            token: {
                borderRadius: 0,
                motion: false,
                colorBgContainer: 'rgb(40, 40, 40)',
                colorBgElevated: '#555555',
                colorInfoActive: 'rgb(64, 147, 211)'
            },
            algorithm: theme.darkAlgorithm
        }}
    >
        <App className='app'>
            <DashboardManage />
        </App>
    </ConfigProvider>
}

function DashboardManage () {
    const { configs } = dashboard.use([ 'configs'])
    
    const [choose_dashboard, set_choose_dashboard] = useState(false)
    
    useEffect(() => {
        (async () => {
            try {
                await dashboard.get_configs()
            } catch (error) {
                dashboard.show_error({ error })
                throw error
            }
        })()
    }, [ ])
    
    function handle_delete (dashboard_id: number) {
        console.log(dashboard_id)
    }
    
    function handle_edit (dashboard_id: number) {
        console.log(dashboard_id)
    }
    
    function handle_export (dashboard_id: number) {
        console.log(dashboard_id)
    }
    
    return  !choose_dashboard ?
                <>  
                    <div>
                        <Button>新增</Button>
                        <Button>导入</Button>
                        <Button>分享</Button>
                    </div>
                    <Table
                        columns={[{ title: 'Dashboard', dataIndex: 'name', key: 'name', 
                                        render: ( text, record ) => <a onClick={() => { 
                                        dashboard.update_config(configs.find(({ id }) => id === record.key))
                                        set_choose_dashboard(true)
                                    }}>{text}</a>, 
                                },
                                { title: '删除', dataIndex: '', key: 'delete', render: ({ key }) => <a onClick={() => { handle_delete(key) }}>Delete</a>, },
                                { title: '修改', dataIndex: '', key: 'edit', render: ({ key }) => <a onClick={() => { handle_edit(key) }}>Edit</a>, },
                                { title: '导出', dataIndex: '', key: 'export', render: ({ key }) => <a onClick={() => { handle_export(key) }}>Export</a>, },]}
                                
                        dataSource={configs?.map(({ id, name }) => ({
                            key: id,
                            name
                        }))}
                    />
                </>  : <MainLayout/>
}


function MainLayout () {
    const { widgets, editing, config, widget } = dashboard.use(['widgets', 'editing', 'config', 'widget'])
    
    /** div ref, 用于创建 GridStack  */
    let rdiv = useRef<HTMLDivElement>()
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(dashboard, App.useApp())
    
    
    useEffect(() => {
        (async () => {
            try {
                await dashboard.init(rdiv.current)
            } catch (error) {
                dashboard.show_error({ error })
                throw error
            }
        })()
        return () => { dashboard.dispose() }
    }, [ ])
    
    
    // widget 变化时通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理
    useEffect(() => {
        dashboard.render_widgets()
    }, [widgets])
    
    
    return <div className='dashboard'>
        <div className='dashboard-header'>
            <Header />
        </div>
        <div className='dashboard-main'>
            <Sider visible={editing}/>
            
            {/* 画布区域 (dashboard-canvas) 包含实际的 GridStack 网格和 widgets。每个 widget 都有一个 GraphItem 组件表示，并且每次点击都会更改 dashboard.widget */}
            <div className='dashboard-canvas' onClick={() => { dashboard.set({ widget: null }) }}>
                <div className='grid-stack' ref={rdiv} style={{ backgroundSize: `${100 / dashboard.maxcols}% ${100 / dashboard.maxrows}%` }} >
                    {widgets.map(widget =>
                        <div 
                            className='grid-stack-item'
                            key={widget.id}
                            
                            // 保存 dom 节点，在 widgets 更新时将 ref 给传给 react `<div>` 获取 dom
                            ref={widget.ref as any}
                            
                            gs-id={widget.id}
                            gs-w={widget.w}
                            gs-h={widget.h}
                            gs-x={widget.x}
                            gs-y={widget.y}
                            
                            onClick={ event => {
                                event.stopPropagation()
                                dashboard.set({ widget })
                            }}
                        >
                            <GraphItem widget={widget} />
                        </div>
                    )}
                </div>
            </div>
            
            <SettingsPanel hidden={!editing}/>
        </div>
    </div>
}


