import './index.sass'

import { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Radio, Result, Table, Typography, Upload, type UploadFile, type FormInstance, Checkbox } from 'antd'
import { ReloadOutlined, default as Icon, InboxOutlined, CheckOutlined } from '@ant-design/icons'
import { noop } from 'xshell/prototype.browser.js'
import { delay, log, vercmp } from 'xshell/utils.browser.js'

import { use_modal, use_rerender, type ModalController } from 'react-object-model/hooks.js'

import { DdbBlob, type DdbTableData } from 'dolphindb/browser.js'

import { t } from '@i18n/index.ts'
import { required, switch_keys } from '@/utils.ts'
import { model } from '@/model.ts'


import script from './index.dos'
import SvgUpgrade from './upgrade.icon.svg'
import zip_png from './zip.png'


const { Text, Link } = Typography


export function Plugins () {
    const [plugins, set_plugins] = useState<Plugin[]>([ ])
    const [plugin_nodes, set_plugin_nodes] = useState<PluginNode[]>([ ])
    
    let installer = use_modal()
    
    
    async function update_plugins (query?: string) {
        set_plugins(
            await get_plugins(query))
    }
    
    async function update_plugin_nodes () {
        set_plugin_nodes(
            await get_plugin_nodes())
    }
    
    async function update () {
        if (!script_defined) {
            await model.ddb.execute(script)
            script_defined = true
        }
        
        await Promise.all([
            update_plugins(),
            update_plugin_nodes()
        ])
    }
    
    function update_selecteds (plugin: Plugin, selecteds: Plugin['selecteds']) {
        plugin.selecteds = selecteds
        set_plugins([...plugins])
    }
    
    
    useEffect(() => {
        version_without_patch ??= model.version.split('.').slice(0, 2).join('.')
        
        update()
    }, [ ])
    
    
    // 计算 selected_keys 和 indeterminate 状态
    let selected_keys: string[] = [ ]
    
    // 是否有选中的 plugin_node
    let has_selected = false
    
    plugins.forEach(plugin => {
        const { selecteds, id } = plugin
        
        const nselecteds = selecteds?.length || 0
        const nall = get_plugin_nodes_by_id(id, plugin_nodes).length
        
        if (nselecteds && nselecteds === nall)
            selected_keys.push(id)
        
        if (nselecteds)
            has_selected = true
        
        plugin.indeterminate = 0 < nselecteds && nselecteds < nall
    })
    
    return <>
        <div className='actions'>
            <Popconfirm
                title={t('加载插件')}
                description={t('确认加载插件至所选择的节点？（当前已加载的节点会被跳过）')}
                okText={t('加载')}
                onConfirm={async () => {
                    await Promise.all(
                        plugins.map(async ({ selecteds, id }) => 
                            selecteds?.length && load_plugin(id, selecteds.map(({ node }) => node))))
                    
                    await update()
                    
                    model.message.success(t('插件加载成功'))
                }}
            >
                <Button
                    className='load'
                    type='primary'
                    disabled={!has_selected}
                    icon={<Icon component={SvgUpgrade} />}
                >{t('加载插件')}</Button>
            </Popconfirm>
            
            <Button
                className='install'
                icon={<Icon component={SvgUpgrade} />}
                onClick={installer.open}
            >{t('安装插件')}</Button>
            
            <InstallModal installer={installer} update={update} />
            
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={async () => {
                    await update()
                }}
            >{t('刷新')}</Button>
            
            <Input.Search className='search' placeholder={t('输入关键字后按回车可搜索插件')} onSearch={ value => { throw new Error('todo') }} />
        </div>
        
        <Table
            className='plugins-table'
            dataSource={plugins}
            rowKey='id'
            pagination={false}
            rowSelection={{
                selectedRowKeys: selected_keys,
                
                onChange (keys, plugins_, { type }) {
                    // 单独处理全选
                    if (type === 'all') {
                        // 根据当前是否已经全选来切换
                        if (selected_keys.length === plugins.length)  // 已全选
                            plugins.forEach(plugin => {
                                plugin.selecteds = [ ]
                            })
                        else  // 未全选
                            plugins.forEach(plugin => {
                                plugin.selecteds = get_plugin_nodes_by_id(plugin.id, plugin_nodes)
                            })
                        
                        set_plugins([...plugins])
                    }
                },
                
                onSelect (plugin) {
                    const { selecteds, id, indeterminate } = plugin
                    
                    const nselecteds = selecteds?.length || 0
                    
                    update_selecteds(
                        plugin,
                        !nselecteds || indeterminate
                            // 未选 | 半选 -> 全选
                            ? get_plugin_nodes_by_id(id, plugin_nodes)
                            : [ ])
                },
                
                getCheckboxProps: ({ indeterminate }) => ({ indeterminate }),
            }}
            columns={[
                {
                    title: t('插件 ID'),
                    dataIndex: 'id',
                    width: 160,
                },
                {
                    title: t('集群已安装的最低版本'), 
                    width: 500,
                    render: (_, { min_version }) => {
                        const match = min_version.startsWith(version_without_patch)
                        
                        return <Text type={ match ? undefined : 'danger'}>{min_version}{ !match && t(' (与数据库版本不一致，无法加载)') }</Text>
                    }
                },
                {
                    title: t('已安装节点'),
                    width: 500,
                    render: (_, { installeds }) =>
                        installeds.join(', ')
                },
                {
                    title: t('待安装节点'),
                    width: 500,
                    render: (_, { installables }) =>
                        installables.join(', ')
                },
                {
                    title: t('已加载节点'),
                    width: 500,
                    render: (_, { loadeds }) =>
                        loadeds.join(', ')
                },
            ]}
            
            expandable={{
                expandRowByClick: true,
                expandedRowRender: plugin => 
                    <PluginNodesTable
                        id={plugin.id}
                        plugin={plugin}
                        plugin_nodes={plugin_nodes}
                        update_selecteds={update_selecteds} />
            }}
        />
    </>
}


