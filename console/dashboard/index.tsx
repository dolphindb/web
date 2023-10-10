import 'gridstack/dist/gridstack.css'
import 'gridstack/dist/gridstack-extra.css'
import './index.sass'


import { useEffect, useRef, useState } from 'react'

import { App, ConfigProvider, theme, Table, type TableColumnType, Button, Modal, Input, Upload } from 'antd'

import * as echarts from 'echarts'

import { t } from '../../i18n/index.js'
import { model } from '../model.js'
import { type DashBoardConfig, dashboard } from './model.js'
import { genid } from 'xshell/utils.browser.js'

import { Sider } from './Sider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Header } from './Header.js'


import config from './chart.config.json' assert { type: 'json' }
import { CloudUploadOutlined, FileOutlined, ShareAltOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/modal'

echarts.registerTheme('my-theme', config.theme)

interface DashBoardDataType {
    key: React.Key
    name: string
}

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
    
    const { configs, config } = dashboard.use([ 'configs', 'config'])
    
    const [selected_dashboards, set_selected_dashboards] = useState([ ])
    const [current_dashboard, set_current_dashboard] = useState(null)
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    
    const params = new URLSearchParams(location.search)
    
    
    useEffect(() => {
        model.set({ header: !config, sider: !config })
    }, [ config])
    
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
    
    
    async function handle_add () {
        try {
            if (!new_dashboard_name) {
                dashboard.message.error(t('dashboard 名称不允许为空'))
                return 
            }
            
            if (configs?.find(({ name }) => name === new_dashboard_name)) {
                dashboard.message.error(t('名称重复，请重新输入'))
                return 
            }
            
            /** 待接口更新后修改 */
            const new_dashboard = dashboard.generate_new_config(new_dashboard_name)
            dashboard.set({ configs: configs ? [...configs, new_dashboard] : [new_dashboard] }) 
            
            await dashboard.save_configs_to_server()
            
            model.message.success(t('添加成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
        add_close()
    }
    
    
    async function handle_edit () {
        try {
            if (!edit_dashboard_name) {
                dashboard.message.error(t('dashboard 名称不允许为空'))
                return 
            }
            
            if (configs.find(({ id, name }) => id !== current_dashboard.id && name === edit_dashboard_name)) {
                dashboard.message.error(t('名称重复，请重新输入'))
                return
            }
            const index = configs.findIndex(({ id }) => id === current_dashboard.id)
            
            dashboard.set({ configs: configs.toSpliced(index, 1, { ...current_dashboard, name: edit_dashboard_name, }) })
            
            await dashboard.save_configs_to_server()
            model.message.success(t('修改成功'))
            
            edit_close()
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    async function handle_delete (dashboard_id: number) {
        try {
            if (!configs.length) {
                dashboard.message.error(t('当前 dashboard 列表为空'))
                return
            }
            
            dashboard.set({ configs: configs.filter(({ id }) => id !== dashboard_id) })
            
            await dashboard.save_configs_to_server()
            
            model.message.success(t('删除成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    return  !config && !params.has('dashboard') ?
                <div className='dashboard-manage'>  
                    <Modal open={add_visible}
                        maskClosable={false}
                        onCancel={add_close}
                        onOk={handle_add}
                        closeIcon={false}
                        title={t('请输入 dashboard 的名称')}>
                                <Input value={new_dashboard_name}
                                    onChange={event => { set_new_dashboard_name(event.target.value) }}
                                    />
                    </Modal>
                    
                    <Modal open={edit_visible}
                        maskClosable={false}
                        onCancel={edit_close}
                        onOk={handle_edit}
                        closeIcon={false}
                        title={t('请输入新的 dashboard 名称')}>
                        <Input value={edit_dashboard_name} onChange={event => { set_edit_dashboard_name(event.target.value) }}/>
                    </Modal>
                    <Table
                        rowSelection={{
                            onChange: (selectedRowKeys: React.Key[]) => {
                                set_selected_dashboards(selectedRowKeys)
                            }
                        }}
                        columns={[{ title: t('名称'), dataIndex: 'name', key: 'name', width: '70%',
                                        render: ( text, record ) => <a onClick={() => { 
                                                                        const config = configs.find(({ id }) => id === record.key)
                                                                        dashboard.set({ config })
                                                                        // if (config.owned) 
                                                                        //     model.set_query('preview', '1')
                                                                        
                                                                    }}>{text}</a>, 
                                },
                                { title: t('操作'), dataIndex: '', key: 'delete',
                                    render: ({ key }) => 
                                        <div className='action' >
                                            <a  onClick={() => { handle_delete(key) }}>{t('删除')}</a>
                                            <a
                                                onClick={() => {
                                                    let current_row_config = configs.find(({ id }) => id === key)
                                                    set_current_dashboard(current_row_config) 
                                                    edit_open()
                                                    set_edit_dashboard_name(current_row_config?.name) 
                                                }}
                                                >
                                                    {t('修改名称')}
                                            </a>
                                            <a 
                                                onClick={async () => {
                                                    try {
                                                        const config = configs.find(({ id }) => id === key)
                                                        let a = document.createElement('a')
                                                        a.download = `dashboard.${config.id}.json`
                                                        a.href = URL.createObjectURL(
                                                            new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' })
                                                        )
                                                        
                                                            document.body.appendChild(a)
                                                            a.click()
                                                            document.body.removeChild(a)
                                                        } catch (error) {
                                                            model.show_error({ error })
                                                        }
                                                }}>{t('导出')}</a> 
                                        </div>, },]}
                                
                        dataSource={configs?.map(({ id, name }) => ({
                            key: id,
                            name
                        }))}
                        pagination={false}
                        title={() => <div className='title'>
                                        <h2>{t('数据面板')}</h2>
                                        <div className='toolbar'>
                                            <Button icon={<FileOutlined />} onClick={() => { add_open()
                                                                                             set_new_dashboard_name(String(genid()).slice(0, 4)) }}>{t('新增')}</Button>
                                             <Upload
                                                showUploadList={false}
                                                beforeUpload={async file => {
                                                                                dashboard.set(
                                                                                    { configs: [...configs, JSON.parse(await file.text()) as DashBoardConfig] }
                                                                                )
                                                                                try {
                                                                                    await dashboard.save_configs_to_server()
                                                                                } catch (error) {
                                                                                    model.show_error({ error })
                                                                                    throw error    
                                                                                }
                                                                                return false
                                                }}
                                            >
                                                <Button icon={<CloudUploadOutlined />} >{t('导入')}</Button>
                                            </Upload>
                                            <Button icon={<ShareAltOutlined />} >{t('分享')}</Button>
                                        </div>
                                    </div>}
                    />
                </div>
                    : 
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
                        <MainLayout />
                    </App>
                </ConfigProvider>
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


