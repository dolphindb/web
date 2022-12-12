import './cloud.sass'

import { default as React, useEffect, useRef, useState, type FC } from 'react'

import { default as dayjs } from 'dayjs'

import _ from 'lodash'

import { 
    Badge,
    Button, 
    Form, 
    Input, 
    Select, 
    Table, 
    Typography, 
    InputNumber, 
    message, 
    Tooltip, 
    Popconfirm, 
    Descriptions,
    Tabs,
    Layout,
    Modal,
    Switch,
    Divider,
    Checkbox,
    Upload,
    Progress,
    Space,
    Empty,
    Popover,
    Col,
} from 'antd'

import { PageHeader } from '@ant-design/pro-layout'

import { InboxOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { PresetStatusColorType } from 'antd/es/_util/colors.js'
import type { AlignType } from 'rc-table/lib/interface.js'

import { delay } from 'xshell/utils.browser.js'
import { request_json } from 'xshell/net.browser.js'

import { language, t } from '../i18n/index.js'
import {
    model,
    default_queries,
    type ClusterMode,
    type ClusterType,
    type Cluster,
    type ClusterNode,
    type ClusterConfig,
    type ClusterConfigItem,
    type QueryOptions,
} from './model.js'

import icon_add from './add.svg'

const { Column } = Table;
const { Option } = Select
const { Title, Text, Link } = Typography


export function Cloud () {
    const { cluster } = model.use(['cluster'])
    
    if (cluster)
        return <ClusterDetail />
    
    return <Clusters />
}


/** Type of cluster detail field: 'info' or 'config' */
type FieldType = 'info' | 'config' | 'monitor' | 'backup'

function ClusterDetail () {
    const { cluster } = model.use(['cluster'])
    
    const { name } = cluster

    const [field, set_field] = useState<FieldType>('info')

    const fields : FieldType[] = ['info', 'config', 'monitor', 'backup']

    const Content = {
        info: <InfoTab />,
        config: <ClusterConfigs cluster={cluster} />,
        backup: <ShowBackupRestoreSourceKey />
    }
    
    return (
        <div className='cluster'>
            <PageHeader
                className='cluster-header'
                title={
                    <Title level={3}>{name}</Title>
                }
                onBack={() => {
                    model.set({ cluster: null })
                }}
            />
            <Layout>
                <Layout.Sider theme='light' className='sidebar-menu' width={180}>
                    {fields.map(f => (
                        <ClusterDetailMenuItem key={f} focused={field === f} onClick={value => { set_field(value) }} value={f} />
                    ))}
                </Layout.Sider>
                <Layout.Content className='content'>
                    {Content[field]}
                </Layout.Content>
            </Layout>
        </div>
    )
}


function ClusterDetailMenuItem({
    focused,
    onClick,
    value
}: {
    focused: boolean,
    onClick: (value: FieldType) => void,
    value: FieldType
}) {
    const onButtonClick = () => {
        if (value === 'monitor')
            window.open(model.monitor_url, '_blank')
        else
            onClick(value)
    }
    
    let currClass = 'detail-menu-item'
    
    if (focused)
        currClass += ' detail-menu-item-checked'
    
    const displayValue = {
        info: t('基本信息'),
        config: t('配置参数'),
        monitor: t('集群监控'),
        backup: t('备份管理')
    }
    
    return <div className={currClass} onClick={onButtonClick}>
        <span className='font-content-wrapper'>
            {displayValue[value]}
        </span>
    </div>
}


function InfoTab() {
    const { cluster } = model.use(['cluster'])
    
    const { namespace, name, log_mode, version, storage_class_name, services, status, created_at } = cluster
    
    return (
        <>
            <Descriptions
                title={
                    <Title level={4}>{t('信息')}</Title>
                }
                column={2}
                bordered
            >
                <Descriptions.Item label={t('命名空间')}>{namespace}</Descriptions.Item>
                <Descriptions.Item label={t('名称')}>{name}</Descriptions.Item>
                <Descriptions.Item label={t('状态')}>
                    <ClusterStatus {...status}/>
                </Descriptions.Item>
                <Descriptions.Item label={t('版本')}>{version}</Descriptions.Item>
                <Descriptions.Item label={t('模式')}>
                    <Mode cluster={cluster} />
                </Descriptions.Item>
                <Descriptions.Item label={t('日志模式')}>{log_modes[log_mode]}</Descriptions.Item>
                <Descriptions.Item label={t('创建时间')}>{created_at.format('YYYY.MM.DD HH:mm:ss')}</Descriptions.Item>
                <Descriptions.Item label={t('储存类')}>{storage_class_name}</Descriptions.Item>
            </Descriptions>
            
            <Descriptions
                title={
                    <Title level={4}>{t('服务')}</Title>
                }
                column={3}
                bordered
            >
                { services.Controller && <Descriptions.Item label={t('控制节点')}>
                    <ServiceNode {...services.Controller} />
                </Descriptions.Item> }
                { services.Datanode ? 
                    <Descriptions.Item label={t('数据节点')}>
                        <ServiceNode {...services.Datanode} />
                    </Descriptions.Item>
                :
                    <Descriptions.Item label={t('单机节点')}>
                        <ServiceNode {...services.Standalone} />
                    </Descriptions.Item>
                }
                { services.Computenode && <Descriptions.Item label={t('计算节点')}>
                    <ServiceNode {...services.Computenode} />
                </Descriptions.Item> }
            </Descriptions>
            
            <ClusterNodes cluster={cluster} />
        </>
    )
}


function Clusters () {
    const { clusters, versions, namespaces } = model.use(['clusters', 'versions', 'namespaces'])
    
    const [create_panel_visible, set_create_panel_visible] = useState(false)
    
    const [queries, set_queries] = useState<QueryOptions>(default_queries)
    
    
    useEffect(() => {
        let flag = true
        ;(async () => {
            while (true) {
                await delay(5000)
                if (!flag)
                    break
                await model.get_clusters(queries)
            }
        })()
       
        return () => {
            flag = false
        }
    }, [queries])
    
    
    return <div className='clusters'>
        <Title className='title-overview' level={3}>{t('集群管理')}</Title>
        
        <div className='actions'>
            <Button
                type='primary'
                className='button-create'
                onClick={() => {
                    set_create_panel_visible(true)
                }}
            >
                <img className='icon-add' src={icon_add} />
                <span>{t('新建集群')}</span>
            </Button>
            
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={() => {
                    model.get_clusters(queries)
                }}
            >{t('刷新')}</Button>
        </div>
        
        
        <Table
            className='list'
            columns={[
                ... namespaces.length >= 2 ? [{
                    title: t('命名空间'),
                    dataIndex: 'namespace',
                    sorter: { multiple: 2 },
                    defaultSortOrder: 'ascend',
                    sortDirections: ['ascend', 'descend', 'ascend'],
                    filters: namespaces.map(ns => ({
                        text: ns.name,
                        value: ns.name
                    }))
                } as any] : [ ],
                {
                    title: t('名称'),
                    dataIndex: 'name',
                    sorter: { multiple: 1 },
                    defaultSortOrder: 'ascend',
                    sortDirections: ['ascend', 'descend', 'ascend'],
                    filterIcon: <SearchOutlined/>,
                    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) =>
                       <Input
                            autoFocus
                            value={selectedKeys[0]}
                            placeholder={t('输入关键字搜索集群名称')}
                            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                            onPressEnter={() => {
                                confirm()
                            }}
                        />,
                    render: (name, cluster: Cluster) =>
                        <Link
                            onClick={async () => {
                                await model.get_cluster(cluster)
                            }}>{name}</Link>
                },
                {
                    title: t('模式'),
                    key: 'mode',
                    sorter: { multiple: 4 },
                    render: (value, cluster) => <Mode cluster={cluster} />
                },
                {
                    title: t('版本'),
                    dataIndex: 'version',
                    sorter: { multiple: 3 },
                    filters: versions.map(version => {
                        return {
                            text: version,
                            value: version
                        }
                    })
                },
                {
                    title: t('服务'),
                    key: 'services',
                    dataIndex: 'services',
                    render: services =>
                        services.Controller ?
                            <>
                                <ServiceNode type='controller' {...services.Controller} />
                                <ServiceNode type='datanode' {...services.Datanode} />
                                <ServiceNode type='computenode' {...services.Computenode} />
                            </>
                        :
                            <ServiceNode type='standalone' {...services.Standalone} />
                },
                {
                    title: t('状态'),
                    dataIndex: 'status',
                    render: (status: ClusterNode['status']) => 
                        <ClusterStatus {...status} />
                },
                {
                    title: t('操作'),
                    key: 'actions',
                    render (value, cluster) {
                        return <Popconfirm
                            title={t('确认删除集群')}
                            onConfirm={async () => {
                                try {
                                    await model.delete(cluster)
                                    message.success(t('集群删除成功'))
                                    await model.get_clusters(queries)
                                } catch (error) {
                                    message.error(JSON.stringify(error))
                                }
                            }}
                        >
                            <Link>{t('删除')}</Link>
                        </Popconfirm>
                    }
                }
            ]}
            
            dataSource={clusters}
            
            onChange={(pagination, filters, sorters, extra) => {
                let queries = { } as QueryOptions
                let sortField: string[] = []
                let orders: string[] = []
                
                
                if (Array.isArray(sorters)) {
                    sorters.sort((l, r) => 
                        -((l.column.sorter as any).multiple - (r.column.sorter as any).multiple)
                    )
                    
                    for (let i = 0;  i < sorters.length;  i++) {
                        const sorter = sorters[i]
                        const { key, dataIndex } = sorter.column
                        sortField.push((key || dataIndex) as any)
                        orders.push(sort_orders[sorter.order])
                    }
                    
                    queries.sortField = sortField
                    queries.sortBy = orders
                } else if (sorters.column) {
                    const { key, dataIndex } = sorters.column
                    sortField.push((key || dataIndex) as any)
                    orders.push(sort_orders[sorters.order])
                    queries.sortField = sortField
                    queries.sortBy = orders
                }
                
                if (filters.version) 
                    queries.version = filters.version as any
                    
                if (filters.name)
                    queries.name = filters.name as any
                    
                if (filters.namespace)    
                    queries.namespace = filters.namespace as any
                
                queries.pageSize = pagination.pageSize
                queries.pageIndex = pagination.current
                
                console.log('sortField', sortField)
                console.log('version', filters)
                
                set_queries(queries)
                
                model.get_clusters(queries)
            }}
            rowKey='name'
            pagination={{
                defaultPageSize: 50,
                pageSizeOptions: ['5', '10', '20', '50', '100'],
                size: 'small',
                showSizeChanger: true,
                showQuickJumper: true,
            }}
        />
        
        
        <CreateClusterPanel
            visible={create_panel_visible}
            queries={queries}
            closePanel={() => {
                set_create_panel_visible(false)
            }}
        />
    </div>
}


