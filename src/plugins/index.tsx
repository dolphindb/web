import './index.sass'

import { useEffect, useState } from 'react'
import { Button, Empty, Form, Input, Modal, Radio, Result, Table, Typography, Upload, type UploadFile } from 'antd'
import { ReloadOutlined, default as Icon, InboxOutlined } from '@ant-design/icons'
import { noop, vercmp } from 'xshell/utils.browser.js'

import { use_modal, type ModalController } from 'react-object-model/hooks.js'
import { join_elements } from 'react-object-model/utils.js'

import { DdbBlob } from 'dolphindb/browser.js'

import { t } from '@i18n/index.js'


import script from './index.dos'
import SvgUpgrade from './upgrade.icon.svg'
import zip_png from './zip.png'

import { required } from '@/utils.ts'
import { model, DdbNodeState, NodeType } from '@/model.js'



const { Text, Link } = Typography


export function Plugins () {
    const [refresher, set_refresher] = useState({ })
    
    const [plugins, set_plugins] = useState<Plugin[]>([ ])
    
    // 待同步的插件
    const [plugin, set_plugin] = useState<Plugin>()
    
    // 搜索内容
    const [query, set_query] = useState('')
    
    let installer = use_modal()
    let syncer = use_modal()
    
    
    // local
    // if (plugins.length)
    //     plugins[0].nodes[0].version = '2.00.10'
    
    
    async function update_plugins () {
        set_plugins(
            await list_plugins(query)
        )
    }
    
    
    useEffect(() => {
        update_plugins()
    }, [refresher, query])
    
    return <>
        <div className='actions'>
            <Button
                className='install'
                type='primary'
                icon={<Icon component={SvgUpgrade} />}
                onClick={installer.open}
            >{t('安装或更新插件')}</Button>
            
            <InstallModal installer={installer} update_plugins={update_plugins} />
            
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
            className='plugins-table'
            dataSource={plugins}
            rowKey='id'
            pagination={false}
            // size='small'
            columns={[
                {
                    title: t('插件 ID'),
                    dataIndex: 'id',
                    width: 160,
                },
                {
                    title: t('集群已安装的最低版本'), 
                    width: 360,
                    render: (_, { least_version }) => {
                        const match = least_version.startsWith(
                            model.version.split('.').slice(0, 3).join('.')  // 去掉 patch 部分
                        )
                        
                        return <Text type={ match ? undefined : 'danger'}>{least_version}{ !match && t(' (与数据库版本不一致，无法加载)') }</Text>
                    }
                },
                {
                    title: t('已安装节点'),
                    render: (_, { nodes, least_version, installables }) => {
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
                                : <Text key={node} className='danger-node' type='danger'>
                                    {node} ({version})
                                </Text>
                        })
                        
                        return <>
                            { installables.length || !all_match
                                ? join_elements(elements, <span>{', '}</span>)
                                : t('全部节点')
                            }
                            { !all_match && <Text type='danger'> ({t('不同节点插件版本不一致，需要同步')})</Text> }
                        </>
                    }
                },
                {
                    title: t('待安装节点'),
                    render: (_, { installables }) =>
                        installables.length > 0 && <>
                            { join_elements([...installables], <span>{', '}</span>) }
                            <Text type='danger'> ({t('需要同步')})</Text>
                        </>
                },
                {
                    title: t('操作'),
                    className: 'actions',
                    render: (_, plugin) => {
                        const { nodes, least_version, installables } = plugin
                        
                        const all_match = nodes.every(({ version }) => version === least_version)
                        
                        return <Button
                            className='sync'
                            type='link'
                            disabled={all_match && !installables.length}
                            onClick={() => {
                                set_plugin(plugin)
                                syncer.open()
                            }}
                        >{t('同步')}</Button>
                    }
                }
            ]}
        />
        
        <SyncModal syncer={syncer} plugin={plugin} update_plugins={update_plugins} />
    </>
}


