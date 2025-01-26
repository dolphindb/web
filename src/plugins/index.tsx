import './index.sass'

import { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Radio, Result, Table, Typography, Upload, type UploadFile, type FormInstance, Checkbox } from 'antd'
import { ReloadOutlined, default as Icon, InboxOutlined, CheckOutlined } from '@ant-design/icons'
import { noop } from 'xshell/prototype.browser.js'
import { log } from 'xshell/utils.browser.js'

import { use_modal, use_rerender, type ModalController } from 'react-object-model/hooks.js'

import { DdbVectorChar, DdbVectorString, type DdbTableData } from 'dolphindb/browser.js'

import { t } from '@i18n/index.ts'
import { required, switch_keys } from '@/utils.ts'
import { model } from '@/model.ts'


import script from './index.dos'
import SvgUpgrade from './upgrade.icon.svg'
import zip_png from './zip.png'


const { Text, Link } = Typography


export function Plugins () {
    let { ddb } = model
    
    const [plugins, set_plugins] = useState<Plugin[]>([ ])
    const [plugin_nodes, set_plugin_nodes] = useState<PluginNode[]>([ ])
    
    let rquery = useRef<string>('')
    
    let installer = use_modal()
    
    
    async function update_plugins (query?: string) {
        let plugins = (await ddb.invoke<DdbTableData>('listPlugins'))
            .data
            .map<Plugin>(({ plugin, minInstalledVersion, installedNodes, toInstallNodes, loadedNodes, preloadedNodes }) => ({
                id: plugin,
                
                min_version: minInstalledVersion,
                
                installeds: str2arr(installedNodes),
                
                installables: str2arr(toInstallNodes),
                
                loadeds: str2arr(loadedNodes),
                
                preloadeds: str2arr(preloadedNodes),
            }))
        
        if (query)
            plugins = plugins
                .filter(({ id, min_version }) => 
                    id.includes(query) || 
                    min_version.includes(query))
        
        set_plugins(
            log(t('插件列表:'), plugins))
    }
    
    
    async function update_plugin_nodes () {
        set_plugin_nodes(log(
            t('节点插件:'),
            (await ddb.invoke<DdbTableData>('listPluginsByNodes'))
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
                }))))
    }
    
    async function update (query?: string) {
        if (!script_defined) {
            await ddb.execute(script)
            script_defined = true
        }
        
        await Promise.all([
            update_plugins(query),
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
                            selecteds?.length && ddb.invoke<void>('loadPlugins', log(
                                    t('加载插件:'), 
                                    [
                                        id, 
                                        selecteds.map(({ node }) => node)
                                    ]))
                            
                        ))
                    
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
            
            <InstallModal installer={installer} update={update} id={selected_keys[0]} />
            
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={async () => {
                    await update(rquery.current)
                }}
            >{t('刷新')}</Button>
            
            <Input.Search
                className='search'
                placeholder={t('输入关键字后按回车可搜索插件')}
                allowClear
                onSearch={async value => {
                    rquery.current = value
                    await update(value)
                }} />
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


interface InstallFields {
    method: 'online' | 'offline' | 'sync'
    
    id: string
    
    nodes: string[]
    
    // offline
    zip?: UploadFile
    
    
    // online
    version?: string
    server?: string
    
    // sync
    source?: string
}


function InstallModal ({
    installer,
    update,
    id
}: {
    installer: ModalController
    update: () => Promise<void>
    id?: string
}) {
    let { ddb } = model
    
    const rerender = use_rerender()
    
    let [loading, set_loading] = useState(false)
    
    let [installables, set_installables] = useState<string[]>([ ])
    
    useEffect(() => {
        if (installer.visible)
            (async () => {
                const installables = log(
                    t('获取插件可安装节点:'),
                    await ddb.invoke<string[]>('getInstallableNodes'))
                
                set_installables(installables)
                
                if (id)
                    rform.current.setFieldValue('id', id)
                
                rform.current.setFieldValue('nodes', installables)
            })()
    }, [installer.visible])
    
    // local
    // useEffect(() => {
    //     (async () => {
    //         await delay(200)
    //         installer.open()
    //     })()
    // }, [ ])
    
    let rform = useRef<FormInstance<InstallFields>>(undefined)
    
    return <Modal
        title={t('安装或更新插件')}
        className='plugins-install-modal'
        open={installer.visible}
        onCancel={installer.close}
        footer={null}
        width='80%'
    >
        <Form<InstallFields>
            ref={rform}
            initialValues={{
                method: 'online',
                id
            }}
            onFinish={async ({ method, id, nodes, zip, server, source, version }) => {
                console.log(t('安装插件:'), method, id, nodes)
                
                set_loading(true)
                
                try {
                    switch (method) {
                        case 'online':
                            await ddb.invoke('installPluginOnline', [id, version, server, nodes])
                            break
                            
                        case 'offline': {
                            const { originFileObj: file } = zip
                            
                            await ddb.invoke('installPluginOffline', [
                                file.name, 
                                new DdbVectorChar(
                                    await file.arrayBuffer()),
                                new DdbVectorString(nodes)
                            ])
                            
                            break
                        }
                        
                        case 'sync':
                            await ddb.invoke('syncPlugin', [id, source, nodes])
                            break
                    }
                } finally {
                    set_loading(false)
                }
                
                model.message.success(t('插件 {{plugin}} 安装成功', { plugin: id }))
                
                installer.close()
                
                await update()
            }}
        >
            <Form.Item<InstallFields> name='method' label='安装方式' {...required}>
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
            
            <Form.Item<InstallFields> noStyle dependencies={['method']}>
                { form => form.getFieldValue('method') !== 'offline' && <Form.Item<InstallFields> name='id' label={t('插件 ID')} {...required}>
                    <Input placeholder={t('如: zip')} />
                </Form.Item> }
            </Form.Item>
            
            <Form.Item<InstallFields>
                name='nodes'
                label='目标节点'
                {...required}
            >
                <Checkbox.Group options={installables} />
            </Form.Item>
            
            <Form.Item<InstallFields> noStyle dependencies={['method']}>{
                form => {
                    switch (form.getFieldValue('method') as InstallFields['method']) {
                        case 'online':
                            return <>
                                <Form.Item<InstallFields> name='version' label='插件版本'>
                                    <Input placeholder='选填，默认安装和当前版本匹配的最新版' />
                                </Form.Item>
                                
                                <Form.Item<InstallFields> name='server' label='插件服务器地址'>
                                    <Input placeholder='选填，参考 installPlugin 函数' />
                                </Form.Item>
                            </>
                        
                        case 'offline':
                            return <>
                                <Form.Item<InstallFields>
                                    className='zip-item'
                                    name='zip'
                                    label='插件 zip 包'
                                    getValueProps={file => ({ fileList: file ? [file] : [ ] })}
                                    getValueFromEvent={({ fileList }) => fileList[0]}
                                    {...required}
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
                                
                                <Form.Item<InstallFields> dependencies={['zip']}>
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
                            </>
                        
                        case 'sync':
                            return <Form.Item<InstallFields> name='source' label='源节点' {...required}>
                                <Radio.Group options={installables} />
                            </Form.Item>
                    }
                }
            }</Form.Item>
            
            <div className='submit-line'>
                <Button className='install-button' type='primary' htmlType='submit' loading={loading}>{t('安装或更新')}</Button>
                <Button disabled={loading} onClick={installer.close}>{t('取消')}</Button>
            </div>
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


interface PluginNode {
    id: string
    
    /** 节点名 */
    node: string
    
    installed: boolean
    
    installed_version: string
    
    loaded: boolean
    
    loaded_version: string
}

function get_plugin_nodes_by_id (id: string, plugin_nodes: PluginNode[]) {
    return plugin_nodes.filter(({ id: _id }) => id === _id)
}


function str2arr (str: string) {
    return str ? str.split(',') : [ ]
}
