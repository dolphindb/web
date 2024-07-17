import './index.sass'

import { useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Empty, Form, Input, Modal, Radio, Result, Table, Typography, Upload, type UploadFile } from 'antd'
import { ReloadOutlined, default as Icon, InboxOutlined } from '@ant-design/icons'
import { noop, vercmp } from 'xshell/utils.browser.js'

import { use_modal, type ModalController } from 'react-object-model/hooks.js'
import { join_elements } from 'react-object-model/utils.js'

import { DdbBlob, DdbVectorString } from 'dolphindb/browser.js'

import { t } from '@i18n/index.js'

import { DdbNodeState, model, NodeType } from '@/model.js'
import { required } from '@/utils/index.js'

import script from './index.dos'
import SvgUpgrade from './upgrade.icon.svg'
import zip_png from './zip.png'



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
    if (plugins.length)
        plugins[0].nodes[0].version = '2.00.10'
    
    
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
                className='install'
                type='primary'
                icon={<Icon component={SvgUpgrade} />}
                onClick={installer.open}
            >{t('安装或更新插件')}</Button>
            
            <InstallModal installer={installer} />
            
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
                    title: t('插件 ID'),
                    dataIndex: 'id',
                    width: 200,
                },
                {
                    title: t('集群已安装的最低版本'), 
                    width: 400,
                    render: (_, { least_version }) => {
                        const match = least_version.startsWith(
                            model.version.split('.').slice(0, 3).join('.')  // 去掉 patch 部分
                        )
                        
                        return <Text type={ match ? undefined : 'danger'}>{least_version}{ !match && t(' (与数据库版本不一致，无法加载)') }</Text>
                    }
                },
                {
                    title: t('已部署节点'),
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
                },
                {
                    title: t('操作'),
                    className: 'actions',
                    render: (_, plugin) => {
                        const { nodes, least_version } = plugin
                        
                        const all_match = nodes.every(({ version }) => version === least_version)
                        
                        return <Button
                            className='sync'
                            type='link'
                            disabled={all_match || !nodes.length}
                            onClick={() => {
                                set_plugin(plugin)
                                syncer.open()
                            }}
                        >{t('同步')}</Button>
                    }
                }
            ]}
        />
        
        <SyncModal syncer={syncer} plugin={plugin} />
    </>
}


function InstallModal ({ installer }: { installer: ModalController }) {
    let [file, set_file] = useState<UploadFile>()
    let [status, set_status] = useState<'preparing' | 'uploading'>('preparing')
    
    const default_nodes = model.nodes.filter(({ mode }) => mode !== NodeType.agent)
        .map(({ name }) => name)
    
    let rnodes = useRef(default_nodes)
    
    
    return <Modal
        title={t('安装或更新插件')}
        className='plugins-install-modal'
        open={installer.visible}
        onCancel={installer.close}
        okText={t('安装或更新')}
        width='80%'
        onOk={async () => {
            set_status('uploading')
            
            await define_script()
            
            try {
                await model.ddb.call('install_plugin', [
                    new DdbVectorString(rnodes.current),
                    new DdbBlob(await file.originFileObj.arrayBuffer())
                ])
            } finally {
                set_status('preparing')
            }
            
            installer.close()
        }}
        
        okButtonProps={{ disabled: !file }}
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
                title='拖拽文件到这里，或点击后弹框选择文件'
            />
        </Upload.Dragger>
        
        <Table<UploadFile>
            className='files' 
            size='middle'
            sticky
            pagination={false}
            
            dataSource={file ? [file] : [ ] as UploadFile[]}
            rowKey='uid'
            
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无文件' />,  }}
            
            columns={[
                {
                    className: 'fp',
                    key: 'fp',
                    title: '待上传文件',
                    render: (_, { originFileObj: { name: fp } }) => <>
                        <img className='zip-icon' src={zip_png} />
                        <span className='text'>{fp}</span>
                    </>
                },
                {
                    className: 'size',
                    key: 'size',
                    title: '大小',
                    align: 'right',
                    width: 130,
                    render: (_, { size }) => size.to_fsize_str()
                },
                {
                    className: 'actions',
                    key: 'actions',
                    title: '操作',
                    width: 80,
                    render: () =>
                        status === 'preparing' && <Link onClick={() => {
                            set_file(null)
                        }}>删除</Link>
                }
            ]}
        />
        
        <div className='nodes'>
            <span className='title'>{t('部署节点:')}</span>
            
            <Checkbox.Group
                options={default_nodes}
                defaultValue={rnodes.current}
                onChange={nodes => { rnodes.current = nodes }}
            />
        </div>
    </Modal>
}


function SyncModal ({ syncer, plugin }: { syncer: ModalController, plugin: Plugin }) {
    interface Fields {
        src: string
        dsts: string[]
    }
    
    
    let [form] = Form.useForm<Fields>()
    
    const src_name = Form.useWatch(['src'], form)
    
    let [status, set_status] = useState<'preparing' | 'syncing'>('preparing')
    
    if (!plugin)
        return null
    
    const { nodes } = plugin
    
    const sorted_nodes = nodes.toSorted(
        (l, r) => -vercmp(l.version, r.version, true))
    
    const src_node = sorted_nodes[0]
    
    
    const versions = Object.fromEntries(
        nodes.map(({ node, version }) => [node, version]))
    
    
    return <Modal
        title={t('同步插件')}
        className='plugins-sync-modal'
        open={syncer.visible}
        onCancel={syncer.close}
        okText={t('同步')}
        width='80%'
        onOk={async () => {
            const { src, dsts } = await form.validateFields()
            
            set_status('syncing')
            
            try {
                await define_script()
                
                await model.ddb.invoke('sync_plugin', [src, dsts])
            } finally {
                set_status('preparing')
            }
            
            syncer.close()
        }}
        okButtonProps={{
            disabled: !form.getFieldValue('dsts')?.length
        }}
    >
        <Form<Fields>
            className='sync-form'
            name='sync'
            form={form}
            initialValues={{
                // 版本最大的节点
                src: src_node.node,
                
                dsts: nodes.filter(({ version }) => 
                        version !== src_node.version)
                    .map(({ node }) => node)
            }}
        >
            <Form.Item<Fields> name='src' label='插件来源节点' {...required}>
                <Radio.Group options={sorted_nodes.map(({ node, version }) => ({
                    label: `${node} (${version})`,
                    value: node
                }))} />
            </Form.Item>
            
            <Form.Item<Fields> name='dsts' label='部署目标节点' {...required} dependencies={['src']}>
                <Checkbox.Group options={
                    model.nodes.filter(
                        ({ mode, name }) => mode !== NodeType.agent && name !== src_name)
                    .map(({ name, state }) => {
                        const disabled = state === DdbNodeState.offline
                        
                        return {
                            label: disabled 
                                ? `${name} (${t('未启动')})`
                                : `${name} (${versions[name] || t('未安装')})`,
                            value: name,
                            disabled,
                        }
                    })
                } />
            </Form.Item>
        </Form>
    </Modal>
}


interface Plugin {
    id: string
    least_version: string
    nodes: { node: string, version: string }[]
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