function InstallModal ({
    installer,
    update_plugins
}: {
    installer: ModalController
    update_plugins: () => Promise<void>
}) {
    let [file, set_file] = useState<UploadFile>()
    let [status, set_status] = useState<'preparing' | 'uploading'>('preparing')
    
    return <Modal
        title={t('安装或更新插件至集群内全部节点')}
        className='plugins-install-modal'
        open={installer.visible}
        onCancel={installer.close}
        okText={t('安装或更新')}
        width='80%'
        onOk={async () => {
            set_status('uploading')
            
            try {
                await define_script()
                
                const { originFileObj } = file
                
                await model.ddb.call('install_plugin', [
                    originFileObj.name,
                    new DdbBlob(
                        await originFileObj.arrayBuffer()
                    )
                ])
                
                await update_plugins()
            } finally {
                set_status('preparing')
            }
            
            installer.close()
        }}
        
        okButtonProps={{
            disabled: !file,
            loading: status === 'uploading'
        }}
    >
        <Upload.Dragger
            showUploadList={false}
            customRequest={noop}
            accept='.zip'
            onChange={({ file }) => {
                set_file(file)
            }}
        >
            <Result
                className='result'
                icon={<InboxOutlined />}
                title={t('拖拽文件到这里，或点击后弹框选择文件')}
            />
        </Upload.Dragger>
        
        <Table<UploadFile>
            className='files' 
            size='middle'
            sticky
            pagination={false}
            
            dataSource={file ? [file] : [ ] as UploadFile[]}
            rowKey='uid'
            
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无文件')} />,  }}
            
            columns={[
                {
                    className: 'fp',
                    key: 'fp',
                    title: t('待上传文件'),
                    render: (_, { originFileObj: { name: fp } }) => <>
                        <img className='zip-icon' src={zip_png} />
                        <span className='text'>{fp}</span>
                    </>
                },
                {
                    className: 'size',
                    key: 'size',
                    title: t('大小'),
                    align: 'right',
                    width: 130,
                    render: (_, { size }) => size.to_fsize_str()
                },
                {
                    className: 'actions',
                    key: 'actions',
                    title: t('操作'),
                    width: 80,
                    render: () =>
                        status === 'preparing' && <Link onClick={() => {
                            set_file(null)
                        }}>{t('删除')}</Link>
                }
            ]}
        />
    </Modal>
}


function SyncModal ({
    syncer,
    plugin,
    update_plugins
}: {
    syncer: ModalController
    plugin: Plugin
    update_plugins: () => Promise<void>
}) {
    interface Fields {
        src: string
    }
    
    let [form] = Form.useForm<Fields>()
    
    let [status, set_status] = useState<'preparing' | 'syncing'>('preparing')
    
    if (!plugin)
        return null
    
    const sorted_nodes = plugin.nodes.toSorted(
        (l, r) => -vercmp(l.version, r.version, true))
    
    return <Modal
        title={t('同步插件至集群内其他节点')}
        className='plugins-sync-modal'
        open={syncer.visible}
        onCancel={syncer.close}
        okText={t('同步')}
        width='80%'
        onOk={async () => {
            const { src } = await form.validateFields()
            
            set_status('syncing')
            
            try {
                await define_script()
                
                await model.ddb.invoke('sync_plugin', [plugin.id, src])
                
                await update_plugins()
            } finally {
                set_status('preparing')
            }
            
            syncer.close()
        }}
        okButtonProps={{
            loading: status === 'syncing'
        }}
    >
        <Form<Fields>
            className='sync-form'
            name='sync'
            form={form}
            initialValues={{
                // 版本最大的节点
                src: sorted_nodes[0].node
            }}
        >
            <Form.Item<Fields> name='src' label={t('插件来源节点')} {...required}>
                <Radio.Group options={sorted_nodes.map(({ node, version }) => ({
                    label: `${node} (${version})`,
                    value: node
                }))} />
            </Form.Item>
        </Form>
    </Modal>
}


interface Plugin {
    id: string
    least_version: string
    nodes: { node: string, version: string }[]
    
    /** 计算出的集群中剩余的可安装节点 */
    installables: string[]
}


let script_defined = false

async function define_script () {
    if (!script_defined) {
        await model.ddb.execute(script)
        script_defined = true
    }
}


async function list_plugins (query = '') {
    await define_script()
    
    const all_nodes = model.nodes.filter(({ mode, state, isLeader }) => 
        mode !== NodeType.agent && 
        state === DdbNodeState.online && 
        (mode !== NodeType.controller || mode === NodeType.controller && isLeader)  // 仅 leader 节点能安装
    ).map(({ name }) => name)
    
    let plugins = (await model.ddb.invoke<Plugin[]>('list_plugins'))
        .map(plugin => {
            const installeds = new Set(
                plugin.nodes.map(({ node }) => node))
            
            return {
                ...plugin,
                installables: all_nodes.filter(node => !installeds.has(node))
            }
        })
    
    if (query)
        plugins = plugins
            .filter(({ id, least_version, nodes }) => 
                id.includes(query) || 
                least_version.includes(query) || 
                nodes.map(({ node }) => node)
                    .find(node => node.includes(query))
            )
    
    console.log(t('插件:'), plugins)
    
    return plugins
}