function PluginNodesTable ({
    id,
    plugin,
    plugin_nodes,
    update_selecteds
}: {
    id: string
    plugin: Plugin
    plugin_nodes: PluginNode[]
    update_selecteds: (plugin: Plugin, selecteds: Plugin['selecteds']) => void
}) {
    return <Table
        className='plugin-nodes'
        dataSource={get_plugin_nodes_by_id(id, plugin_nodes)}
        rowKey='node'
        pagination={false}
        size='small'
        onRow={plugin_node => ({
            onClick (event) {
                update_selecteds(
                    plugin, 
                    switch_keys(plugin.selecteds || [ ], plugin_node))
            }
        })}
        rowSelection={{
            selectedRowKeys: plugin.selecteds?.map(({ node }) => node) || [ ],
            
            hideSelectAll: true,
            
            onChange (keys, plugin_nodes, info) {
                update_selecteds(
                    plugin,
                    plugin_nodes)
            }
        }}
        columns={[
            {
                title: t('节点名'),
                dataIndex: 'node'
            },
            {
                title: t('已安装'),
                render: (_, { installed }) => installed ? <CheckOutlined /> : null
            },
            {
                title: t('安装版本'),
                dataIndex: 'installed_version'
            },
            {
                title: t('已加载'),
                render: (_, { loaded }) => loaded ? <CheckOutlined /> : null
            },
            {
                title: t('加载版本'),
                dataIndex: 'loaded_version'
            },
        ]}
    />
}


