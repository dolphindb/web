import './index.sass'

import { useEffect, useState } from 'react'
import { Button, Input, Table } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { model } from '@/model.js'

import script from './index.dos'
import { t } from '@i18n/index.js'


export function Plugins () {
    const [refresher, set_refresher] = useState({ })
    
    const [plugins, set_plugins] = useState<Plugin[]>([ ])
    const [query, set_query] = useState('')
    
    
    useEffect(() => {
        (async () => {
            set_plugins(
                await list_plugins(query)
            )
        })()
    }, [refresher, query])
    
    return <>
        <div className='actions'>
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={() => {
                    set_refresher({ })
                }}
            >{t('刷新')}</Button>
            <Input.Search className='search' placeholder={t('输入关键字后按回车可搜索插件')} onSearch={ value => { set_query(value) }} />
        </div>
        
        <Table
            dataSource={plugins}
            rowKey='id'
            pagination={false}
            // size='small'
            columns={[
                {
                    title: '插件 ID',
                    dataIndex: 'id',
                    width: 200,
                },
                {
                    title: '集群已安装的最低版本', 
                    dataIndex: 'least_version',
                    width: 200,
                },
                {
                    title: '已部署节点',
                    render: (_, { nodes }) =>
                        nodes.map(({ node }) => node).join(', ')
                }
            ]}
        />
    </>
}


interface Plugin {
    id: string
    least_version: string
    nodes: { node: string, version: string }[]
}


let script_defined = false

async function list_plugins (query = '') {
    if (!script_defined) {
        await model.ddb.execute(script)
        script_defined = true
    }
    
    const plugins = (await model.ddb.invoke<Plugin[]>('list_plugins'))
        .filter(({ id, least_version, nodes }) => 
            id.includes(query) || 
            least_version.includes(query) || 
            nodes.map(({ node }) => node)
                .find(node => node.includes(query))
        )
    
    console.log('插件:', plugins)
    
    return plugins
}
