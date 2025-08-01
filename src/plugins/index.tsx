import './index.sass'

import { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Radio, Result, Table, Typography, Upload, type UploadFile, 
    type FormInstance, Checkbox, Select, Tooltip } from 'antd'
import type { CheckboxGroupProps } from 'antd/es/checkbox/Group.js'
import { default as Icon, InboxOutlined, CheckOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { select, noop } from 'xshell/prototype.browser.js'
import { delay, log, vercmp } from 'xshell/utils.browser.js'

import { use_modal, use_rerender, type ModalController } from 'react-object-model/hooks.js'

import { DdbVectorChar, DdbVectorString, type DdbTableData } from 'dolphindb/browser.js'

import { language, t } from '@i18n'

import { required, switch_keys } from '@utils'
import { model } from '@model'


import { RefreshButton } from '@/components/RefreshButton/index.tsx'

import { DDBTable } from '@/components/DDBTable/index.tsx'

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
        let plugins = (await ddb.invoke<any[]>('listPlugins'))
            .map<Plugin>(({
                plugin, 
                minInstalledVersion: min_version, 
                maxInstalledVersion: max_version, 
                installedNodes, 
                toInstallNodes, 
                loadedNodes, 
                preloadedNodes
            }) => ({
                id: plugin,
                
                min_version,
                
                version_match: 
                    (min_version as string).startsWith(version_without_fourth) && 
                    (max_version as string).startsWith(version_without_fourth),
                
                installeds: str2arr(installedNodes),
                
                installables: str2arr(toInstallNodes),
                
                loadeds: str2arr(loadedNodes),
                
                preloadeds: str2arr(preloadedNodes),
            }))
            .sort((l, r) => Number(l.version_match) - Number(r.version_match))
        
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
            (await ddb.invoke<any[]>('listPluginsByNodes'))
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
        version_without_fourth ??= model.version.split('.').slice(0, 3).join('.')
        
        update()
    }, [ ])
    
    
    // 计算 selected_keys 和 indeterminate 状态
    let selected_keys: string[] = [ ]
    
    // 是否有选中的 plugin_node
    let has_selected = false
    
    // 是否选中了多种不同的插件
    let npartial_selecteds = 0
    
    plugins.forEach(plugin => {
        const { selecteds, id } = plugin
        
        const nselecteds = selecteds?.length || 0
        const nall = get_plugin_nodes_by_id(id, plugin_nodes).length
        
        if (nselecteds && nselecteds === nall)
            selected_keys.push(id)
        
        if (nselecteds) {
            has_selected = true
            ++npartial_selecteds
        }
        
        plugin.indeterminate = 0 < nselecteds && nselecteds < nall
    })
    
    return <>
        <InstallModal
            installer={installer}
            update={update}
            plugins={plugins}
            plugin_nodes={plugin_nodes} 
        />
        
        <DDBTable
            title={t('插件管理')}
            big_title
            buttons={<>
                <Popconfirm
                    title={t('加载插件')}
                    description={t('确认加载插件至所选择的节点？（当前未安装或已加载的节点会被跳过）')}
                    okText={t('加载')}
                    onConfirm={async () => {
                        await Promise.all(
                            plugins.map(async ({ selecteds, id }) => {
                                if (!selecteds?.length)
                                    return
                                
                                const nodes = selecteds.filter(({ installed }) => installed)
                                    .map(({ node }) => node)
                                
                                if (!nodes.length)
                                    return
                                
                                await ddb.invoke<void>('loadPlugins', log(t('加载插件:'), [id, nodes]))
                            }))
                        
                        await update()
                        
                        model.message.success(t('插件加载成功'))
                    }}
                >
                    <Tooltip title={t('在下方表格中选择需要加载的插件，以及节点（当前未安装或已加载的节点会被跳过）')}>
                        <Button
                            className='load'
                            type='primary'
                            disabled={!has_selected}
                            icon={<PlayCircleOutlined />}
                        >{t('加载插件')}</Button>
                    </Tooltip>
                </Popconfirm>
                
                <Button
                    className='install'
                    icon={<Icon component={SvgUpgrade} />}
                    disabled={npartial_selecteds >= 2}
                    onClick={installer.open}
                >{t('安装插件')}</Button>
                
                <RefreshButton
                    onClick={async () => {
                        await update(rquery.current)
                    }}
                />
            </>}
            filter_form={<Input.Search
                placeholder={t('输入关键字后按回车可搜索插件')}
                allowClear
                onSearch={async value => {
                    rquery.current = value
                    await update(value)
                }} 
            />}
            dataSource={plugins}
            rowKey='id'
            pagination={false}
            scroll={{ y: 'calc(100vh - 220px)' }}
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
                    title: t('插件名'),
                    dataIndex: 'id',
                    width: 160,
                },
                {
                    title: t('集群已安装的最低版本'), 
                    width: 350,
                    render: (_, { min_version, version_match }) =>
                        version_match
                            ? min_version
                            : <Text type='danger'>{min_version} {t(' (部分节点与数据库版本不一致，无法加载)')}</Text>
                },
                {
                    title: t('已安装节点'),
                    width: 350,
                    render: (_, { installeds }) =>
                        installeds.join(', ')
                },
                {
                    title: t('待安装节点'),
                    width: 350,
                    render: (_, { installables }) =>
                        installables.join(', ')
                },
                {
                    title: t('已加载节点'),
                    width: 350,
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
    plugins,
    plugin_nodes
}: {
    installer: ModalController
    update: () => Promise<void>
    plugins: Plugin[]
    plugin_nodes: PluginNode[]
}) {
    let { ddb } = model
    
    const rerender = use_rerender()
    
    let [loading, set_loading] = useState(false)
    
    let [installables, set_installables] = useState<string[]>([ ])
    
    let [remote_plugins, set_remote_plugins] = useState<string[] | undefined>()
    
    useEffect(() => {
        if (installer.visible)
            (async () => {
                const installables = log(
                    t('获取插件可安装节点:'),
                    await ddb.invoke<string[]>('getInstallableNodes'))
                
                set_installables(installables)
                
                const { current: form } = rform
                
                let nodes = installables
                for (const { id, selecteds } of plugins)
                    if (selecteds?.length) {
                        nodes = selecteds.map(({ node }) => node)
                        form.setFieldValue('id', id)
                        break
                    }
                
                form.setFieldValue('nodes', nodes)
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
        className={`plugins-install-modal ${language}`}
        open={installer.visible}
        onCancel={installer.close}
        footer={null}
        width={1200}
    >
        <Form<InstallFields>
            ref={rform}
            initialValues={{
                method: 'offline',
            } satisfies Partial<InstallFields>}
            
            // 切到在线安装时初始化 remote plugins
            // 修改插件服务器时更新 remote plugins
            onValuesChange={async (changeds: Partial<InstallFields>) => {
                if (changeds.method === 'online' && (!remote_plugins || ('server' in changeds))) {
                    const server: InstallFields['server'] = rform.current.getFieldValue('server')
                    
                    set_remote_plugins(log(t('查询在线插件列表:'),
                        (await ddb.invoke<{ PluginName: string, PluginVersion: string }[]>(
                            'listRemotePlugins', 
                            server ? [undefined, server] : undefined
                        ))
                            .select('PluginName')
                    ))
                }
            }}
            
            onFinish={async ({ method, id, nodes, zip, server, source, version }) => {
                console.log(t('安装插件:'), method, id, nodes)
                
                set_loading(true)
                
                try {
                    switch (method) {
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
                        
                        case 'online':
                            await ddb.invoke('installPluginOnline', [id, version, server, nodes])
                            break
                        
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
            <Form.Item<InstallFields> name='method' label={t('安装方式')} {...required}>
                <Radio.Group
                    className='methods'
                    optionType='button'
                    buttonStyle='solid'
                    options={[
                        { label: t('离线安装'), value: 'offline' },
                        { label: t('在线安装'), value: 'online' },
                        { label: t('从某节点同步'), value: 'sync' },
                    ]}
                />
            </Form.Item>
            
            <Form.Item<InstallFields> noStyle dependencies={['method']}>
                { form => {
                    const method: InstallFields['method'] = form.getFieldValue('method')
                    
                    if (method === 'offline')
                        return null
                    
                    return <Form.Item<InstallFields> name='id' label={t('插件名')} {...required}>
                        <Select
                            showSearch
                            allowClear
                            className='select-plugin-id'
                            placeholder={t('如: zip')}
                            options={
                                method === 'sync'
                                    ? plugins.map(({ id }) => ({ label: id, value: id }))
                                    : remote_plugins?.map(id => ({ label: id, value: id })) || [ ]
                                } />
                    </Form.Item>
                }}
            </Form.Item>
            
            <Form.Item<InstallFields> name='nodes' label={t('目标节点')} {...required}>
                <CheckboxGroupWithSelectAll options={installables} />
            </Form.Item>
            
            <Form.Item<InstallFields> noStyle dependencies={['method', 'id']}>{
                form => {
                    switch (form.getFieldValue('method') as InstallFields['method']) {
                        case 'offline':
                            return <>
                                <Form.Item<InstallFields>
                                    className='zip-item'
                                    name='zip'
                                    label={t('插件 zip 包')}
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
                        
                        case 'online':
                            return <>
                                <Form.Item<InstallFields> name='version' label={t('插件版本')}>
                                    <Input className='form-input' placeholder={t('选填，默认安装和当前版本匹配的最新版')} />
                                </Form.Item>
                                
                                <Form.Item<InstallFields> name='server' label={t('插件服务器地址')}>
                                    <Select
                                        className='select-plugin-server'
                                        placeholder={t('选填，参考 installPlugin 函数')}
                                        allowClear
                                        options={[
                                            'http://plugins.dolphindb.cn/plugins',
                                            'http://plugins.dolphindb.com/plugins'
                                        ].map(x => ({ label: x, value: x }))}
                                    />
                                </Form.Item>
                            </>
                        
                        case 'sync': {
                            const id: InstallFields['id'] = form.getFieldValue('id')
                            
                            return <Form.Item<InstallFields> name='source' label={t('源节点')} {...required}>
                                <Radio.Group options={id 
                                    ? get_plugin_nodes_by_id(id, plugin_nodes)
                                        .filter(({ installed }) => installed)
                                        .sort(({ installed_version: l }, { installed_version: r }) => -vercmp(l, r, true))
                                        .map(({ node, installed_version }) => ({
                                            label: `${node}  (v${installed_version})`,
                                            value: node
                                        }))
                                    : [ ]} />
                            </Form.Item>
                        }
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


function CheckboxGroupWithSelectAll ({
    value,
    onChange,
    options
}: Pick<CheckboxGroupProps, 'value' | 'onChange' | 'options'>) {
    return <>
        <Checkbox
            className='select-all'
            indeterminate={value?.length > 0 && value.length < options.length}
            checked={value?.length === options.length}
            onChange={() => {
                onChange(
                    !value?.length || value.length < options.length
                        ? options
                        : [ ]
                )
            }}
        >
          {t('全选', { context: 'button' })}
        </Checkbox>
        
        <Checkbox.Group options={options} value={value} onChange={onChange} />
    </>
}


interface Plugin {
    id: string
    
    /** 集群已安装的最低版本 */
    min_version: string
    
    /** 根据 min_version 计算出的属性 */
    version_match: boolean
    
    installeds: string[]
    
    installables: string[]
    
    loadeds: string[]
    
    preloadeds: string[]
    
    selecteds?: PluginNode[]
    
    /** 计算属性 */
    indeterminate?: boolean
}


let script_defined = false

let version_without_fourth: string


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
