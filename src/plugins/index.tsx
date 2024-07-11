import './index.sass'

import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Button, Input, Table, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { model } from '@/model.js'

import script from './index.dos'
import { t } from '@i18n/index.js'


const { Text } = Typography


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
                    width: 400,
                    render: (_, { least_version }) => {
                        const match = least_version.startsWith(
                            model.version.split('.').slice(0, 3).join('.')  // 去掉 patch 部分
                        )
                        
                        return <Text type={ match ? undefined : 'danger'}>{least_version}{ !match && ' (与数据库版本不一致，无法加载)' }</Text>
                    }
                },
                {
                    title: '已部署节点',
                    render: (_, { nodes, least_version }, j) => {
                        let all_match = true
                        
                        const elements = nodes.map(({ node, version }, index) => {
                            // local
                            // if (index === 0 && j % 2 === 0)
                            //     version = '2.00.12.1'
                            
                            const match = version === least_version
                            if (!match)
                                all_match = false
                            
                            return match
                                ? node
                                : <Text key={node} className='danger-node' type={ match ? undefined : 'danger'}>
                                    {node} ({version})
                                </Text>
                        })
                        
                        return <>
                            { join_elements(elements, <span>{', '}</span>) }
                            { !all_match && <Text type='danger'> (不同节点插件版本不一致，需要同步)</Text> }
                        </>
                    }
                }
            ]}
        />
    </>
}


function join_elements (elements: ReactNode[], seperator: ReactElement) {
    const nelements = elements.length
    let results = new Array(nelements * 2 - 1)
    
    for (let i = 0;  i < nelements;  i++) {
        results[i * 2] = elements[i]
        if (i < nelements - 1) {
            const key = i * 2 + 1
            results[key] = { ...seperator, key }
        }
    }
    
    return results
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
