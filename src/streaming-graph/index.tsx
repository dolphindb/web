import 'reactflow/dist/style.css'
import './index.sass'

import { useRoutes } from 'react-router'

import { Result } from 'antd'

import { t } from '@i18n'
import { model, NodeType } from '@model'

import { List } from './List.tsx'
import { Graph } from './Graph.tsx'


export function StreamingGraph () {
    const { node_type } = model.use(['node_type'])
    
    const routes = useRoutes([
        {
            index: true,
            element: <List />,
        },
        {
            path: ':name/',
            element: <Graph />
        }
    ])
    
    if (node_type === NodeType.controller)
        return <Result
            status='warning'
            className='interceptor'
            title={t('控制节点不支持流计算监控，请跳转到数据节点或计算节点查看流计算监控。')}
        />
    
    return routes
}