const sort_orders = {
    ascend: 'asc',
    descend: 'desc',
} as const

function CreateClusterPanel({
    visible,
    closePanel,
    queries
}: {
    visible: boolean,
    closePanel: () => void
    queries: QueryOptions
}) {

    const [form] = Form.useForm()

    const { namespaces, storageclasses, versions } = model.use(['namespaces', 'storageclasses', 'versions'])

    const [mode, set_mode] = useState<ClusterMode>('cluster')
    
    const [cluster_type, set_cluster_type] = useState<ClusterType>('multicontroller')

    const onSubmit = async () => {

        let values = await form.validateFields()

        const { mode, cluster_type } = values
        
        values.datanode.data_size = Number(values.datanode.data_size)
        
        if (cluster_type === 'singlecontroller')
            values.controller.replicas = 0
        
        if (mode === 'standalone')
            delete values.controller
        
        
        try {
            await model.create(values)
            message.success(t('集群创建成功'))
            closePanel()
        } catch (error) {
            message.error(t('集群创建失败'))
            throw error
        }
        
        await model.get_clusters(queries)
    }

    const onReset = () => {
        form.resetFields()
    }

    return (
        <Modal 
            className='cloud-create-panel'
            title={t('新建集群配置')}
            visible={visible}
            onOk={closePanel}
            onCancel={closePanel}   
            width={'800px'}
            footer={<>
                    <Button type='primary' htmlType='submit' className='submit' onClick={onSubmit}>{t('提交')}</Button>
                    <Button type='default' htmlType='reset' className='reset' onClick={onReset}>{t('重置')}</Button>
                    <Button
                        className='cancel'
                        type='default'
                        onClick={() => {
                            closePanel()
                        }}
                    >{t('取消')}</Button>
            </>}
        >
            <Form
                form = {form}
                name='cluster-form'
                className='cluster-create-form'
                labelAlign='left'
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 16 }}
                initialValues={{
                    mode,
                    cluster_type,
                    version: versions.length !== 0 ? versions[0] : '',
                    controller: {
                        replicas: 3,
                        data_size: 1,
                        log_size: 1,
                        port: 31210,
                        resources: {
                            cpu: 1,
                            memory: 1,
                        }
                    },
                    datanode: {
                        replicas: 0,
                        data_size: 1,
                        log_size: 1,
                        port: 32210,
                        resources: {
                            cpu: 1,
                            memory: 1,
                        }
                    },
                    computenode: {
                        replicas: 0,
                        data_size: 1,
                        log_size: 1,
                        port: 32210,
                        resources: {
                            cpu: 1,
                            memory: 1,
                        }
                    },
                    namespace: namespaces.length !== 0 ? namespaces[0].name : '',
                    storage_class: storageclasses.length !== 0 ? storageclasses[0].name : '',
                    log_mode: 0,
                    resources: {
                        cpu: 1,
                        memory: 1,
                    }
                }}

                onFieldsChange={(changeds, all) => {
                    if (!changeds[0])
                        return
                    const { name, value } = changeds[0]
                    
                    if (name[0] === 'mode') {
                        set_mode(value)
                        return
                    }
                    
                    if (name[0] === 'cluster_type') {
                        set_cluster_type(value)
                        return
                    }
                }}
                colon={false}
                requiredMark={false}
                validateMessages={{
                    pattern: {
                        mismatch: '${pattern}'
                    }
                }}
            >
                <Divider orientation='left'>{t('基本信息')}</Divider>
                <Form.Item 
                    name='name' 
                    label={t('名称')} 
                    tooltip={t("只能包含小写字母、数字以及'-'，必须以小写字母开头，以小写字母或数字结尾")}
                    rules={[{ 
                            required: true, 
                            pattern: new RegExp('^[a-z]([-a-z0-9]*[a-z0-9])*$'),
                        }]}
                    messageVariables={{
                        pattern: t("集群名称只能包含小写字母、数字以及'-'，必须以小写字母开头，以小写字母或数字结尾")
                    }}
                    validateTrigger='onBlur'
                >
                    <Input />
                </Form.Item>

                <Form.Item name='namespace' label={t('命名空间')}>
                    <Select placeholder='Please select a namespace'>
                        {
                            namespaces.length !== 0 ?
                            namespaces.map(ns => (
                                <Option value={ns.name} key={ns.name}>{ns.name}</Option>
                            ))
                            :
                            <Option value=''>{''}</Option>
                        }
                    </Select>
                </Form.Item>

                <Form.Item name='storage_class' label={t('储存类')}>
                    <Select placeholder='Please select a storage class' >
                        {
                            storageclasses.length !== 0 ?
                            storageclasses.map(sc => (
                                <Option value={sc.name} key={sc.name}>{sc.name}</Option>
                            ))
                            :
                            <Option value=''>{''}</Option>
                        }
                    </Select>
                </Form.Item>
                
                <Form.Item name='mode' label={t('模式')} rules={[{ required: true }]}>
                    <Select>
                        <Option value='standalone'>{t('单机节点')}</Option>
                        <Option value='cluster'>{t('集群')}</Option>
                    </Select>
                </Form.Item>
                
                <Form.Item name='version' label={t('版本')} rules={[{ required: true }]}>
                    <Select>
                        {
                            versions.length !== 0 ?
                            versions.map(v => (
                                <Option value={v} key={v}>{v}</Option>
                            ))
                            :
                            <Option value=''>{''}</Option>
                        }
                    </Select>
                </Form.Item>

                <Form.Item name='log_mode' label={t('日志模式')} rules={[{ required: true }]}>
                    <Select>
                        <Option value={0}>{t('输出到文件')}</Option>
                        <Option value={1}>{t('输出到标准输出')}</Option>
                        <Option value={2}>{t('同时输出到文件和标准输出')}</Option>
                    </Select>
                </Form.Item>
                


                { mode === 'cluster' && <>
                    <Form.Item name='cluster_type' label={t('集群类型')} rules={[{ required: true }]}>
                        <Select>
                            <Option value='singlecontroller'>{t('单控制节点')}</Option>
                            <Option value='multicontroller'>{t('多控制节点')}</Option>
                        </Select>
                    </Form.Item>

                    <Divider orientation='left'>{t('控制节点')}</Divider>
                    
                    { cluster_type === 'multicontroller' && <Form.Item name={['controller', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                        <InputNumber min={3} precision={0} />
                    </Form.Item>}
                    
                    <Form.Item name={['controller', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...'  addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['controller', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                    </Form.Item>
                    
                    <Form.Item name={['controller', 'port']} label={t('端口')} rules={[{ required: true }]}>
                        <InputNumber min={0} />
                    </Form.Item>
                    
                    <Form.Item name={['controller', 'resources', 'cpu']} label='CPU' rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter={t('核')}/>
                    </Form.Item>
                    
                    <Form.Item name={['controller', 'resources', 'memory']} label={t('内存')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi'/>
                    </Form.Item>
                </> }

                <Divider orientation='left'>{t('数据节点')}</Divider>
                
                { mode === 'cluster' && <Form.Item name={['datanode', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                    <InputNumber min={0} precision={0} />
                </Form.Item>}
                
                <Form.Item name={['datanode', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                </Form.Item>

                <Form.Item name={['datanode', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                </Form.Item>
                
                <Form.Item name={['datanode', 'port']} label={t('端口')} rules={[{ required: true }]}>
                    <InputNumber min={0} />
                </Form.Item>
                
                <Form.Item name={['datanode', 'resources', 'cpu']} label='CPU' rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter={t('核')}/>
                </Form.Item>
                
                <Form.Item name={['datanode', 'resources', 'memory']} label={t('内存')} rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi'/>
                </Form.Item>
                
               { mode === 'cluster' && <>
                    <Divider orientation='left'>{t('计算节点')}</Divider>
                    
                    <Form.Item name={['computenode', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                        <InputNumber min={0} precision={0} />
                    </Form.Item>
                    
                    <Form.Item name={['computenode', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...'  addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['computenode', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                    </Form.Item>
                    
                    <Form.Item name={['computenode', 'port']} label={t('端口')} rules={[{ required: true }]}>
                        <InputNumber min={0} />
                    </Form.Item>
                    
                    <Form.Item name={['computenode', 'resources', 'cpu']} label='CPU' rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter={t('核')}/>
                    </Form.Item>
                    
                    <Form.Item name={['computenode', 'resources', 'memory']} label={t('内存')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi'/>
                    </Form.Item>
               </> }
            </Form>
        </Modal>
    )
}

const node_types = {
    controller: '控制节点',
    datanode: '数据节点',
    standalone: '单机节点',
    computenode: '计算节点',
} as const

function ServiceNode ({
    type,
    ip,
    port
}: {
    type?: 'controller' | 'datanode' | 'standalone' | 'computenode'
    ip: string
    port: string
}) {
    const link = `${ip}:${port}`
    return <div className='service-node'>
        {type && <span className='type'>{
            language === 'zh' ?
                node_types[type]
            :
                type
            }: </span>}
        <a className='link' target='_blank' href={`//${link}`}>{link}</a>
    </div>
}

const modes = {
    standalone: t('单机'),
    cluster: t('集群')
} as const

const cluster_types = {
    multicontroller: t('多控制节点'),
    singlecontroller: t('单控制节点')
} as const

function Mode ({
    cluster: { mode, cluster_type }
}: {
    cluster?: Cluster
}) {
    return <>{`${modes[mode]}${ mode === 'standalone' ? '' : ` (${cluster_types[cluster_type]})` }`}</>
}


const statuses: Record<string, PresetStatusColorType> = {
    Available: 'success',
    Running: 'success',
    Progressing: 'processing',
}


function ClusterNodes ({
    cluster
}: {
    cluster: Cluster
}) {
    const [
        {
            controllers,
            datanodes,
            computenodes,
        },
        set_nodes
    ] = useState<{
        controllers: ClusterNode[]
        datanodes: ClusterNode[]
        computenodes: ClusterNode[]
    }>({
        controllers: [ ],
        datanodes: [ ],
        computenodes: [ ]
    })
    
    async function get_nodes () {
        set_nodes(
            await model.get_cluster_nodes(cluster)
        )
    }
    
    useEffect(() => {
        let flag = true
        ;(async () => {
            while (true) {
                await get_nodes()
                await delay(5000)
                if (!flag)
                    break
            }
        })()
        
        return () => {
            flag = false
        }
    }, [cluster])
    
    
    return cluster.mode === 'cluster' ?
        <div className='cluster-nodes'>
            {controllers && 
                <div className='controllers'>
                    <Title level={4}>{t('控制节点')} ({controllers.length})</Title>
                    <NodeList mode='controller' nodes={controllers} cluster={cluster} get_nodes={get_nodes} />
                </div>
            }
            
            {datanodes && 
                <div className='datanodes'>
                    <Title level={4}>{t('数据节点')} ({datanodes.length})</Title>
                    <NodeList mode='datanode' nodes={datanodes} cluster={cluster} get_nodes={get_nodes} />
                </div>
            }
            
            {computenodes && 
                <div className='computenodes'>
                    <Title level={4}>{t('计算节点')} ({computenodes.length})</Title>
                    <NodeList mode='computenode' nodes={computenodes} cluster={cluster} get_nodes={get_nodes} />
                </div>
            }
        </div>
    :
        <div className='datanodes'>
            <Title level={4}>{t('单机节点')}</Title>
            <NodeList mode='datanode' nodes={datanodes} cluster={cluster} get_nodes={get_nodes} />
        </div>
}


function NodeList ({
    cluster,
    mode,
    nodes,
    get_nodes,
}: {
    cluster: Cluster,
    mode: 'controller' | 'datanode' |'computenode'
    nodes: ClusterNode[]
    get_nodes: Function
}) {
    const [cloud_upload_modal_open, set_cloud_upload_modal_open] = useState(false)
    const [cloud_upload_props, set_cloud_upload_props] = useState({ namespace: '', name: '', instance: '' })
    
    return <>
        <CloudUpload {...cloud_upload_props} modal_open={cloud_upload_modal_open} set_modal_open={set_cloud_upload_modal_open}></CloudUpload>
        
        <Table
            className='config-table'
            rowKey={node => `${node.namespace}.${node.name}`}
            dataSource={nodes}
            pagination={false}
            columns={[
                {
                    title: t('名称'),
                    dataIndex: 'name',
                    width: 200
                },
                {
                    title: t('服务'),
                    dataIndex: 'instance_service',
                    render: (instance_service: ClusterNode['instance_service'], node: ClusterNode) =>
                        instance_service ?
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <ServiceNode {...instance_service} />
                                <Popconfirm
                                    title={t('确认删除服务？')}
                                    onConfirm={async () => {
                                        try {
                                            await model.delete_cluster_node_service(cluster, node.name)
                                            message.success(t('服务删除成功'))
                                            await get_nodes()
                                        } catch (error) {
                                            message.error(`${t('服务删除失败')} ${JSON.stringify(error)}`)
                                        }
                                    }}
                                >
                                    <Link>{t('删除')}</Link>
                                </Popconfirm>
                            </div>
                        :
                            <Popconfirm
                                title={t('确认创建服务？')}
                                onConfirm={async () => {
                                    try {
                                        await model.creat_cluster_node_service(cluster, node.name)
                                        message.success(t('服务创建成功'))
                                        await get_nodes()
                                    } catch (error) {
                                        message.error(`${t('服务创建失败')} ${JSON.stringify(error)}`)
                                    }
                                }}
                            >
                                <Link>{t('创建')}</Link>
                            </Popconfirm>
                },
                {
                    title: 'cpu',
                    dataIndex: ['resources', 'limits', 'cpu'],
                    render: (cpu)=>{
                        return <div>{cpu? cpu : '-'}</div>
                    }
                },
                {
                    title: t('内存'),
                    dataIndex: ['resources', 'limits', 'memory'],
                    render: (memory)=>{
                        return <div>{memory? memory : '-'}</div>
                    }
                },
                {
                    title: t('数据储存空间'),
                    dataIndex: 'datasize',
                    render: () => cluster[mode]?.data_size
                },
                {
                    title: t('日志储存空间'),
                    dataIndex: 'logsize',
                    render: () => cluster[mode]?.log_size
                },
                {
                    title: t('创建时间'),
                    dataIndex: 'creation_timestamp',
                    render: (creationTimestamp: ClusterNode['creation_timestamp']) =>
                        dayjs(creationTimestamp).format('YYYY.MM.DD HH:mm:ss')
                },
                {
                    title: t('状态'),
                    dataIndex: 'status',
                    render: (status: ClusterNode['status']) => 
                        <ClusterStatus {...status} />
                },
                {
                    title: t('操作'),
                    width: 300,
                    render (_, node) {
                        return <Space>
                            <Link
                                target='_blank'
                                href={
                                    '?' + new URLSearchParams({
                                        view: 'shell',
                                        namespace: node.namespace,
                                        cluster: cluster.name,
                                        node: node.name
                                    }).toString()
                                }
                            >{t('终端')}</Link>
                            
                            {
                                cluster.mode === 'standalone' || mode === 'controller' ? undefined : node.status.phase === 'Paused' ? (
                                    <Popconfirm
                                        title={t('确认启动？')}
                                        onConfirm={async () => {
                                            try {
                                                await request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/instances/${node.name}/start`, {
                                                    method: 'put'
                                                })
                                                message.success(t('启动成功'))
                                            } catch (error) {
                                                message.error(`${t('启动节点失败')} ${JSON.stringify(error)}`)
                                            }
                                        }}
                                    >
                                        <Link className='restart'>{t('启动')}</Link>
                                    </Popconfirm>
                                ) : (
                                    <Popconfirm
                                        title={t('确认暂停？')}
                                        onConfirm={async () => {
                                            try {
                                                await request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/instances/${node.name}/pause`, {
                                                    method: 'put'
                                                })
                                                message.success(t('暂停成功'))
                                            } catch (error) {
                                                message.error(`${t('暂停节点失败')} ${JSON.stringify(error)}`)
                                            }
                                        }}
                                    >
                                        <Link className='restart'>{t('暂停')}</Link>
                                    </Popconfirm>
                                )
                            }
                            
                            <Popconfirm
                                title={t('确认重启？')}
                                onConfirm={async () => {
                                    try {
                                        await model.restart_node(node)
                                        message.success(t('正在重启节点'))
                                    } catch (error) {
                                        message.error(`${t('重启节点失败')} ${JSON.stringify(error)}`)
                                    }
                                    await delay(2000)
                                    get_nodes()
                                }}
                            >
                                <Link className='restart'>{t('重启')}</Link>
                            </Popconfirm>
                            
                            <Link onClick={
                                () => {
                                    set_cloud_upload_modal_open(true)
                                    set_cloud_upload_props({
                                        namespace: cluster.namespace,
                                        name: cluster.name,
                                        instance: node.name
                                    })
                                }
                            }>{t('上传文件')}</Link>
                        </Space>
                    }
                }
            ]}
        />
    </>
}

const phases = {
    Available: '运行正常',
    Ready: '准备中',
    Progressing: '准备中',
    Unschedulable: '等待调度',
    Unavailable: '故障',
    Unknown: '未知',
    Running: '运行中',
    Paused: '已暂停'
} as const

function ClusterStatus ({
    phase,
    message
}: {
    phase: string
    message?: string
}) {
    phase ||= 'Processing'
    
    return <Badge
        className='badge-status'
        text={
            message ? 
                <Tooltip title={message}>
                    <Text underline>{
                        language === 'zh' ?
                            phases[phase] || phase
                        :
                            phase
                    }</Text>
                </Tooltip>
            :
            
                language === 'zh' ?
                    phases[phase] || phase
                :
                    phase
        }
        status={statuses[phase] || 'default'}
    />
}

/** Type of Configuration: Cluster, Controller, Agent */
type ConfigType = 'cluster' | 'controller' | 'agent' | 'standalone'

function ClusterConfigs ({
    cluster
}: {
    cluster: Cluster
}) {
    const { show_all_config } = model.use(['show_all_config'])

    const [config, setConfig] = useState<ClusterConfig>(cluster.mode === 'cluster' ? {
        cluster_config: [],
        controller_config: [],
        agent_config: []
    } : {
        dolphindb_config: []
    })

    const [editedConfig, setEditedConfig] = useState<ClusterConfig>(cluster.mode === 'cluster' ? {
        cluster_config: [],
        controller_config: [],
        agent_config: []
    } : {
        dolphindb_config: []
    })

    const onConfigChange = (newItem: Partial<ClusterConfigItem> & {name: string}, type: ConfigType) => {
        const name_dict = {
            cluster: 'cluster_config',
            controller: 'controller_config',
            agent: 'agent_config',
            standalone: 'dolphindb_config'
        }
        const field = name_dict[type]

        
        const configArr = config[field]
        const newList = [...configArr]
        const index = newList.findIndex(item => item.name === newItem.name)
        if (index > -1 )  {
            const item = newList[index]
            newList.splice(index, 1, {
                ...item,
                ...newItem,
            })
        }
        const newConfig = {
            [field]: newList
        }
        setConfig({
            ...config,
            ...newConfig
        })


        const edited_list = editedConfig[field]
        const newEditedList = [...edited_list]
        const editedIndex = newEditedList.findIndex(item => item.name === newItem.name)
        if (editedIndex > -1) {
            newEditedList.splice(editedIndex, 1, {
                ...newItem
            })
        } else {
            newEditedList.push(newItem)
        }
        const newEditedConfig = {
            [field]: newEditedList
        }
        setEditedConfig({
            ...editedConfig,
            ...newEditedConfig
        })
    }

    const fetchClusterConfig = async function () {
        const config = await model.get_cluster_config(cluster)
        setConfig(config)
        console.log(`cluster ${cluster.namespace}/${cluster.name} config:`, config)
    }

    const [resetPopVisible, setResetPopVisible] = useState<boolean>(false)
    const [submitPopVisible, setSubmitPopVisible] = useState<boolean>(false)

    const onResetConfirm = () => {
        try {
            fetchClusterConfig()
            message.success(t('参数重置成功'))
        } catch (error) {
            console.error(error);
            message.error(t('参数重置失败'))
        } finally {
            setResetPopVisible(false)
        }
    }

    const onSubmitConfirm = async () => {
        console.log(editedConfig)

        try {
            await model.update_cluster_config(cluster, editedConfig)
            message.success(t('参数修改成功'))
            fetchClusterConfig()
        } catch (err) {
            console.error(err);
            message.error(t('参数修改失败'))
        } finally {
            setSubmitPopVisible(false)
        }
    }

    useEffect(() => {
        fetchClusterConfig()
    }, [cluster])

    return <div className='cluster-config'>
        <Title level={4} className='cluster-config-header'>
            {t('配置')}
            <Checkbox 
                className='show-all-config'
                checked={show_all_config}
                onChange={async ({
                    target: {
                        checked: show_all_config
                    }
                }) => {
                    model.set({ show_all_config })
                    await fetchClusterConfig()
                }}
            >
                {t('显示所有配置')}
            </Checkbox>
        </Title>
        
        {cluster.mode === 'cluster' ?
            <Tabs size='large'>
                <Tabs.TabPane tab={t('集群参数')} key='cluster'>
                    <ConfigEditableList 
                        type='cluster' 
                        configList={config.cluster_config} 
                        editedList={editedConfig.cluster_config} 
                        onConfigChange={onConfigChange} 
                    />
                </Tabs.TabPane>
                <Tabs.TabPane tab={t('控制节点参数')} key='controller'>
                    <ConfigEditableList 
                        type='controller' 
                        configList={config.controller_config} 
                        editedList={editedConfig.controller_config} 
                        onConfigChange={onConfigChange} 
                    />
                </Tabs.TabPane >
            </Tabs>
            :
            <ConfigEditableList 
                type='standalone' 
                configList={config.dolphindb_config} 
                editedList={editedConfig.dolphindb_config}
                onConfigChange={onConfigChange} 
            />
        }
        <div className='cluster-button-block'>
            <Popconfirm
                title={t('确认提交?')}
                visible={submitPopVisible}
                onConfirm={onSubmitConfirm}
                onCancel={() => {setSubmitPopVisible(false)}}
            >
                <Button
                    type='primary'
                    className='cluster-button'
                    onClick={() => {
                        setSubmitPopVisible(true)
                    }}
                >{
                    t('提交参数修改')
                }</Button>
            </Popconfirm>
        </div>

    </div>
}


function ConfigEditableList({
    type,
    configList,
    editedList,
    onConfigChange,
}: {
    type: ConfigType,
    configList: ClusterConfigItem[],
    editedList: ClusterConfigItem[],
    onConfigChange: (config: Partial<ClusterConfigItem> & {name: string}, type: ConfigType) => void,
}) {
    const [form] = Form.useForm()
    const [editingName, setEditingName] = useState('')

    const isEditing = (record: ClusterConfigItem) => record.name === editingName

    const edit = (record: ClusterConfigItem) => {
        if (record.type !== 'bool') 
            form.setFieldsValue({ value: record.value })
         else 
            form.setFieldsValue({ value: record.value === 'true' })
        
        setEditingName(record.name)
    }
    
    const cancel = () => {
        setEditingName('')
    }

    /** 注意：每一次save都把所有类型字段自动转换为string，如需往子组件传值需要重新转换类型 */
    const save = async (name: string) => {
        try {
            const row = (await form.validateFields()) as Partial<ClusterConfigItem>
            const config = {
                name,
                value: String(row.value)
            }
            onConfigChange(config as Partial<ClusterConfigItem> & {name: string}, type)
            setEditingName('')
        } catch (err) {
            console.error('Form Validate Failed:', err)
        }
    }

    const columns = [
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
            width: '25%',
            editable: false
        },
        {
            title: t('当前值'),
            dataIndex: 'value',
            key: 'value',
            width: '10%',
            editable: true,
            align: 'center' as AlignType,
            render: (_: any, record: ClusterConfigItem) => {
                if (record.type === 'string') {
                    return `"${record.value}"`
                } else {
                    return record.value
                }
            }
        },
        {
            title: t('默认值'),
            dataIndex: 'default_value',
            key: 'default value',
            width: '10%',
            editable: false,
            align: 'center' as AlignType,
            render: (_: any, record: ClusterConfigItem) => {
                if (record.type === 'string') {
                    return `"${record.default_value}"`
                } else {
                    return record.default_value
                }
            }
        },
        {
            title: t('类型'),
            dataIndex: 'type',
            key: 'type',
            width: '6%',
            align: 'center' as AlignType,
            editable: false
        }, 
        {
            title: t('描述'),
            dataIndex: language === 'zh' ? 'description_zh' : 'description',
            key: 'description',
            editable: false
        }, {
            title: t('操作'),
            dataIndex: 'actions',
            key: 'actions',
            width: '10%',
            editable: false,
            render: (_: any, record: ClusterConfigItem) => {
                const editable = isEditing(record)
                return editable ? (
                    <span>
                        <Typography.Link onClick={() => save(record.name)} style={{ marginRight: 8 }}>
                        {t('保存更改')}
                        </Typography.Link>
                        <Typography.Link onClick={cancel}>
                        {t('取消')}
                        </Typography.Link>
                    </span>
                ) : (
                    <Typography.Link disabled={editingName !== ''} onClick={() => edit(record)}>
                      {t('编辑参数')}
                    </Typography.Link>
                  )

            }
        }
    ]

    const mergedColumns = columns.map(col => {
        if (!col.editable) {
            return col
        }
        return {
            ...col,
            onCell: (record: ClusterConfigItem) => ({
                record,
                inputType: record.type,
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record)
            })
        }
    })
    
    return (
        <Form
            form={form}
            component={false}
        >
            <Table
                className={type === 'standalone' ? 'standalone-form' : ''}
                rowKey={item => item.name}
                components={{
                    body: {
                        cell: EditableCell,
                    },
                }}
                bordered
                dataSource={configList}
                columns={mergedColumns}
                rowClassName={(record) => {
                    if (editedList.find(val => val.name === record.name))
                        return 'editable-row edited-row' 
                    return 'editable-row'
                }}
                pagination={false}
            />
        </Form>
    )

}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean
    dataIndex: string
    title: any
    inputType: 'bool' | 'string' | 'int' | 'int64' | 'int32' | 'float'
    record: ClusterConfigItem
    index: number
    children: React.ReactNode
}

const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    ...restProps
  }) => {

    return (
      <td {...restProps}>
        {editing ? 
            (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={
                        (inputType === 'int' || inputType === 'int64' || inputType === 'int32' || inputType === 'float') ? 
                        [{
                            required: true,
                            message: t('请输入参数值')
                        }] 
                        : 
                        []}
                    valuePropName={record.type === 'bool' ? 'checked' : 'value'}
                >
                    {
                        inputType === 'int' || inputType === 'int64' || inputType === 'int32' ||  inputType === 'float' ? <InputNumber min={0} /> : 
                        inputType === 'string' ? <Input /> : <Switch checkedChildren='true' unCheckedChildren='false' />
                    }
                </Form.Item>
            )
            : (
          children
        )}
      </td>
    );
};

const log_modes = {
    0: t('输出到文件'),
    1: t('输出到标准输出'),
    2: t('同时输出到文件和标准输出')
} as const


function CloudUpload (props: { namespace, name, instance, modal_open, set_modal_open }) {
    const [progress, set_progress] = useState<{ loaded: number, total: number }>({ loaded: 0.01, total: 1 })
    const [form_instance] = Form.useForm()
    const [error_, set_error_] = useState(false)
    const [loaded_, set_loaded_] = useState(false)
    const [filename, set_filename] = useState(undefined)
    const [show_progress, set_show_progress] = useState(false)
    const [show_text, set_show_text] = useState(false)
    
    useEffect(() => {
        set_show_progress(false)
        set_show_text(false)
    }, [props.modal_open])
    
    
    return (
        <Modal
            open={props.modal_open}
            onCancel={() => {
                props.set_modal_open(false)
            }}
            footer={
                <Button
                    type='primary'
                    onClick={() => { props.set_modal_open(false) }}
                >{t('完成')}</Button>
            }
        >
            <Space direction='vertical' style={{ width: '100%' }} size={'large'}>
                <Title level={4}>{t('上传文件至 {{instance}}', { instance: props.instance })}</Title>
                <Form form={form_instance}>
                    <Form.Item name='to' label={t('文件上传路径')} required colon={false}>
                        <Input placeholder={t('Pod 内路径，如: /data/ddb/server/')}></Input>
                    </Form.Item>
                </Form>
                <Upload.Dragger
                    name='file'
                    customRequest={async option => {
                        set_error_(false)
                        set_loaded_(false)
                        set_filename((option.file as File).name)
                        set_show_progress(false)
                        set_show_text(false)
                        
                        const { namespace, name, instance } = props
                        const { to } = await form_instance.validateFields()
                        if (!to) {
                            message.error(t('上传路径不能为空'))
                            return
                        }
                        const form_data = new FormData()
                        form_data.append('file', option.file)
                        form_data.append('to', to)
                        
                        const xhr = new XMLHttpRequest()
                        
                        xhr.addEventListener('loadstart', eve => {
                            set_show_progress(true)
                        })
                        
                        xhr.upload.addEventListener('progress', eve => {
                            set_progress({ total: eve.total, loaded: eve.loaded })
                            // 考虑文件上传过程中突然断网，中断后progress不会停止，而会迅速将loaded增长至total。所以断网后前端的行为是进度条迅速增长至满条，随后弹出Upload Failed弹窗。此行为有待改进
                        })
                        
                        xhr.addEventListener('loadend', eve => {
                            if (xhr.status === 201) {
                                set_loaded_(true)
                                set_show_text(true)
                                set_show_progress(true)
                                message.success(t('文件上传成功'))
                            } else 
                                message.error(t('文件上传失败'))
                            
                        })
                        
                        xhr.addEventListener('error', eve => {
                            set_error_(true)
                            set_show_text(true)
                            set_show_progress(true)
                            console.log(error_)
                        })
                        
                        xhr.open('POST', `/v1/dolphindbs/${namespace}/${name}/instances/${instance}/upload`)
                        
                        xhr.send(form_data)
                    }}
                    showUploadList={false}
                    beforeUpload={file => {
                        if (file.size / 1024 / 1024 > 100) 
                            message.error(t('文件大小限制 100 MB'))
                        
                        return file.size / 1024 / 1024 <= 100
                    }}
                >
                    <p className='ant-upload-drag-icon'>
                        <InboxOutlined />
                    </p>
                    <p className='ant-upload-text'>{t('点击此处或者拖拽文件到此处')}</p>
                    <p className='ant-upload-hint'>{t('文件大小限制 100 MB')}</p>
                </Upload.Dragger>
                
                <div>
                    {show_progress && !error_ ? (
                        <Progress
                            strokeColor={{
                                '0%': '#108ee9',
                                '100%': '#87d068'
                            }}
                            strokeWidth={3}
                            format={percent => percent && `${parseFloat(percent.toFixed(2))}%`}
                            percent={(progress.loaded / progress.total) * 100}
                        ></Progress>
                    ) : undefined}
                    
                    {error_ ? (
                        <Progress
                            strokeColor={{
                                '0%': '#FF0000',
                                '100%': '#FF0000'
                            }}
                            strokeWidth={3}
                            status='exception'
                            percent={100}
                        ></Progress>
                    ) : undefined}
                    
                    {show_text && loaded_ ? <div>{t('文件 {{filename}} 上传成功', { filename })}</div> : undefined}
                    
                    {show_text && error_ ? <div>{t('文件 {{filename}} 上传失败', { filename })}</div> : undefined}
                </div>
            </Space>
        </Modal>
    )
}


function ShowBackupRestoreSourceKey() {
    const [tag, set_tag] = useState<'backups' | 'restores' | 'source_key'>('backups')
    return <Tabs
        defaultActiveKey="1"
        size='large'
        centered
        destroyInactiveTabPane={true}
        onChange={(key) => {
            switch (key) {
                case '1':
                    set_tag('backups')
                    break;

                case '2':
                    set_tag('restores')
                    break;

                case '3':
                    set_tag('source_key')
            }
        }}


        items={[
            {
                label: translate_dict['backups'],
                key: '1',
                children: <ErrorBoundary>
                    <BackupListOfNamespace tag={tag}></BackupListOfNamespace>
                </ErrorBoundary>
            },
            {
                label: translate_dict['restores'],
                key: '2',
                children: <RestoreListOfNamespace tag={tag}></RestoreListOfNamespace>
            },
            {
                label: t('云端储存配置'),
                key: '3',
                children: <SourceKeyList tag={tag}></SourceKeyList>
            },
        ]}
    />

}

type AddSourceKeyModalInfo = {
    type: 'nfs' | 's3'
    open: boolean
}

function SourceKeyModal(props: { sourcekey_modaol_open, set_sourcekey_modal_open, refresh_source_key }) {

    const [source_key_modal_info, set_source_key_modal_info] = useState<AddSourceKeyModalInfo>({ type: 'nfs', open: props.sourcekey_modaol_open })
    const [providers, set_providers] = useState([''])

    const [nfs_form] = Form.useForm()
    const [s3_form] = Form.useForm()

    const not_required = new Set(['provider', 'endpoint', 'region'])
    const form_object = { 'nfs': nfs_form, 's3': s3_form }
    useEffect(() => {
        (async () => {
            const fetched_providers = (await request_json_with_error_handling('/v1/dolphindbs/backups/providers'))['providers']
            set_providers(fetched_providers)
        })()
    }, [])



    return <Modal

        title={t('添加云端储存配置')}
        open={source_key_modal_info.open}
        onCancel={() => { props.set_sourcekey_modal_open(false) }}
        footer={[
            <Button key="back" onClick={() => { props.set_sourcekey_modal_open(false) }}>
                {t('取消')}
            </Button>,
            <Button key="submit" type="primary" onClick={async () => {
                const form_data = await form_object[source_key_modal_info.type].validateFields()
                try {
                    await request_json_with_error_handling('/v1/dolphindbs/backups/config', {
                        method: 'post',
                        body: { ...form_data, type: source_key_modal_info.type },
                    })
                    props.refresh_source_key()
                    props.set_sourcekey_modal_open(false)
                }
                catch (err) {
                    const resp = await err.response.json()
                    Modal.error(
                        {
                            title: 'Error',
                            content: resp["errorMessage"]
                        }
                    )
                }
            }}>
                {t('提交')}
            </Button>
        ]}
    >
        <Tabs
            onChange={(activeKey) => {
                set_source_key_modal_info(
                    { ...source_key_modal_info, type: (activeKey as 'nfs' | 's3') }
                )
            }}
            centered
            items={[
                {
                    key: 'nfs',
                    label: 'nfs',
                    children:
                        <>
                            <Form
                                name='nfs'
                                form={nfs_form}
                                colon={false}
                                requiredMark={false}
                                className='cluster-create-form'
                                labelAlign='left'
                                labelCol={{ span: 6 }}
                                wrapperCol={{ span: 16 }}
                            >
                                <>
                                    {[
                                        <Form.Item
                                            name='name'
                                            label={translate_dict.name}
                                            tooltip={t("只能包含小写字母、数字以及'-'，必须以小写字母开头，以小写字母或数字结尾")}
                                            rules={[{
                                                required: true, 
                                                pattern: new RegExp('^[a-z]([-a-z0-9]*[a-z0-9])*$'),
                                            }]}
                                            messageVariables={{
                                                pattern: t("集群名称只能包含小写字母、数字以及'-'，必须以小写字母开头，以小写字母或数字结尾")
                                            }}
                                            validateTrigger='onBlur'
                                        >
                                            <Input />
                                        </Form.Item>
                                    ].concat(
                                        ['endpoint', 'path'].map(
                                            x => <Form.Item
                                                name={x}
                                                label={translate_dict[x]}
                                                rules={!not_required.has(x) ? [{ message: t('此项必填'), required: true }] : []}
                                            >
                                                <Input></Input>
                                            </Form.Item>
                                        ))}
                                </>
                            </Form>
                        </>
                },
                {
                    key: 's3',
                    label: 's3',
                    children: <Form
                        name='s3'
                        form={s3_form}
                        colon={false}
                        requiredMark={false}
                        className='cluster-create-form'
                        labelAlign='left'
                        labelCol={{ span: 6 }}
                        wrapperCol={{ span: 16 }}
                    >

                        {[
                            <Form.Item
                                name='name'
                                label={translate_dict.name}
                                tooltip={t("只能包含小写字母、数字以及'-'，必须以小写字母开头，以小写字母或数字结尾")}
                                rules={[{
                                    required: true, 
                                    pattern: new RegExp('^[a-z]([-a-z0-9]*[a-z0-9])*$'),
                                }]}
                                messageVariables={{
                                    pattern: t("集群名称只能包含小写字母、数字以及'-'，必须以小写字母开头，以小写字母或数字结尾")
                                }}
                                validateTrigger='onBlur'
                            >
                                <Input />
                            </Form.Item>
                        ].concat(
                        ['provider', 'region', 'access_key', 'secret_access_key', 'endpoint'].map(
                            (x) => {
                                return !(x === 'provider') ? <Form.Item
                                    name={x}
                                    label={translate_dict[x]}
                                    rules={!not_required.has(x) ? [{ message: t('此项必填'), required: true }] : []}
                                ><Input></Input></Form.Item> :
                                    <Form.Item
                                        name={'provider'}
                                        label={translate_dict['provider']}
                                    >
                                        <Select>
                                            {providers.map((x) => {
                                                return <Option value={x}> {x} </Option>
                                            })}
                                        </Select>
                                    </Form.Item>
                            }
                        ))}
                    </Form>
                }
            ]}
        >
        </Tabs>
    </Modal>
}

const GiProcess = (str: string | number) => {
    if (typeof str === 'number') {
        const temp = str.toString(10)
        return temp.endsWith('Gi') ? temp : temp + 'Gi'
    }
    return str.endsWith('Gi') ? str : str + 'Gi'
}

const DashboardForOneName: FC<{ open: boolean, name: string, onCancel: () => void, type: 'backups' | 'restores' }> = (props) => {
    const { cluster } = model.use(['cluster'])
    const { namespace } = cluster
    const [data, setData] = useState<FlattenBackupDetail | FlattenRestoreDetail>()
    const [source_key_detail, set_source_key_detail] = useState({})

    async function fetch_data() {
        if (!props.name) {
            return
        }
        const _data = await request_json_with_error_handling(`/v1/dolphindbs/${namespace}/${model.cluster.name}/${props.type}/${props.name}`) as OneBakcupDetail
        //create_timestamp不展示,记为undefined
        const data = { ..._data, phase: _data?.status.phase, create_timestamp:undefined } as FlattenBackupDetail
        setData(data)
    }

    useEffect(() => {
        fetch_data();

        (async () => {
            const data = await request_json_with_error_handling(`/v1/dolphindbs/backups/config`) as SourceKeyDetail[]
            set_source_key_detail(data)
        })()
    }, [props.open])

    if (!data) {
        return undefined
    }
    return <Modal open={props.open} width={'70%'} onCancel={props.onCancel} footer={false}>
        <div className='dashboard-for-one-name'>
            <PageHeader
                title={
                    <Title level={3}>{props.name}</Title>
                }
            />

            <div id='BasicInfo'>
                <Descriptions
                    title={
                        <Title level={4}>{t('基础信息')}</Title>
                    }
                    column={3}
                    bordered
                >
                    <Descriptions.Item label={t('命名空间')}>{namespace}</Descriptions.Item>
                    <Descriptions.Item label={t('名称')}>{props.name}</Descriptions.Item>
                    <Descriptions.Item label={t('状态')}>{translate_dict[data.phase]}</Descriptions.Item>
                </Descriptions>
            </div>

            <div id='BackupInfo'>
                <Descriptions
                    title={
                        <Title level={4}>{t('备份信息')}</Title>
                    }
                    bordered
                >
                    <Descriptions.Item label={t('云端储存类型')}>{data.remote_type}</Descriptions.Item>
                    <Descriptions.Item label={t('云端储存配置')}>{
                        <Popover title={data.source_key}
                            mouseEnterDelay={0}
                            mouseLeaveDelay={0}
                            placement={'left'}

                            content={
                                <div>
                                    {
                                        source_key_detail && source_key_detail[data.source_key] ?
                                            (
                                                (!source_key_detail[data.source_key]['access_key']) ?

                                                    <Descriptions bordered
                                                        column={1}
                                                    //layout='vertical'
                                                    >
                                                        <Descriptions.Item
                                                            label={translate_dict['type']}
                                                        >
                                                            {source_key_detail[data.source_key]['type']}
                                                        </Descriptions.Item>

                                                        <Descriptions.Item
                                                            label={translate_dict['endpoint']}
                                                        >
                                                            {source_key_detail[data.source_key]['endpoint']}
                                                        </Descriptions.Item>

                                                        <Descriptions.Item
                                                            label={translate_dict['path']}
                                                        >
                                                            {source_key_detail[data.source_key]['path']}
                                                        </Descriptions.Item>

                                                    </Descriptions>

                                                    :



                                                    <Descriptions bordered
                                                        column={1}
                                                    //layout='vertical'
                                                    >
                                                        <Descriptions.Item
                                                            label={
                                                                translate_dict['type']
                                                            }>
                                                            {source_key_detail[data.source_key]['type']}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item
                                                            label={translate_dict['provider']}
                                                        >
                                                            {source_key_detail[data.source_key]['provider']}
                                                        </Descriptions.Item>

                                                        <Descriptions.Item
                                                            label={translate_dict['region']}
                                                        >
                                                            {source_key_detail[data.source_key]['region']}
                                                        </Descriptions.Item>
                                                        
                                                        <Descriptions.Item
                                                            label={translate_dict['access_key']}
                                                        >
                                                            {source_key_detail[data.source_key]['access_key']}
                                                        </Descriptions.Item>


                                                        <Descriptions.Item
                                                            label={translate_dict['secret_access_key']}
                                                        >
                                                            {source_key_detail[data.source_key]['secret_access_key']}
                                                        </Descriptions.Item>

                                                        <Descriptions.Item
                                                            label={translate_dict['endpoint']}
                                                        >
                                                            {source_key_detail[data.source_key]['endpoint']}
                                                        </Descriptions.Item>


                                                    </Descriptions>

                                            ) :
                                            undefined
                                    }
                                </div>
                            }
                        >{<Link>{data.source_key}</Link>}</Popover>
                    }</Descriptions.Item>
                    {
                        props.type === 'restores' ?
                            <Descriptions.Item label={t('备份源')}>
                                {data.from}
                            </Descriptions.Item> :
                            undefined
                    }
                </Descriptions>
            </div>
            <div id='PathInfo'>
                <Descriptions
                    title={
                        <Title level={4}>{t('路径信息')}</Title>
                    }
                    bordered
                >
                    <Descriptions.Item label={t('储存路径')}>{data.stored_path || ' '}</Descriptions.Item>

                </Descriptions>
            </div>

            {
                data.storage_class_name && data.storage_resource ?
                    <Descriptions
                        title={
                            <Title level={4}>{t('储存信息')}</Title>
                        }
                        column={2}
                        bordered
                    >
                        <Descriptions.Item label={t('储存类名称')}>{data.storage_class_name || ' '}</Descriptions.Item>
                        <Descriptions.Item label={t('储存空间')}>{data.storage_resource ? GiProcess(data.storage_resource) : ' '}</Descriptions.Item>
                    </Descriptions>
                    : undefined
            }

            {
                data.dolphindb_name && data.dolphindb_namespace ?
                    <Descriptions
                        title={
                            <Title level={4}>{t('集群信息')}</Title>
                        }
                        column={2}
                        bordered
                    >
                        <Descriptions.Item label={t('命名空间')}>{data.dolphindb_namespace || ' '}</Descriptions.Item>
                        <Descriptions.Item label={t('名称', { context: 'backup' })}>{data.dolphindb_name || ' '}</Descriptions.Item>
                    </Descriptions>
                    : undefined}


        </div>
    </Modal>
}

const translate_dict = {
    BasicInfo: t('基础信息'),
    ServerInfo: t('服务器信息'),
    namespace: t('命名空间'),
    name: t('名称'),
    remote_type: t('云端储存类型'),
    source_key: t('云端储存配置'),
    prefix: t('桶名'),
    storage_class_name: t('储存类名称'),
    storage_resource: t('储存空间'),
    max_backups: t('最大备份数'),
    pause: t('暂停'),
    host: t('主机'),
    port: t('端口'),
    userId: t('用户名'),
    backups: t('备份'),
    restores: t('还原'),
    endpoint: t('服务地址'),
    provider: t('供应商'),
    region: t('区域'),
    access_key: t('访问密钥'),
    secret_access_key: t('加密密钥'),
    path: t('共享目录', { context: 'backup' }),
    Scheduling: t('调度中'),
    Running: t('运行中'),
    Complete: t('运行完毕'),
    Cleaning: t('清理中'),
    Cleaned: t('清理完成'),
    Failed: t('运行失败'),
    Invalid: t('参数异常'),
    dolphindb_namespace: t('命名空间'),
    dolphindb_name: t('名称'),
    type: t('类型')
}

const BackupListOfNamespace = (props: { tag: 'backups' | 'restores' | 'source_key' }) => {
    const [sourcekey_modal_open, set_sourcekey_modal_open] = useState(false)

    const [fetched_list_of_namesace, set_isntances_list_of_namespace] = useState<ListOfBackups>(undefined)

    const [backup_modal_open, set_backup_modal_open] = useState(false)

    const [form_instance_backup] = Form.useForm()
    const [form_instance_restore] = Form.useForm()

    const [source_keys, set_SourceKeys] = useState<string[]>([])

    const [source_key_detail, set_source_key_detail] = useState<SourceKeyDetail>()

    const [storage_class, set_storage_class] = useState<string[]>([])

    const [refresher, set_refresher] = useState(0)

    const [detail_modal_open, set_detail_modal_open] = useState(false)

    //https://stackoverflow.com/questions/43080547/how-to-override-type-properties-in-typescript
    const [content_of_backup_modal, set_content_of_backup_modal] = useState<Overwrite<OneRestoreDetail, { storage_resource: number }>>()

    const [content_of_restore_modal, set_content_of_restore_modal] = useState<OneRestoreDetail>(undefined)

    const [restore_modal_open, set_restore_modal_open] = useState(false)

    const [name_of_current_opened_detail, set_name_of_current_opened_detail] = useState<string>()

    const { namespaces } = model.use(['namespaces'])

    const [selectable_names, set_selectable_names] = useState<string[]>([])

    const [init_value_of_restore_modal, set_init_value_of_restore_modal] = useState<{ dolphindb_namespace: string, dolphindb_name }>()

    const [selected_remote_type, set_selected_remote_type] = useState<string>()

    const refresh_source_key = async () => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/backups/config`)
        const fetched_source_keys = Object.keys(data)
        set_SourceKeys(fetched_source_keys)
    }

    const refresh_source_key_detail = async () => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/backups/config`)
        set_source_key_detail(data)

    }

    const refresh_selectable_storage_class = async () => {
        const fetched_storage_class = (await request_json_with_error_handling('/v1/storageclasses'))['items'].map(x => x['name'])
        set_storage_class(fetched_storage_class.sort().reverse())
    }

    const refresh_instances_list_of_namespace = async () => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups`) as ListOfBackups
        set_isntances_list_of_namespace(data)
    }

    const refresh_content_of_restore_modal = async (instance_name) => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups/${instance_name}`)
        data['from'] = instance_name
        set_content_of_restore_modal(data)
    }

    const refresh_selectable_names = async (namespace) => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/?namespace=${namespace}`) as { items: { name, namespace }[] }
        set_selectable_names(data.items.map(x => x.name))
    }

    useEffect(
        () => {
            refresh_instances_list_of_namespace()
        }, [refresher]
    )

    useEffect(
        () => {
            form_instance_backup.resetFields()
            form_instance_restore.resetFields()
        }, [
        backup_modal_open, restore_modal_open
    ]
    )


    useEffect(() => {
        refresh_source_key()
        refresh_source_key_detail()
        refresh_selectable_storage_class()
    }, [])

    useEffect(() => {
        if (backup_modal_open) {
            refresh_source_key()
            refresh_source_key_detail()
            refresh_selectable_storage_class()
        } else {
            set_refresher(refresher + 1)
        }

    }, [backup_modal_open])

    useEffect(() => {
        if (source_key_detail)
            return
        refresh_source_key()
        refresh_source_key_detail()
    }, [sourcekey_modal_open])

    useEffect(() => {
        if (!(source_keys && source_key_detail)) {
            return
        }
        try {
            form_instance_backup.setFieldValue('source_key', source_keys[0])
            set_selected_remote_type(source_key_detail[source_keys[0]]['type'])
        } catch (e) {
            console.log(e)
        }

    }, [source_keys, source_key_detail])


    //setInterval无法获取正确的props.tag，参考https://overreacted.io/zh-hans/making-setinterval-declarative-with-react-hooks/
    useInterval(
        () => {
            if (props.tag === 'backups') {
                refresh_instances_list_of_namespace()
            }
            return
        }, 5000
    )


    return <div>

        <div className='actions'>
            <Button
                type='primary'
                className='button-create'
                onClick={async () => {
                    set_backup_modal_open(true)
                    //one_restore_detail中有许多属性，但是此处只用赋值其中三个，其他全为undefined
                    set_content_of_backup_modal({ source_key: source_keys[0], remote_type: 's3', storage_class_name: storage_class.sort().reverse()[0], storage_resource: 10 })
                }}
            >
                <img className='icon-add' src={icon_add} />
                <span>{translate_dict['backups']}</span>
            </Button>

            <Button
                className='refresh'
                icon={<ReloadOutlined />}
                onClick={() => {
                    set_refresher(refresher + 1)
                }}
            >{t('刷新')}</Button>
        </div>

        <div style={{ height: '10px' }}>

        </div>


        {!_.isEmpty(fetched_list_of_namesace) ?
            <Table dataSource={fetched_list_of_namesace.items.map(
                data_item => {
                    return {
                        name: <Link onClick={() => {
                            set_name_of_current_opened_detail(data_item.name)
                            set_detail_modal_open(true)
                        }}>{data_item.name}</Link>,

                        create_timestamp: data_item.create_timestamp,

                        phase: translate_dict[data_item.phase],
                        operation:
                            !(data_item.phase === 'Cleaning') ?
                                [
                                    <Popconfirm
                                        title={t('确认删除？')}
                                        onConfirm={async () => {
                                            await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups/${data_item.name}`, { method: 'delete' })
                                            set_refresher(refresher + 1)
                                        }}
                                        onCancel={() => { }}
                                    >
                                        <a href="#">{t('删除')} </a>
                                    </Popconfirm>,

                                    <Popconfirm
                                        title={t('确认重新触发？')}
                                        onConfirm={async () => {
                                            const data = await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups/${data_item.name}`)

                                            var { source_key, remote_type, prefix, storage_class_name, storage_resource } = data

                                            await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups`,
                                                {
                                                    method: 'post',
                                                    body: {
                                                        name: model.cluster.name,
                                                        namespace: model.cluster.namespace,
                                                        source_key: source_key,
                                                        remote_type: remote_type,
                                                        prefix: prefix,
                                                        storage_class_name: storage_class_name,
                                                        storage_resource: `${GiProcess(storage_resource)}`
                                                    }
                                                }
                                            )


                                        }}
                                        onCancel={() => { }}
                                    >
                                        <a href="#">{t('重新触发')} </a>
                                    </Popconfirm>,

                                    <Link
                                        onClick={
                                            () => {
                                                set_restore_modal_open(true)
                                                set_init_value_of_restore_modal({ dolphindb_namespace: namespaces[0].name, dolphindb_name: undefined })
                                                refresh_selectable_names(namespaces[0].name)
                                                refresh_content_of_restore_modal(data_item.name)
                                            }}
                                    >
                                        {translate_dict['restores'] + ' '}
                                    </Link>,

                                ] :
                                [
                                    <Space>
                                        <a style={{ color: 'gray' }}>{t('删除')}</a>
                                        <a style={{ color: 'gray' }}>{t('重新触发')}</a>
                                        <a style={{ color: 'gray' }}>{t('还原')}</a>
                                    </Space>
                                ]
                    }
                }
            )}
                pagination={false}
            >
                <Column
                    title={t('名称', { context: 'backup' })}
                    key='name'
                    dataIndex={'name'}
                    width='20%'
                />
                <Column
                    title={t('创建时间', { context: 'backup' })}
                    key='create_timestamp'
                    dataIndex={'create_timestamp'}
                />
                {true ? <Column
                    title={t('状态')}
                    key='phase'
                    dataIndex={'phase'}
                /> : undefined}
                <Column
                    title={t('操作', { context: 'backup' })}
                    key='operation'
                    dataIndex={'operation'}
                />
            </Table> :
            <Empty></Empty>
        }
        <Modal
            className='backup-modal'
            open={backup_modal_open}
            title={translate_dict['backups']}
            onCancel={() => { set_backup_modal_open(false) }}
            footer={[
                <Button key="back" onClick={() => { set_backup_modal_open(false) }}>
                    {t('取消')}
                </Button>,
                <Button key="submit" type="primary" onClick={async () => {
                    var { source_key, prefix, storage_class_name, storage_resource } = await form_instance_backup.validateFields()
                    if (!source_key_detail) {
                        //source_key_detail在打开Modal的时候会被set，所以其必有值
                        message.error('SourceKey detail is none. Coder assertion failed')
                        return
                    }
                    const remote_type = source_key_detail[source_key]['type']
                    await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups`,
                        {
                            method: 'post',
                            body: {
                                name: model.cluster.name,
                                namespace: model.cluster.namespace,
                                source_key: source_key,
                                remote_type: remote_type,
                                prefix: prefix,
                                storage_class_name: storage_class_name,
                                storage_resource: `${GiProcess(storage_resource)}`
                            }
                        }
                    )
                    set_backup_modal_open(false)

                }}>
                    {t('提交')}
                </Button>
            ]}
        >
            <Form
                form={form_instance_backup}
                //className='cluster-create-form'
                labelAlign='left'
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 16 }}
                initialValues={{
                    ...content_of_backup_modal
                }}
                requiredMark={false}
                colon={false}
            >
                <>
                    <Form.Item label={translate_dict['source_key']} className={'source_key'} rules={[{ required: true, message: t('此项必填') }]} tooltip={t('储存备份文件的储存系统配置')}>
                        <Space align='start'>
                            <Form.Item
                                name='source_key'
                                rules={[{ required: true, message: t('此项必填') }]}
                            >
                                <Select placeholder="source_key"

                                    onSelect={async (value) => {
                                        // danger area start
                                        try {
                                            var data = (await form_instance_backup.validateFields())
                                        }
                                        catch (e) {
                                            data = e.values
                                        }
                                        set_content_of_backup_modal(data)
                                        //danger area end
                                        //danger area是某些历史代码，原先是为了防止切换form select的时候由于重渲染会丢失其他formItem中已经填入的值。但是现在已经将form.resetValue去掉，原则上danger area部分可以直接移除，但目前还没试验过
                                        if (!source_key_detail) {
                                            message.error('Sourcekey empty. Coder assertion failed.')
                                            return
                                        }
                                        set_selected_remote_type(source_key_detail[value]['type'])
                                    }}
                                    style={{ width: 100 }}
                                >
                                    {
                                        source_keys.map(
                                            x => {
                                                return <Option value={x}>
                                                    <Popover title={x}
                                                        mouseEnterDelay={0}
                                                        mouseLeaveDelay={0}
                                                        placement={'left'}

                                                        content={
                                                            <div>
                                                                {
                                                                    source_key_detail && source_key_detail[x] ?
                                                                        (
                                                                            (!source_key_detail[x]['access_key']) ?

                                                                                <Descriptions bordered
                                                                                    column={1}
                                                                                //layout='vertical'
                                                                                >
                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['type']}>
                                                                                        {source_key_detail[x]['type']}
                                                                                    </Descriptions.Item>
                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['endpoint']}
                                                                                    >
                                                                                        {source_key_detail[x]['endpoint']}
                                                                                    </Descriptions.Item>

                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['path']}
                                                                                    >
                                                                                        {source_key_detail[x]['path']}
                                                                                    </Descriptions.Item>

                                                                                </Descriptions>
                                                                                :
                                                                                <Descriptions bordered
                                                                                    column={1}
                                                                                //layout='vertical'
                                                                                >
                                                                                    <Descriptions.Item label={translate_dict['type']}>
                                                                                        {source_key_detail[x]['type']}
                                                                                    </Descriptions.Item>
                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['provider']}
                                                                                    >
                                                                                        {source_key_detail[x]['provider']}
                                                                                    </Descriptions.Item>
                                                                                    
                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['region']}
                                                                                    >
                                                                                        {source_key_detail[x]['region']}
                                                                                    </Descriptions.Item>

                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['access_key']}
                                                                                    >
                                                                                        {source_key_detail[x]['access_key']}
                                                                                    </Descriptions.Item>


                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['secret_access_key']}
                                                                                    >
                                                                                        {source_key_detail[x]['secret_access_key']}
                                                                                    </Descriptions.Item>

                                                                                    <Descriptions.Item
                                                                                        label={translate_dict['endpoint']}
                                                                                    >
                                                                                        {source_key_detail[x]['endpoint']}
                                                                                    </Descriptions.Item>


                                                                                </Descriptions>

                                                                        ) :
                                                                        undefined
                                                                }
                                                            </div>
                                                        }
                                                    >{x}</Popover>
                                                </Option>
                                            }
                                        )
                                    }
                                </Select>
                            </Form.Item>
                            <Button
                                type='primary'
                                onClick={() => {
                                    set_sourcekey_modal_open(true)
                                }}>{t('添加云端储存配置')}</Button>

                        </Space>
                    </Form.Item>



                    <>{
                        selected_remote_type === 'nfs' ? undefined :
                            <Form.Item
                                name={'prefix'}
                                label={translate_dict['prefix']}
                                rules={[{ required: true, message: t('此项必填') }]}
                            >
                                <Input></Input>
                            </Form.Item>}

                        <Form.Item
                            name={'storage_class_name'}
                            label={translate_dict['storage_class_name']}
                            tooltip={t('储存临时备份文件的储存卷名称')}
                        >

                            <Select >
                                {
                                    storage_class ?
                                        storage_class.sort().reverse().map(
                                            x => { return <Option value={x}> {x} </Option> }
                                        ) :
                                        <Option> asdfasdf</Option>
                                }
                            </Select>

                        </Form.Item>



                        <Form.Item
                            name={'storage_resource'}
                            label={translate_dict['storage_resource']}
                        >
                            <InputNumber addonAfter='Gi' min={1} ></InputNumber>
                        </Form.Item>
                    </>
                </>
            </Form>
        </Modal>


        <Modal
            className='backup-modal'
            open={restore_modal_open}
            title={translate_dict['restores']}
            onCancel={() => { set_restore_modal_open(false) }}
            footer={[
                <Button key="back" onClick={() => { set_restore_modal_open(false); set_init_value_of_restore_modal({}) }}>
                    {t('取消')}
                </Button>,
                <Button key="submit" type="primary" onClick={async () => {
                    const { dolphindb_namespace, dolphindb_name } = await form_instance_restore.validateFields()
                    if (!content_of_restore_modal) {
                        message.error('The backup info corresponding to this restore is empty. Coder assertion failed.')
                        return
                    }
                    await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/restores`,
                        {
                            method: 'post',
                            body: {
                                name: model.cluster.name,
                                namespace: model.cluster.namespace,
                                source_key: content_of_restore_modal.source_key,
                                remote_type: content_of_restore_modal.remote_type,
                                prefix: content_of_restore_modal.prefix,
                                storage_class_name: content_of_restore_modal.storage_class_name,
                                storage_resource: `${GiProcess(content_of_restore_modal.storage_resource)}`,
                                saveDir: content_of_restore_modal.save_dir,
                                dolphindb_name: dolphindb_name,
                                dolphindb_namespace: dolphindb_namespace,
                                from: content_of_restore_modal.from
                            }
                        }
                    )
                    set_restore_modal_open(false)
                    set_init_value_of_restore_modal({})

                }}>
                    {t('提交')}
                </Button>
            ]}
        >
            <Form
                form={form_instance_restore}
                className='cluster-create-form'
                labelAlign='left'
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 16 }}
                requiredMark={false}
                colon={false}
                initialValues={
                    init_value_of_restore_modal
                }
            >


                <Form.Item name='dolphindb_namespace' label={translate_dict['dolphindb_namespace']}
                    rules={[{ required: true, message: t('此项必填') }]}>
                    <Select onChange={async (value) => {
                        refresh_selectable_names(value)
                        set_init_value_of_restore_modal({ dolphindb_namespace: value, dolphindb_name: undefined })
                    }}
                        value={'dolphindb'}
                    >
                        {
                            namespaces.length !== 0 ?
                                namespaces.map(ns => (
                                    <Option value={ns.name}>{ns.name}</Option>
                                ))
                                :
                                undefined
                        }
                    </Select>
                </Form.Item>

                <Form.Item
                    name={'dolphindb_name'}
                    label={translate_dict['dolphindb_name']}
                    rules={[{ required: true, message: t('此项必填') }]}
                >
                    <Select>
                        {selectable_names ? selectable_names.map((name) => {
                            return <Option value={name} key={name} >{name}</Option>
                        }) :
                            undefined
                        }
                    </Select>
                </Form.Item>


            </Form>
        </Modal>

        {sourcekey_modal_open ? <SourceKeyModal
            sourcekey_modaol_open={sourcekey_modal_open}
            set_sourcekey_modal_open={set_sourcekey_modal_open}
            refresh_source_key={refresh_source_key}
        ></SourceKeyModal> : <div />}


        <ErrorBoundary>
            <DashboardForOneName name={name_of_current_opened_detail} type={'backups'} open={detail_modal_open} onCancel={() => { set_detail_modal_open(false) }}></DashboardForOneName></ErrorBoundary>
    </div>

}

