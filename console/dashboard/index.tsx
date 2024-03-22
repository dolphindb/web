import './index.sass'

import 'gridstack/dist/gridstack.css'
// 行列数为 1 - 11 时需要
// import 'gridstack/dist/gridstack-extra.css'

import { useEffect, useRef } from 'react'
import { App, Button, ConfigProvider, Popconfirm, Result, Spin, theme } from 'antd'
import * as echarts from 'echarts'

import { DashboardPermission, InitedState, dashboard } from './model.js'
import { Sider } from './Sider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Header } from './Header.js'
import { Overview } from './Overview.js'
import { Doc } from './components/Doc.js'
import config from './chart.config.json' assert { type: 'json' }
import { NodeType, model } from '../model.js'
import { t, language } from '../../i18n/index.js'
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
    const { loading, inited_state } = dashboard.use(['loading', 'inited_state'])
    
    const { node_type, is_v1, logined } = model.use(['node_type', 'is_v1', 'logined'])
    
    useEffect(() => {
        (async () => {
            try {
                if (language !== 'zh' || is_v1)
                    return
                else if (!logined) {
                    model.goto_login()
                    return
                }
                else if (node_type === NodeType.controller)
                    dashboard.set({ inited_state: InitedState.control_node })
                else if ((await model.ddb.call('dashboard_get_version')).value === '1.0.0')
                    dashboard.set({ inited_state: InitedState.inited })
            } catch (error) {
                dashboard.set({ inited_state: InitedState.uninited })
            }
        })()
    }, [ ])
    
    
    useEffect(() => {
        (async () => { 
            if (dashboard.inited_state === InitedState.inited) 
                model.execute(async () => {
                    await dashboard.get_dashboard_configs()
                }, { json_error: true })  
        })()
    }, [inited_state])
    
    const component = {
        [InitedState.hidden]: <></>,
        [InitedState.uninited]: <Init/>,
        [InitedState.inited]: (new URLSearchParams(location.search).has('dashboard') ?
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
                <Overview />),
        [InitedState.control_node]: <Result
                status='warning'
                className='interceptor'
                title={t('控制节点不支持数据面板，请跳转到数据节点或计算节点查看。')}
            />
    }
    
    return component[inited_state]
}


function Init () {
    if (model.node_type === NodeType.computing)
        return <Result
                status='warning'
                className='interceptor'
                title={t('数据面板未初始化，请联系管理员在数据节点完成初始化。')}
            />
    else if (model.admin)
        return <div className='init'>
            <Result
                title={t('请点击下方按钮完成初始化')}
                subTitle={
                    <>
                        <p>{t('初始化操作将新增以下数据库表：')}</p>
                        <p>dfs://dashboardConfigDb/configDtl</p>
                        <p>{t('以及 11 个以 dashboard_ 开头的函数视图（FunctionView）')}</p>
                        <p>
                            {t('提示：初始化后请完善用户相关配置（详见')}
                            <Doc/>
                            ）
                        </p>
                    </>
                }
                extra={
                    <Popconfirm
                        title={t('你确定要初始化数据面板功能吗？')}
                        onConfirm={async () => { 
                            await model.ddb.eval(backend)
                            dashboard.set({ inited_state: InitedState.inited })
                            model.message.success(t('初始化数据面板成功！'))
                        }}
                        okText={t('确定')}
                        cancelText={t('取消')}
                        >
                        <Button type='primary' size='large'>{t('初始化')}</Button>
                    </Popconfirm>
                }
            />
        </div>
    else
        return <Result
                className='interceptor'
                title={t('数据面板功能未初始化，请联系管理员初始化数据面板功能')}
            />
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
        dashboard.init(rdiv.current)
        return () => { dashboard.dispose() }
    }, [ ])
    
    
    useEffect(() => {
        (async () => {
            const dashboard_id = Number(new URLSearchParams(location.search).get('dashboard'))
            if (dashboard_id) 
                try {
                    const config = await dashboard.get_dashboard_config(dashboard_id)
                    dashboard.set({ config })
                    await dashboard.render_with_config(config)
                } catch (error) {
                    dashboard.return_to_overview()
                    model.message.error(t('dashboard 不存在'))
                }    
        })()
    }, [ ])
    
    
    // widget 变化时通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理
    useEffect(() => {
        dashboard.render_widgets()
    }, [widgets])
    
    
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        if (!params.has('preview', '1')) {
            if (config?.permission === DashboardPermission.view) 
                dashboard.on_preview()
            dashboard.set({ save_confirm: true })
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