function InstallModal ({
    installer,
    update
}: {
    installer: ModalController
    update: () => Promise<void>
}) {
    interface Fields {
        method: 'online' | 'offline' | 'sync'
        zip: UploadFile
        nodes: string[]
    }
    
    const rerender = use_rerender()
    
    let [loading, set_loading] = useState(false)
    
    let [installables, set_installables] = useState<string[]>([ ])
    
    useEffect(() => {
        if (installer.visible)
            (async () => {
                const installables = await get_installable_nodes()
                set_installables(installables)
                rform.current.setFieldValue('nodes', installables)
            })()
    }, [installer.visible])
    
    // local
    useEffect(() => {
        (async () => {
            await delay(200)
            installer.open()
        })()
    }, [ ])
    
    let rform = useRef<FormInstance<Fields>>(undefined)
    
    return <Modal
        title={t('安装或更新插件')}
        className='plugins-install-modal'
        open={installer.visible}
        onCancel={installer.close}
        footer={null}
        width='80%'
    >
        <Form<Fields>
            ref={rform}
            initialValues={{
                method: 'online'
            }}
            onFinish={async ({ method, nodes, zip }) => {
                
            }}
        >
            <Form.Item<Fields> name='method' label='安装方式' {...required}>
                <Radio.Group
                    className='methods'
                    optionType='button'
                    buttonStyle='solid'
                    options={[
                        { label: '在线安装', value: 'online' },
                        { label: '离线安装', value: 'offline' },
                        { label: '从某节点同步', value: 'sync' },
                    ]}
                />
            </Form.Item>
            
            <Form.Item<Fields>
                name='nodes'
                label='安装节点'
                {...required}
            >
                <Checkbox.Group options={installables} />
            </Form.Item>
            
            <Form.Item<Fields>
                className='zip-item'
                name='zip'
                label='插件 zip 包'
                getValueProps={file => ({ fileList: file ? [file] : [ ] })}
                getValueFromEvent={({ fileList }) => fileList[0]}
            >
                <Upload.Dragger
                    className='zip-uploader'
                    showUploadList={false}
                    customRequest={noop}
                    maxCount={1}
                    accept='.zip'
                >
                    <Result
                        className='result'
                        icon={<InboxOutlined />}
                        title={t('拖拽文件到这里，或点击后弹框选择文件')}
                    />
                </Upload.Dragger>
            </Form.Item>
            
            <Form.Item<Fields> dependencies={['zip']}>
                {form => {
                    const zip: UploadFile = form.getFieldValue('zip')
                    
                    return <Table<UploadFile>
                        className='files' 
                        size='small'
                        sticky
                        pagination={false}
                        dataSource={zip ? [zip] : [ ]}
                        rowKey='uid'
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
                                    !loading && <Link onClick={() => {
                                        form.setFieldValue('zip', null)
                                        rerender()
                                    }}>{t('删除')}</Link>
                            }
                        ]}
                    />
                }}
            </Form.Item>
            
            <div className='submit-line'>
                <Button className='install-button' type='primary' htmlType='submit' loading={loading}>{t('安装或更新')}</Button>
                <Button disabled={loading} onClick={installer.close}>{t('取消')}</Button>
            </div>
        </Form>
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
    
    // @ts-ignore
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
    
    /** 集群已安装的最低版本 */
    min_version: string
    
    installeds: string[]
    
    installables: string[]
    
    loadeds: string[]
    
    preloadeds: string[]
    
    selecteds?: PluginNode[]
    
    /** 计算属性 */
    indeterminate?: boolean
}


let script_defined = false

let version_without_patch: string


async function get_plugins (query = '') {
    // const all_nodes = model.nodes.filter(({ mode, state, isLeader }) => 
    //     mode !== NodeType.agent && 
    //     state === DdbNodeState.online && 
    //     (mode !== NodeType.controller || mode === NodeType.controller && isLeader)  // 仅 leader 节点能安装
    // ).map(({ name }) => name)
    
    let plugins = (await model.ddb.invoke<DdbTableData>('listPlugins'))
        .data
        .map<Plugin>(({ plugin, minInstalledVersion, installedNodes, toInstallNodes, loadedNodes, preloadedNodes }) => ({
            id: plugin,
            
            min_version: minInstalledVersion,
            
            installeds: str2arr(installedNodes),
            
            installables: str2arr(toInstallNodes),
            
            loadeds: str2arr(loadedNodes),
            
            preloadeds: str2arr(preloadedNodes),
        }))
    
    // if (query)
    //     plugins = plugins
    //         .filter(({ id, min_version, nodes }) => 
    //             id.includes(query) || 
    //             min_version.includes(query) || 
    //             nodes.map(({ node }) => node)
    //                 .find(node => node.includes(query))
    //         )
    
    return log(t('插件列表:'), plugins)
}


interface PluginNode {
    id: string
    
    /** 节点名 */
    node: string
    
    installed: boolean
    
    installed_version: string
    
    loaded: boolean
    
    loaded_version: string
}


async function get_plugin_nodes () {
    return log(
        t('节点插件:'),
        (await model.ddb.invoke<DdbTableData>('listPluginsByNodes'))
            .data
            .map<PluginNode>(({
                plugin,
                node,
                isInstalled,
                installedVersion,
                isLoaded,
                loadedVersion,
            }) => ({
                id: plugin,
                node,
                installed: isInstalled,
                installed_version: installedVersion,
                loaded: isLoaded,
                loaded_version: loadedVersion
            })))
}


async function load_plugin (id: string, nodes: string[]) {
    console.log(t('加载插件:'), id, nodes)
    
    await model.ddb.invoke<void>('loadPlugins', [id, nodes])
}


async function get_installable_nodes () {
    return log(
        t('获取插件可安装节点:'),
        await model.ddb.invoke<string[]>('getInstallableNodes'))
}


function get_plugin_nodes_by_id (id: string, plugin_nodes: PluginNode[]) {
    return plugin_nodes.filter(({ id: _id }) => id === _id)
}


function str2arr (str: string) {
    return str ? str.split(',') : [ ]
}