const RestoreListOfNamespace = (props: { tag: 'backups' | 'restores' | 'source_key' }) => {

    const [fetched_restore_list_of_namesace, set_restore_isntances_list_of_namespace] = useState<ListOfRestores>()

    const [refresher, set_refresher] = useState(0)

    const [detail_modal_open, set_detail_modal_open] = useState(false)

    const [name_of_current_opened_detail, set_name_of_current_opened_detail] = useState('')

    const refresh_restore_instances_list_of_namespace = async () => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/restores`) as ListOfRestores
        set_restore_isntances_list_of_namespace(data)
    }

    useEffect(
        () => {
            refresh_restore_instances_list_of_namespace()
        }, [refresher]
    )

    useInterval(
        () => {
            if (props.tag === 'restores') {
                refresh_restore_instances_list_of_namespace()
            }
            return
        }, 5000
    )

    return <div>

        <div className='actions'>
            <Button
                className='refresh'
                icon={<ReloadOutlined />}
                onClick={() => {
                    set_refresher(refresher + 1)
                }}
            >{t('刷新')}</Button>
        </div>

        <div style={{ height: '10px' }}>

        </div>

        {!_.isEmpty(fetched_restore_list_of_namesace) ?
            <Table dataSource={fetched_restore_list_of_namesace.items.map(
                data_item => {
                    return {
                        name: <Link onClick={() => {
                            set_name_of_current_opened_detail(data_item.name)
                            set_detail_modal_open(true)
                        }}>{data_item.name}</Link>,

                        create_timestamp: data_item.create_timestamp,

                        phase: translate_dict[data_item.phase],
                        operation:
                            [
                                <Popconfirm
                                    title={t('确认删除？')}
                                    onConfirm={async () => {
                                        await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/restores/${data_item.name}`, { method: 'delete' })
                                        set_refresher(refresher + 1)
                                    }}
                                    onCancel={() => { }}
                                >
                                    <a href="#">{t('删除')} </a>
                                </Popconfirm>]
                    }
                }
            )}
                pagination={false}
            >
                <Column
                    title={t('名称', { context: 'backup' })}
                    key='name'
                    dataIndex={'name'}
                    width='30%'
                />
                <Column
                    title={t('创建时间', { context: 'backup' })}
                    key='create_timestamp'
                    dataIndex={'create_timestamp'}
                />
                {true ? <Column
                    title={t('状态')}
                    key='phase'
                    dataIndex={'phase'}
                /> : undefined}
                <Column
                    title={t('操作', { context: 'backup' })}
                    key='operation'
                    dataIndex={'operation'}
                />
            </Table> :
            <Empty></Empty>
        }

        <ErrorBoundary>
            <DashboardForOneName name={name_of_current_opened_detail} type={'restores'} open={detail_modal_open} onCancel={() => { set_detail_modal_open(false) }}></DashboardForOneName>
        </ErrorBoundary>

    </div>
}

