import './index.sass'

import 'gridstack/dist/gridstack.css'
// 行列数为 1 - 11 时需要
// import 'gridstack/dist/gridstack-extra.css'

import { useEffect, useRef, useState } from 'react'
import { App, Button, ConfigProvider, Popconfirm, Result, Spin, theme } from 'antd'
import * as echarts from 'echarts'
import { DdbVectorString } from 'dolphindb/browser'

import { DashboardPermission, dashboard } from './model.js'
import { Sider } from './Sider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Header } from './Header.js'
import { Overview } from './Overview.js'
import config from './chart.config.json' assert { type: 'json' }
import { NodeType, model } from '../model.js'
import { t } from '../../i18n/index.js'
import { paste_widget } from './utils.js'

import backend from './backend.dos'


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
    const { loading } = dashboard.use(['loading'])
    
    const { node_type } = model.use(['node_type'])
    
    const [inited_state, set_inited_state] = useState(0)  // 0表示未查询到结果，1表示没有初始化，2表示已经初始化 
    
    const [is_admin, set_is_admin] = useState(false)
    
    if (node_type === NodeType.controller)
        return <Result
            status='warning'
            className='interceptor'
            title={t('控制节点不支持数据面板，请跳转到数据节点或计算节点查看。')}
        />
        
    useEffect(() => {
        (async () => {
            try {
                const version = (await model.ddb.call('dashboard_get_version')).value
                if (version === '1.0.0')
                    set_inited_state(2) 
            } catch (error) {
                set_is_admin((await model.ddb.call('getUserAccess', [new DdbVectorString([model.username])])).value[2].value[0])
                set_inited_state(1)
            }
        })()
    }, [ ])
    
    const component = {
        0: <></>,
        1: <Init is_admin={is_admin} set_inited_state={set_inited_state}/>,
        2: (new URLSearchParams(location.search).has('dashboard') ?
                <ConfigProvider
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
                        <Spin spinning={loading} delay={500} size='large'>
                            <DashboardInstance />
                        </Spin>
                    </App>
                </ConfigProvider>
            :
                <Overview />)
    }
    
    return component[inited_state]
}


function Init ({ is_admin, set_inited_state }: { is_admin: boolean, set_inited_state }) {
    return <div className='init'>
        {is_admin
        ? <Result
            title={t('数据面板功能未初始化，可点击下方按钮初始化数据面板功能。')}
            subTitle={
                <>
                    <p>{t('初始化操作将新增以下数据库表：')}</p>
                    <p>dfs://dashboardUserDb</p>
                    <p>{t('以及 7 个以 dashboard_ 开头的函数视图（FunctionView）。')}</p>
                </>
            }
            extra={
                <Popconfirm
                    title={t('你确定要初始化数据面板功能吗？')}
                    onConfirm={async () => { 
                        try {
                            await model.ddb.eval(backend)
                            set_inited_state(2)
                        } catch (error) {
                            model.show_error(error)
                        } 
                    }}
                    okText={t('确定')}
                    cancelText={t('取消')}
                    >
                    <Button type='primary' size='large'>{t('初始化')}</Button>
                </Popconfirm>
            }
        />
        : <Result
            title={t('数据面板功能未初始化，请联系管理员初始化数据面板功能。')}
        />}
    </div>
        
}


function DashboardInstance () {
    const { widgets, widget, config, editing } = dashboard.use(['widgets', 'widget', 'config', 'editing'])
    /** div ref, 用于创建 GridStack  */
    let rdiv = useRef<HTMLDivElement>()
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(dashboard, App.useApp())
    
    // 监听 ctrl v事件，复制组件
    useEffect(() => { 
        window.addEventListener('paste', paste_widget)
        return () => { window.removeEventListener('paste', paste_widget) }
    }, [ ])
    
    useEffect(() => {
        dashboard.execute(async () => dashboard.init(rdiv.current), { json_error: true })
        return () => { dashboard.dispose() }
    }, [ ])
    
    
    // widget 变化时通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理
    useEffect(() => {
        dashboard.render_widgets()
    }, [widgets])
    
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        if (config?.permission === DashboardPermission.view && !params.has('preview', '1')) {
            params.append('preview', '1')
            location.search = params.toString()
        }
    }, [config])
    
    
    return <div className='dashboard' >
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
            
            <SettingsPanel hidden={!editing || widget?.type === 'TEXT'}/>
        </div>
    </div>
}

