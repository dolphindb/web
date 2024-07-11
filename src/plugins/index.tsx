import './index.sass'

import { useEffect, useState } from 'react'
import { Button, Table } from 'antd'

import { model } from '@/model.js'

import script from './index.dos'


export function Plugins () {
    const [plugins, set_plugins] = useState<Plugin[]>([ ])
    
    useEffect(() => {
        (async () => {
            set_plugins(
                await list_plugins()
            )
        })()
    }, [ ])
    
    return <Table
        dataSource={plugins}
        rowKey='id'
        pagination={false}
        columns={[
            {
                title: '插件 ID',
                dataIndex: 'id'
            },
            {
                title: '集群已安装的最低版本', 
                dataIndex: 'least_version'
            },
            {
                title: '已部署节点',
                render: (_, { nodes }) => nodes.map(({ node }) => node).join(', ')
            }
        ]}
    />
}


interface Plugin {
    id: string
    least_version: string
    nodes: { node: string, version: string }[]
}


let script_defined = false

async function list_plugins () {
    if (!script_defined) {
        await model.ddb.execute(script)
        script_defined = true
    }
    
    const plugins = model.ddb.invoke('list_plugins')
    
    console.log('plugins:', plugins)
    
    return plugins
}