const SourceKeyList = (props: { tag: 'backups' | 'restores' | 'source_key' }) => {
    const [source_key_detail, set_source_key_detail] = useState()

    const [refresher, set_refresher] = useState(0)

    const [source_key_modal_info, set_source_key_modal_info] = useState()
    const [sourcekey_modal_open, set_sourcekey_modal_open] = useState(false)


    const [source_key_detail_modal_name, set_source_key_detail_modal_name] = useState('')
    const [source_key_detail_modal_open, set_source_key_detail_modal_open] = useState(false)


    const refresh_source_key_detail = async () => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/backups/config`)
        set_source_key_detail(data)

    }


    const refresh_source_key = async () => {
    }


    useEffect(() => {
        refresh_source_key_detail()
    }, [refresher])

    useInterval(
        () => {
            if (props.tag === 'source_key') {
                refresh_source_key_detail()
            }
            return
        }, 5000
    )

    return <div>

        <div className='actions'>
            <Button
                type='primary'
                className='button-create'
                onClick={async () => {
                    set_sourcekey_modal_open(true)
                }}
            >
                <img className='icon-add' src={icon_add} />
                <span>{t('添加云端储存配置')}</span>
            </Button>

            <Button
                className='refresh'
                icon={<ReloadOutlined />}
                onClick={() => {
                    set_refresher(refresher + 1)
                }}
            >{t('刷新')}</Button>
        </div>

        <div style={{ height: '10px' }}>

        </div>

        {sourcekey_modal_open ? <SourceKeyModal
            sourcekey_modaol_open={sourcekey_modal_open}
            set_sourcekey_modal_open={set_sourcekey_modal_open}
            refresh_source_key={refresh_source_key}
        ></SourceKeyModal> : <div />}

        {source_key_detail ?
            <Table dataSource={Object.keys(source_key_detail).map(
                data_item => {
                    return {
                        name: <Link onClick={() => {
                            set_source_key_detail_modal_name(data_item)
                            set_source_key_detail_modal_open(true)
                        }}>{data_item}</Link>,
                        type: source_key_detail[data_item]['type'],
                        operation:
                            [
                                <Popconfirm
                                    title={t('确认删除？')}
                                    onConfirm={async () => {
                                        await request_json_with_error_handling(`/v1/dolphindbs/backups/config/${data_item}`, { method: 'delete' })
                                        set_refresher(refresher + 1)
                                    }}
                                    onCancel={() => { }}
                                >
                                    <a href="#">{t('删除')} </a>
                                </Popconfirm>]
                    }
                }
            )}
                pagination={false}
            >
                <Column
                    title={t('名称', { context: 'backup' })}
                    key='name'
                    dataIndex={'name'}
                    width='30%'
                />
                <Column
                    title={t('类型', { context: 'backup' })}
                    key='type'
                    dataIndex={'type'}
                />
                <Column
                    title={t('操作', { context: 'backup' })}
                    key='operation'
                    dataIndex={'operation'}
                />
            </Table>
            : undefined}


        <Modal
            title={source_key_detail_modal_name}
            open={source_key_detail_modal_open} onCancel={() => {
                set_source_key_detail_modal_open(false)
            }} footer={false}
        >
            <div>
                {
                    source_key_detail && source_key_detail[source_key_detail_modal_name] ?
                        (
                            (source_key_detail[source_key_detail_modal_name]['type'] === 'nfs') ?

                                <Descriptions bordered
                                    column={1}
                                //layout='vertical'
                                >
                                    <Descriptions.Item
                                        label={translate_dict['type']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['type']}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={translate_dict['endpoint']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['endpoint']}
                                    </Descriptions.Item>

                                    <Descriptions.Item
                                        label={translate_dict['path']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['path']}
                                    </Descriptions.Item>

                                </Descriptions>

                                :



                                <Descriptions bordered
                                    column={1}
                                //layout='vertical'
                                >
                                    <Descriptions.Item
                                        label={translate_dict['type']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['type']}
                                    </Descriptions.Item>

                                    <Descriptions.Item
                                        label={translate_dict['provider']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['provider']}
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item
                                        label={translate_dict['region']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['region']}
                                    </Descriptions.Item>

                                    <Descriptions.Item
                                        label={translate_dict['access_key']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['access_key']}
                                    </Descriptions.Item>


                                    <Descriptions.Item
                                        label={translate_dict['secret_access_key']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['secret_access_key']}
                                    </Descriptions.Item>

                                    <Descriptions.Item
                                        label={translate_dict['endpoint']}
                                    >
                                        {source_key_detail[source_key_detail_modal_name]['endpoint']}
                                    </Descriptions.Item>


                                </Descriptions>

                        ) :
                        undefined
                }
            </div>

        </Modal>
    </div>
}

const request_json_with_error_handling = async (url, options?) => {
    if (options) {
        try {
            return await request_json(url, options)
        }
        catch (err) {
            const resp = await err.response.json()
            Modal.error(
                {
                    title: 'Error',
                    content: resp["errorMessage"]
                }
            )
        }
    } else {
        try {
            return await request_json(url)
        }
        catch (err) {
            const resp = await err.response.json()
            Modal.error(
                {
                    title: 'Error',
                    content: resp["errorMessage"]
                }
            )
        }
    }
}

function useInterval(callback, delay) {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    });

    useEffect(() => {
        function tick() {
            savedCallback.current();
        }

        let id = setInterval(tick, delay);
        return () => clearInterval(id);
    }, [delay]);
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    override componentDidCatch(error, errorInfo) {
        // Catch errors in any components below and re-render with error message
        this.setState({
            error: error,
            errorInfo: errorInfo
        })
        // You can also log error messages to an error reporting service here
    }

    override render() {
        if (this.state.errorInfo) {
            // Error path
            return (
                <div>
                    <h2>Something went wrong.</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        // Normally, just render children
        return this.props.children;
    }
}

type ListOfBackups = {
    count: number
    items: {
        name: string
        create_timestamp: string
        phase: string
    }[]
    page_num: number
    page_size: number
    page_total: number
} | undefined

type OneBakcupDetail = {
    name: string
    prefix: string
    remote_type: string
    save_dir: string
    source_key: string
    status: {
        create_timestamp: string
        name: string
        phase: string
    }
    storage_class_name: string
    storage_resource: string
    stored_path: string
} | undefined

type ListOfRestores = ListOfBackups
type OneRestoreDetail = OneBakcupDetail & { dolphindb_name, dolphindb_namespace, from }

type SourceKeyDetail = {
    type: 'nfs',
    endpoint: string
    path: string
} | {
    type: 's3',
    endpoint: string
    provider: string
    secret_access_key: string
    access_key: string
} | undefined


type FlattenBackupDetail = {
    name, prefix, remote_type, save_dir, source_key, create_timestamp, phase, storage_class_name, storage_resource, stored_path
}

type FlattenRestoreDetail = FlattenBackupDetail & { dolphindb_name, dolphindb_namespace, from }

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
