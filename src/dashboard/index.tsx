import './index.sass'

import 'gridstack/dist/gridstack.css'
// 行列数为 1 - 11 时需要
// import 'gridstack/dist/gridstack-extra.css'

import { useEffect } from 'react'
import { Button, Popconfirm, Result } from 'antd'
import * as echarts from 'echarts'

import { Outlet } from 'react-router-dom'

import { t } from '@i18n/index.ts'

import { NodeType, model } from '@/model.ts'


import { Unlogin } from '@/components/Unlogin.tsx'

import { InitedState, dashboard } from './model.ts'

import { Doc } from './components/Doc.js'

import config from './chart.config.json' with { type: 'json' }


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
    const { inited_state } = dashboard.use(['loading', 'inited_state'])
    
    const { node_type, v1, logined } = model.use(['node_type', 'v1', 'logined'])
    
    useEffect(() => {
        (async () => {
            try {
                if (v1)
                    return
                else if (!logined) 
                    dashboard.set({ inited_state: InitedState.unlogined })
                else if (node_type === NodeType.controller)
                    dashboard.set({ inited_state: InitedState.control_node })
                else if ((await model.ddb.call('dashboard_get_version')).value === '1.0.0')
                    dashboard.set({ inited_state: InitedState.inited })
            } catch (error) {
                dashboard.set({ inited_state: InitedState.uninited })
            }
        })()
    }, [logined])
    
    
    useEffect(() => {
        (async () => { 
            if (dashboard.inited_state === InitedState.inited) 
                await dashboard.get_dashboard_configs()
        })()
    }, [inited_state])
    
    const component = {
        [InitedState.hidden]: <></>,
        [InitedState.uninited]: <Init />,
        [InitedState.inited]:
            <Outlet />,
        [InitedState.control_node]: <Result
            status='warning'
            className='interceptor'
            title={t('控制节点不支持数据面板，请跳转到数据节点或计算节点查看。')}
        />,
        [InitedState.unlogined]: <Unlogin info='数据面板' />
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



