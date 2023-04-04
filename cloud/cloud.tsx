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
} from 'antd'

import { PageHeader } from '@ant-design/pro-layout'

import { InboxOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { PresetStatusColorType } from 'antd/es/_util/colors.js'
import type { AlignType } from 'rc-table/lib/interface.js'

import { delay } from 'xshell/utils.browser.js'
import { type RequestOptions, request_json } from 'xshell/net.browser.js'

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

function Monitor ({ cluster }:{ cluster: Cluster }) {
    return <iframe className='iframe' src={ model.monitor_url + '/?' +`&var-cluster_name=${cluster.name}&var-dolphindb_node=All` } />
}

function ClusterDetail () {
    const { cluster } = model.use(['cluster'])
    
    const { name } = cluster

    const [field, set_field] = useState<FieldType>('info')

    const fields : FieldType[] = ['info', 'config', 'monitor', 'backup']

    const Content = {
        info: <InfoTab />,
        config: <ClusterConfigs cluster={cluster} />,
        backup: <ShowBackupRestoreSourceKey />,
        monitor: <Monitor cluster={cluster}/>
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
    let currClass = 'detail-menu-item'
    
    if (focused)
        currClass += ' detail-menu-item-checked'
    
    const displayValue = {
        info: t('基本信息'),
        config: t('配置参数'),
        monitor: t('集群监控'),
        backup: t('备份管理')
    }
    
    return <div className={currClass} onClick={() => { onClick(value) }}>
        <span className='font-content-wrapper'>
            {displayValue[value]}
        </span>
    </div>
}


function InfoTab() {
    const { cluster } = model.use(['cluster'])
    
    const { namespace, name, log_mode, version, storage_class, services, status, created_at } = cluster
    
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
                    <ClusterOrBackupStatus {...status} type='cluster'/>
                </Descriptions.Item>
                <Descriptions.Item label={t('版本')}>{version}</Descriptions.Item>
                <Descriptions.Item label={t('模式')}>
                    <Mode cluster={cluster} />
                </Descriptions.Item>
                <Descriptions.Item label={t('日志模式')}>{log_modes[log_mode]}</Descriptions.Item>
                <Descriptions.Item label={t('创建时间')}>{created_at.format('YYYY.MM.DD HH:mm:ss')}</Descriptions.Item>
                <Descriptions.Item label={t('存储类')}>{storage_class}</Descriptions.Item>
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

// 把json里面值为 undefined, null, { }的键全部去掉
const removeEmptyProperties = obj => {
    for (const propName in obj) 
        if (obj[propName] === null || obj[propName] === undefined || (typeof obj[propName] === 'object' && Object.keys(obj[propName]).length === 0)) 
            delete obj[propName]
         else if (typeof obj[propName] === 'object') {
            removeEmptyProperties(obj[propName])
            if (Object.keys(obj[propName]).length === 0) 
                delete obj[propName]
        }
}

function Clusters () {
    const { clusters, versions, namespaces } = model.use(['clusters', 'versions', 'namespaces'])
    const [current_cluster, set_current_cluster] = useState<Cluster>(undefined)
    const [create_panel_visible, set_create_panel_visible] = useState(false)
    
    const [queries, set_queries] = useState<QueryOptions>(default_queries)
    
    const [update_modal_open, set_update_modal_open] = useState(false)
    const [update_form] = Form.useForm()
    
    // 3种node_type X [cpu, memory] X [上限(limist)，下限(requests)] 共12种组合，每个组合代表一个Form.Item，需要一个校验函数，所以一共需要构造12个校验函数
    function create_validate_limit_function (node_type, limitField, lowerLimit) {
        return (rule, value, callback) => {
            const formData = update_form.getFieldsValue()
            if (!value || !formData[node_type]['resources']['limits'][limitField]) 
                callback()
             else if (lowerLimit) 
                if (value > formData[node_type]['resources']['limits'][limitField]) 
                    callback(t('下限必须小于或等于上限'))
                 else 
                    callback()
                
             else 
                if (value < formData[node_type]['resources']['requests'][limitField]) 
                    callback(t('上限必须大于或等于下限'))
                 else 
                    callback()
        }
    }
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
    
    useEffect(() => {
        const updated_init_value = (() => {
            let obj = { } as any
            const fields = ['controller', 'datanode', 'computenode']
            
            if (!current_cluster) 
                return { }
            
            
            obj.version = current_cluster.version
            console.log(current_cluster.name)
            fields.forEach((field: 'controller' | 'datanode' | 'computenode') => {
                // 等后台实现，实际条件应该为 `!current_cluster[field]`
                if (!current_cluster[field]?.resources?.limits)
                    return
                obj[field] = {
                    resources: {
                        limits: {
                            cpu: current_cluster[field].resources.limits.cpu.value,
                            memory: current_cluster[field].resources.limits.memory.value
                        },
                        requests: {
                            cpu: current_cluster[field].resources.requests.cpu.value,
                            memory: current_cluster[field].resources.requests.memory.value
                        }
                    }
                }
            })
            
            return obj
        })()
        update_form.setFieldsValue(updated_init_value)
    }, [current_cluster, update_form])
    
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
                        <ClusterOrBackupStatus {...status} type='cluster'/>
                },
                {
                    title: t('操作'),
                    key: 'actions',
                    render (value, cluster) {
                        return <><Space>
                            <Popconfirm
                                title={t('确认删除集群')}
                                onConfirm={async () => {
                                    try {
                                        await model.delete(cluster)
                                        message.success(t('集群删除成功'))
                                        await model.get_clusters(queries)
                                    } catch (error) {
                                        model.json_error(error)
                                        throw error
                                    }
                                }}
                            >
                                <Link>{t('删除')}</Link>
                            </Popconfirm>
                            
                            <Link onClick={() => {
                                set_current_cluster(cluster)
                                set_update_modal_open(true)
                            }}>
                                {t('升级')}
                            </Link>
                        </Space>
                        </>
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
        
        <Modal
            className='cloud-create-panel'
            open={update_modal_open}
            title={t('升级 {{name}}', { name:current_cluster?.name })}
            onCancel={() => {
                set_update_modal_open(false)
            }}
            width='800px'
            mask={false}
            footer={
                <>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='submit'
                        onClick={async () => {
                            var values = await update_form.validateFields()
                            const fields = ['controller', 'datanode', 'computenode']
                            fields.forEach(field => {
                                if (!values[field]?.resources?.limits)
                                    return
                                
                                if (values[field].resources.limits.memory) {
                                    values[field].resources.limits.memory = {
                                        unit: 'Gi',
                                        value: values[field].resources.limits.memory
                                    }
                                }
                                if (values[field].resources.requests.memory) {
                                    values[field].resources.requests.memory = {
                                        unit: 'Gi',
                                        value: values[field].resources.requests.memory
                                    }
                                }
                                if (values[field].resources.limits.cpu) {
                                    values[field].resources.limits.cpu = {
                                        unit: '',
                                        value: values[field].resources.limits.cpu
                                    }
                                }
                                if (values[field].resources.requests.cpu) {
                                    values[field].resources.requests.cpu = {
                                        unit: '',
                                        value: values[field].resources.requests.cpu
                                    }
                                }
                            })
                            
                            removeEmptyProperties(values)
                            try {
                                await request_json(`/v1/dolphindbs/${current_cluster?.namespace}/${current_cluster?.name}`, {
                                    method: 'PUT',
                                    body: values
                                })
                                message.success(t('升级成功'))
                            } catch (err) {
                                model.json_error(err)
                                throw err
                            }
                            set_update_modal_open(false)
                        }}
                    >
                        {t('提交')}
                    </Button>
                </>
            }
        >
            <Form
                form={update_form}
                name='cluster-form'
                className='cluster-create-form'
                labelAlign='left'
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 16 }}
                colon={false}
                requiredMark={false}
            >
                <Divider orientation='left'>{t('基础信息')}</Divider>
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
                
                {
                    current_cluster?.mode === 'cluster' &&
                    <>
                        <Divider orientation='left'>{t('控制节点')}</Divider>

                        <Form.Item label='CPU'>
                            <Input.Group compact>
                                <Form.Item
                                    name={['controller', 'resources', 'requests', 'cpu']}
                                    dependencies={[['controller', 'resources', 'limits', 'cpu']]}
                                    label={t('下限')}
                                    rules={[{ validator: create_validate_limit_function('controller', 'cpu', true) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter={t('核')} />
                                </Form.Item>
                                <Form.Item
                                    name={['controller', 'resources', 'limits', 'cpu']}
                                    dependencies={[['controller', 'resources', 'requests', 'cpu']]}
                                    label={t('上限')}
                                    rules={[{ validator: create_validate_limit_function('controller', 'cpu', false) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter={t('核')} />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>

                        <Form.Item label={t('内存')}>
                            <Input.Group compact>
                                <Form.Item
                                    name={['controller', 'resources', 'requests', 'memory']}
                                    dependencies={[['controller', 'resources', 'limits', 'memory']]}
                                    label={t('下限')}
                                    rules={[{ validator: create_validate_limit_function('controller', 'memory', true) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter='Gi' />
                                </Form.Item>
                                <Form.Item
                                    name={['controller', 'resources', 'limits', 'memory']}
                                    dependencies={[['controller', 'resources', 'requests', 'memory']]}
                                    label={t('上限')}
                                    rules={[{ validator: create_validate_limit_function('controller', 'memory', false) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter='Gi' />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>
                    </>

                }
                
                <Divider orientation='left'>{t('数据节点')}</Divider>
                <Form.Item label='CPU'>
                    <Input.Group compact>
                        <Form.Item
                            name={['datanode', 'resources', 'requests', 'cpu']}
                            dependencies={[['datanode', 'resources', 'limits', 'cpu']]}
                            label={t('下限')}
                            rules={[{ validator: create_validate_limit_function('datanode', 'cpu', true) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter={t('核')} />
                        </Form.Item>
                        <Form.Item
                            name={['datanode', 'resources', 'limits', 'cpu']}
                            dependencies={[['datanode', 'resources', 'requests', 'cpu']]}
                            label={t('上限')}
                            rules={[{ validator: create_validate_limit_function('datanode', 'cpu', false) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter={t('核')} />
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                
                <Form.Item label={t('内存')}>
                    <Input.Group compact>
                        <Form.Item
                            name={['datanode', 'resources', 'requests', 'memory']}
                            dependencies={[['datanode', 'resources', 'limits', 'memory']]}
                            label={t('下限')}
                            rules={[{ validator: create_validate_limit_function('datanode', 'memory', true) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter='Gi' />
                        </Form.Item>
                        <Form.Item
                            name={['datanode', 'resources', 'limits', 'memory']}
                            dependencies={[['datanode', 'resources', 'requests', 'memory']]}
                            label={t('上限')}
                            rules={[{ validator: create_validate_limit_function('datanode', 'memory', false) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter='Gi' />
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                {
                    current_cluster?.mode === 'cluster' &&
                    <>
                        <Divider orientation='left'>{t('计算节点')}</Divider>

                        <Form.Item label='CPU'>
                            <Input.Group compact>
                                <Form.Item
                                    name={['computenode', 'resources', 'requests', 'cpu']}
                                    dependencies={[['computenode', 'resources', 'limits', 'cpu']]}
                                    label={t('下限')}
                                    rules={[{ validator: create_validate_limit_function('computenode', 'cpu', true) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter={t('核')} />
                                </Form.Item>

                                <Form.Item
                                    name={['computenode', 'resources', 'limits', 'cpu']}
                                    dependencies={[['computenode', 'resources', 'requests', 'cpu']]}
                                    label={t('上限')}
                                    rules={[{ validator: create_validate_limit_function('computenode', 'cpu', false) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter={t('核')} />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>

                        <Form.Item label={t('内存')}>
                            <Input.Group compact>
                                <Form.Item
                                    name={['computenode', 'resources', 'requests', 'memory']}
                                    dependencies={[['computenode', 'resources', 'limits', 'memory']]}
                                    label={t('下限')}
                                    rules={[{ validator: create_validate_limit_function('computenode', 'memory', true) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter='Gi' />
                                </Form.Item>
                                <Form.Item
                                    name={['computenode', 'resources', 'limits', 'memory']}
                                    dependencies={[['computenode', 'resources', 'requests', 'memory']]}
                                    label={t('上限')}
                                    rules={[{ validator: create_validate_limit_function('computenode', 'memory', false) }]}
                                    className='limit'
                                >
                                    <InputNumber min={0} addonAfter='Gi' />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>

                    </>
                }
            </Form>
        </Modal>
        
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
        
        
            const fields = ['controller', 'datanode', 'computenode']
            fields.forEach(field => {
                if (!values[field]?.resources?.limits)
                    return
                
                if (values[field].resources.limits.memory) {
                    values[field].resources.limits.memory = {
                        unit: 'Gi',
                        value: values[field].resources.limits.memory
                    }
                }
                if (values[field].resources.requests.memory) {
                    values[field].resources.requests.memory = {
                        unit: 'Gi',
                        value: values[field].resources.requests.memory
                    }
                }
                if (values[field].resources.limits.cpu) {
                    values[field].resources.limits.cpu = {
                        unit: '',
                        value: values[field].resources.limits.cpu
                    }
                }
                if (values[field].resources.requests.cpu) {
                    values[field].resources.requests.cpu = {
                        unit: '',
                        value: values[field].resources.requests.cpu
                    }
                }
            })
            
            removeEmptyProperties(values)
        try {
            await model.create(values)
            message.success(t('集群创建成功'))
            closePanel()
        } catch (error) {
            model.json_error(error)
            throw error
        }
        
        await model.get_clusters(queries)
    }

    const onReset = () => {
        form.resetFields()
    }
    function create_validate_limit_function (node_type, limitField, lowerLimit) {
        return (rule, value, callback) => {
            const formData = form.getFieldsValue()
            if (!value || !formData[node_type]['resources']['limits'][limitField]) 
                callback()
             else if (lowerLimit) 
                if (value > formData[node_type]['resources']['limits'][limitField]) 
                    callback(`${t('下限必须小于或等于上限')}`)
                 else 
                    callback()
                
             else 
                if (value < formData[node_type]['resources']['requests'][limitField]) 
                    callback(`${t('上限必须大于或等于下限')}`)
                 else 
                    callback()
        }
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
                            limits: {
                                cpu: 0.2,
                                memory: 1
                            }
                        }
                    },
                    datanode: {
                        replicas: 0,
                        data_size: 1,
                        log_size: 1,
                        port: 32210,
                        resources: {
                            limits: {
                                cpu: 0.2,
                                memory: 1
                            }
                        }
                    },
                    computenode: {
                        replicas: 0,
                        data_size: 1,
                        log_size: 1,
                        port: 32210,
                        resources: {
                            limits: {
                                cpu: 0.2,
                                memory: 1
                            }
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

                <Form.Item name='storage_class' label={t('存储类')}>
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
                
                
                
                { mode === 'cluster' &&
                    <Form.Item name='cluster_type' label={t('集群类型')} rules={[{ required: true }]}>
                        <Select>
                            <Option value='singlecontroller'>{t('单控制节点')}</Option>
                            <Option value='multicontroller'>{t('多控制节点')}</Option>
                        </Select>
                    </Form.Item>
                }

                <Form.Item noStyle dependencies={[['version']]}>
                    {({ getFieldValue })=>{
                        const version: string = getFieldValue('version')
                        
                        if (version.startsWith('v1')) 
                            if (version.slice(1, version.length) < '1.30.21')
                                return
                        
                        if (version.startsWith('v2')) 
                            if (version.slice(1, version.length) < '2.00.9')
                                return
                        
                        return (
                            <Form.Item label={t('License Server 地址')} name='license_server_address'>
                                <Input />
                            </Form.Item>
                        )
                    }}
                </Form.Item>
                
                { mode === 'cluster' && <>

                    <Divider orientation='left'>{t('控制节点')}</Divider>
                    
                    { cluster_type === 'multicontroller' && <Form.Item name={['controller', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                        <InputNumber min={3} precision={0} />
                    </Form.Item>}
                    
                    <Form.Item name={['controller', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0}  addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['controller', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} addonAfter='Gi' />
                    </Form.Item>
                    
                    <Form.Item name={['controller', 'port']} label={t('端口')} rules={[{ required: true }]}>
                        <InputNumber min={0} />
                    </Form.Item>
                    
                    <Form.Item label='CPU' >
                    <Input.Group compact>
                        <Form.Item 
                            name={['controller', 'resources', 'requests', 'cpu']}
                            dependencies={[['controller', 'resources', 'limits', 'cpu']]}
                            label={t('下限')}
                            rules={[{ validator: create_validate_limit_function('controller', 'cpu', true) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter={t('核')}/>
                        </Form.Item>
                        <Form.Item
                            name={['controller', 'resources', 'limits', 'cpu']}
                            dependencies={[['controller', 'resources', 'requests', 'cpu']]}
                            label={t('上限')}
                            rules={[{ required: true, validator: create_validate_limit_function('controller', 'cpu', false) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter={t('核')}/>
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                    
                <Form.Item label={t('内存')}>
                    <Input.Group compact>
                        <Form.Item
                            name={['controller', 'resources', 'requests', 'memory']}
                            dependencies={[['controller', 'resources', 'limits', 'memory']]}
                            label={t('下限')}
                            rules={[{ validator: create_validate_limit_function('controller', 'memory', true) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter='Gi' />
                        </Form.Item>
                        <Form.Item
                            name={['controller', 'resources', 'limits', 'memory']}
                            dependencies={[['controller', 'resources', 'requests', 'memory']]}
                            label={t('上限')}
                            rules={[{ required: true, validator: create_validate_limit_function('controller', 'memory', false) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter='Gi' />
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                
                </> }

                <Divider orientation='left'>{t('数据节点')}</Divider>
                
                { mode === 'cluster' && <Form.Item name={['datanode', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                    <InputNumber min={0} precision={0} />
                </Form.Item>}
                
                <Form.Item name={['datanode', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                    <InputNumber min={0} addonAfter='Gi' />
                </Form.Item>

                <Form.Item name={['datanode', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                    <InputNumber min={0} addonAfter='Gi' />
                </Form.Item>
                
                <Form.Item name={['datanode', 'port']} label={t('端口')} rules={[{ required: true }]}>
                    <InputNumber min={0} />
                </Form.Item>
                
                <Form.Item label='CPU' >
                    <Input.Group compact>
                        <Form.Item
                            name={['datanode', 'resources', 'requests', 'cpu']}
                            dependencies={[['datanode', 'resources', 'limits', 'cpu']]}
                            label={t('下限')}
                            rules={[{ validator: create_validate_limit_function('datanode', 'cpu', true) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter={t('核')} />
                        </Form.Item>
                        <Form.Item 
                        name={['datanode', 'resources', 'limits', 'cpu']}
                        dependencies={[['datanode', 'resources', 'requests', 'cpu']]}
                        label={t('上限')}
                        rules={[{ required: true, validator: create_validate_limit_function('datanode', 'cpu', false) }]}
                        className='limit'>
                            <InputNumber min={0} addonAfter={t('核')} />
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                    
                <Form.Item label={t('内存')}>
                    <Input.Group compact>
                        <Form.Item 
                            name={['datanode', 'resources', 'requests', 'memory']}
                            dependencies={[['datanode', 'resources', 'limits','memory']]}
                            label={t('下限')}
                            rules={[{ validator: create_validate_limit_function('datanode', 'memory', true) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter='Gi' />
                        </Form.Item>
                        <Form.Item 
                            name={['datanode', 'resources', 'limits','memory']}
                            dependencies={[['datanode', 'resources', 'requests', 'memory']]}
                            label={t('上限')}
                            rules={[{ required: true, validator: create_validate_limit_function('datanode', 'memory', false) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter='Gi' />
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                
               { mode === 'cluster' && <>
                    <Divider orientation='left'>{t('计算节点')}</Divider>
                    
                    <Form.Item name={['computenode', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                        <InputNumber min={0} precision={0} />
                    </Form.Item>
                    
                    <Form.Item name={['computenode', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0}  addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['computenode', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} addonAfter='Gi' />
                    </Form.Item>
                    
                    <Form.Item name={['computenode', 'port']} label={t('端口')} rules={[{ required: true }]}>
                        <InputNumber min={0} />
                    </Form.Item>
                    
                    <Form.Item label='CPU'>
                        <Input.Group compact>
                        <Form.Item
                            name={['computenode', 'resources','requests' , 'cpu']}
                            dependencies={[['computenode', 'resources', 'limits', 'cpu']]}
                            label={t('下限')}
                            rules={[{ validator: create_validate_limit_function('computenode', 'cpu', true) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter={t('核')} />
                        </Form.Item>
                        
                        <Form.Item 
                            name={['computenode', 'resources', 'limits', 'cpu']}
                            dependencies={[['computenode', 'resources','requests' , 'cpu']]}
                            label={t('上限')}
                            rules={[{ required: true, validator: create_validate_limit_function('computenode', 'cpu', false) }]}
                            className='limit'
                        >
                            <InputNumber min={0} addonAfter={t('核')} />
                        </Form.Item>
                        </Input.Group>
                    </Form.Item>
                    
                    <Form.Item label={t('内存')}>
                        <Input.Group compact>
                            <Form.Item
                                name={['computenode', 'resources', 'requests', 'memory']}
                                dependencies={[['computenode', 'resources', 'limits','memory']]}
                                label={t('下限')}
                                rules={[{ validator: create_validate_limit_function('computenode', 'memory', true) }]}
                                className='limit'
                            >
                                <InputNumber min={0} addonAfter='Gi' />
                            </Form.Item>
                            <Form.Item
                                name={['computenode', 'resources', 'limits','memory']}
                                dependencies={[['computenode', 'resources', 'requests', 'memory']]}
                                label={t('上限')}
                                rules={[{ required: true, validator: create_validate_limit_function('computenode', 'memory', false) }]}
                                className='limit'
                            >
                                <InputNumber min={0} addonAfter='Gi' />
                            </Form.Item>
                        </Input.Group>
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
        <CloudUpload {...cloud_upload_props} modal_open={cloud_upload_modal_open} set_modal_open={set_cloud_upload_modal_open} />
        
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
                                            model.json_error(error)
                                            throw error
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
                                        model.json_error(error)
                                        throw error
                                    }
                                }}
                            >
                                <Link>{t('创建')}</Link>
                            </Popconfirm>
                },
                {
                    title: 'cpu',
                    dataIndex: ['resources'],
                    render: (resources: ClusterNode['resources']) => {
                        const max = resources.limits.cpu.value
                        const min = resources.requests.cpu.value
                        return <div className='resources'>
                            <div>{ t('上限') + ' ' + (max !== undefined ? max : '-')  }</div>
                            <div>{ t('下限') + ' ' + (min !== undefined ? min : '-')  }</div>
                        </div>
                    }
                },
                {
                    title: '内存',
                    dataIndex: ['resources'],
                    render: (resources: ClusterNode['resources'])=>{
                        const max = resources.limits.memory
                        const min = resources.requests.memory
                        return <div className='resources'>
                            <div>{ t('上限') + ' ' + (max.value !== undefined ? max.value + max.unit : '-') }</div>
                            <div>{ t('下限') + ' ' + (min.value !== undefined ? min.value + min.unit : '-') }</div>
                        </div>
                    }
                },
                {
                    title: t('数据存储空间'),
                    dataIndex: 'datasize',
                    render: () => cluster[mode]?.data_size
                },
                {
                    title: t('日志存储空间'),
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
                        <ClusterOrBackupStatus {...status} type='node'/>
                },
                {
                    title: t('操作'),
                    width: 300,
                    render (_, node) {
                        const running = node.status.phase === 'Running'
                        
                        return <Space>
                            <Link
                                disabled={!running}
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
                                                    method: 'PUT'
                                                })
                                                message.success(t('启动成功'))
                                            } catch (error) {
                                                model.json_error(error)
                                                throw error
                                            }
                                        }}
                                    >
                                        <Link>{t('启动')}</Link>
                                    </Popconfirm>
                                ) : (
                                    <Popconfirm
                                        title={t('确认暂停？')}
                                        onConfirm={async () => {
                                            try {
                                                await request_json(`/v1/dolphindbs/${cluster.namespace}/${cluster.name}/instances/${node.name}/pause`, {
                                                    method: 'PUT'
                                                })
                                                message.success(t('暂停成功'))
                                            } catch (error) {
                                                model.json_error(error)
                                                throw error
                                            }
                                        }}
                                    >
                                        <Link>{t('暂停')}</Link>
                                    </Popconfirm>
                                )
                            }
                            
                            <Popconfirm
                                disabled={!running}
                                title={t('确认重启？')}
                                onConfirm={async () => {
                                    try {
                                        await model.restart_node(node)
                                        message.success(t('正在重启节点'))
                                    } catch (error) {
                                        model.json_error(error)
                                        throw error
                                    }
                                    await delay(2000)
                                    get_nodes()
                                }}
                            >
                                <Link disabled={!running}>{t('重启')}</Link>
                            </Popconfirm>
                            
                            <Link 
                                disabled={!running}
                                onClick={
                                    () => {
                                        set_cloud_upload_modal_open(true)
                                        set_cloud_upload_props({
                                            namespace: cluster.namespace,
                                            name: cluster.name,
                                            instance: node.name
                                        })
                                    }
                                }>{t('上传文件')}
                            </Link>
                        </Space>
                    }
                }
            ]}
        />
    </>
}


// 颜色对照 https://dolphindb1.atlassian.net/wiki/spaces/CC/pages/629080480/DolphinDB+Backup
const cluster_statuses = {
    Available: 'success',
    Ready: 'processing',
    Progressing: 'processing',
    Unschedulable: 'processing',
    Unavailable: 'error',
    Unknown: 'default'
} satisfies Record<string, PresetStatusColorType> 

const backup_statuses = {
    Failed: 'error',
    Complete: 'success',
    
    Scheduling: 'processing',
    Running: 'processing',
    
    // 疑似弃用
    Cleaning: 'processing',
} satisfies Record<string, PresetStatusColorType>

const restore_statuses = backup_statuses

const node_statuses = {
    ...cluster_statuses,
    Ready: 'success',
    Paused: 'default'
} satisfies Record<string, PresetStatusColorType>

const status_group = {
    cluster: cluster_statuses,
    backup: backup_statuses,
    restore: restore_statuses,
    node: node_statuses
}


function ClusterOrBackupStatus ({
    phase,
    message,
    type
}: {
    phase: string
    message?: string
    type: 'cluster' | 'backup' | 'restore' | 'node'
}) {
    phase ||= 'Processing'
    return <Badge
        className='badge-status'
        text={
            message ? 
                <Tooltip title={message} overlayStyle={{ maxWidth: '800px' }}>
                    <Text underline>{ status_translations[type][phase] || phase }</Text>
                </Tooltip>
            :
            
            status_translations[type][phase] || phase
        }
        status={status_group[type][phase] || 'default'}
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
            model.json_error(err)
            throw err
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
                        <Input placeholder={t('Pod 内路径，如: /data/ddb/server/')} />
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
                        />
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
                        />
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
                label: t('备份'),
                key: '1',
                children: <ErrorBoundary>
                    <BackupListOfNamespace tag={tag}/>
                </ErrorBoundary>
            },
            {
                label: t('还原'),
                key: '2',
                children: <RestoreListOfNamespace tag={tag}/>
            },
            {
                label: t('云端存储配置'),
                key: '3',
                children: <SourceKeyList tag={tag}/>
            },
        ]}
    />

}

type AddSourceKeyModalInfo = {
    type: 'nfs' | 's3'
    open: boolean
}

function SourceKeyModal( { sourcekey_modaol_open, set_sourcekey_modal_open, refresh_source_key }) {
    //SourceKeyModal可能需要改变父组件的状态，最后一个参数refresh_source_key是一个父组件的set_state函数

    const [source_key_modal_info, set_source_key_modal_info] = useState<AddSourceKeyModalInfo>({ type: 'nfs', open: sourcekey_modaol_open })
    const [providers, set_providers] = useState([''])
    const [selected_provider, set_selected_provider] = useState('')

    const [nfs_form] = Form.useForm()
    const [s3_form] = Form.useForm()

    const form_object = { 'nfs': nfs_form, 's3': s3_form }
    useEffect(() => {
        (async () => {
            const fetched_providers = (await request_json_with_error_handling('/v1/dolphindbs/backups/providers'))['providers']
            set_providers(fetched_providers)
        })()
    }, [])
    
    useEffect(() => {
        s3_form.setFieldValue('provider', providers[0])
        set_selected_provider(providers[0])
    }, [providers])


    
    return <Modal

        title={t('添加云端存储配置')}
        open={source_key_modal_info.open}
        onCancel={() => { set_sourcekey_modal_open(false) }}
        footer={[
            <Button key="back" onClick={() => { set_sourcekey_modal_open(false) }}>
                {t('取消')}
            </Button>,
            <Button key="submit" type="primary" onClick={async () => {
                const form_data = await form_object[source_key_modal_info.type].validateFields()
                try {
                    await request_json_with_error_handling('/v1/dolphindbs/backups/config', {
                        body: { ...form_data, type: source_key_modal_info.type },
                    })
                    refresh_source_key()
                    set_sourcekey_modal_open(false)
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
                                <Form.Item
                                    name='endpoint'
                                    label={t('服务地址')}
                                >
                                    <Input />
                                </Form.Item>
                                <Form.Item
                                    name='path'
                                    label={t('共享目录', { context: 'backup' })}
                                    rules={[{ message: t('此项必填'), required: true }]}
                                >
                                    <Input />
                                </Form.Item>
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
                            
                            <Form.Item key='provider' name={'provider'} label={t('供应商')}>
                                <Select
                                onSelect={(x)=>{
                                    set_selected_provider(x)
                                }}
                                >
                                    {providers.map((x) => {
                                        return <Option value={x}> {x} </Option>
                                    })}
                                </Select>
                            </Form.Item>
                            
                            { !(selected_provider === 'Ceph' || selected_provider === 'Minio') && <Form.Item key='region' name={'region'} label={t('区域')}>
                                    <Input />
                                </Form.Item>
                            }
                            
                            <Form.Item key='access_key' name='access_key' label={t('访问密钥')}
                                rules={[{ message: t('此项必填'), required: true }]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item key='secret_access_key' name='secret_access_key' label={t('加密密钥')}
                                rules={[{ message: t('此项必填'), required: true }]}
                            >
                                <Input />
                            </Form.Item>
                            
                            { selected_provider !== 'AWS' && <Form.Item key='endpoint' name='endpoint' label={t('服务地址')}
                            >
                                <Input />
                            </Form.Item>}
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
    //@ts-ignore
    const [{phase, remote_type, source_key, from, stored_path, storage_class, storage_resource, dolphindb_name, dolphindb_namespace}, setData] = useState<FlattenBackupDetail | FlattenRestoreDetail>({})
    const [source_key_detail, set_source_key_detail] = useState<SourceKeyDetail[]>([])

    async function fetch_data() {
        if (!props.name) {
            return
        }
        const _data = await request_json_with_error_handling(`/v1/dolphindbs/${namespace}/${model.cluster.name}/${props.type}/${props.name}`)
        //create_timestamp不展示,记为undefined
        const data = { ..._data, phase: _data?.status.phase, create_timestamp:undefined }
        setData(data)
    }

    useEffect(() => {
        fetch_data();

        (async () => {
            const data = await request_json_with_error_handling(`/v1/dolphindbs/backups/config`) as SourceKeyDetail[]
            set_source_key_detail(data)
        })()
    }, [props.open])

    if (!phase)
        return undefined
    
    return <Modal open={props.open} width='70%' onCancel={props.onCancel} footer={false}>
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
                    {/* 目前为止, backup 和 restore 采用相同的状态映射 */}
                    <Descriptions.Item label={t('状态')}>{status_translations.backup[phase]}</Descriptions.Item>
                </Descriptions>
            </div>

            <div id='BackupInfo'>
                <Descriptions
                    title={
                        <Title level={4}>{t('备份信息')}</Title>
                    }
                    bordered
                >
                    <Descriptions.Item label={t('云端存储类型')}>{remote_type}</Descriptions.Item>
                    <Descriptions.Item label={t('云端存储配置')}>{
                        <Popover title={source_key}
                            mouseEnterDelay={0}
                            mouseLeaveDelay={0}
                            placement='left'
                            content={
                                source_key_detail ? <SourceKeyPanel single_sourceKey_detail={source_key_detail[source_key]}/> : undefined

                            }
                        >{<Link>{source_key}</Link>}</Popover>
                    }</Descriptions.Item>
                    {
                        props.type === 'restores' ?
                            <Descriptions.Item label={t('备份源')}>
                                {from}
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
                    <Descriptions.Item label={t('存储路径')}>{stored_path || ' '}</Descriptions.Item>

                </Descriptions>
            </div>

            {
                storage_class && storage_resource ?
                    <Descriptions
                        title={
                            <Title level={4}>{t('存储信息')}</Title>
                        }
                        column={2}
                        bordered
                    >
                        <Descriptions.Item label={t('存储类名称')}>{storage_class || ' '}</Descriptions.Item>
                        <Descriptions.Item label={t('存储空间')}>{storage_resource ? GiProcess(storage_resource) : ' '}</Descriptions.Item>
                    </Descriptions>
                    : undefined
            }

            {
                dolphindb_name && dolphindb_namespace ?
                    <Descriptions
                        title={
                            <Title level={4}>{t('集群信息')}</Title>
                        }
                        column={2}
                        bordered
                    >
                        <Descriptions.Item label={t('命名空间')}>{dolphindb_namespace || ' '}</Descriptions.Item>
                        <Descriptions.Item label={t('名称', { context: 'backup' })}>{dolphindb_name || ' '}</Descriptions.Item>
                    </Descriptions>
                    : undefined}


        </div>
    </Modal>
}

// 翻译对照 https://dolphindb1.atlassian.net/wiki/spaces/CC/pages/629080480/DolphinDB+Backup
const cluster_status_translations = {
    Available: t('运行正常'),
    Ready: t('已就绪'),
    Progressing: t('调度中', { context: 'cluster' }),
    Unschedulable: t('等待调度'),
    Unavailable: t('运行失败', { context: 'cluster' }),
    Unknown: t('未就绪')
}

const node_status_translations = {
    ...cluster_status_translations,
    Ready: t('运行中', { context: 'node' }),
    Paused: t('已暂停')
}

const backup_status_translations = {
    Running: t('运行中', { context: 'backup' }),
    Complete: t('运行完成'),
    Scheduling: t('调度中', { context: 'backup' }),
    Failed: t('运行失败', { context: 'backup' }),
    
    // 以下状态疑似弃用
    Cleaning: t('清理中'),
    Pending: t('准备中', { context: 'pending'}),
    Cleaned: t('清理完成'),
}

const restore_status_translations = backup_status_translations

const status_translations = {
    cluster: cluster_status_translations,
    node: node_status_translations,
    backup: backup_status_translations,
    restore: restore_status_translations
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

    const [content_of_backup_modal, set_content_of_backup_modal] = useState<OneBakcupDetail>()

    const [content_of_restore_modal, set_content_of_restore_modal] = useState<OneRestoreDetail>(undefined)

    const [restore_modal_open, set_restore_modal_open] = useState(false)

    const [name_of_current_opened_detail, set_name_of_current_opened_detail] = useState<string>()

    const { namespaces } = model.use(['namespaces'])

    const [selectable_names, set_selectable_names] = useState<string[]>([])

    const [init_value_of_restore_modal, set_init_value_of_restore_modal] = useState<{ dolphindb_namespace: string, dolphindb_name: string }>()

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
                    set_content_of_backup_modal({ source_key: source_keys[0], remote_type: 's3', storage_class: storage_class.sort().reverse()[0], storage_resource: 10 } as OneRestoreDetail)
                }}
            >
                <img className='icon-add' src={icon_add} />
                <span>{t('备份')}</span>
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
                    const { message, create_timestamp, phase, name } = data_item
                    return {
                        name: <Link onClick={() => {
                            set_name_of_current_opened_detail(name)
                            set_detail_modal_open(true)
                        }}>{name}</Link>,

                        create_timestamp: create_timestamp,

                        phase: <ClusterOrBackupStatus phase={phase} message={message} type='backup' />,
                        operation:
                                <Space>
                                    <Popconfirm
                                        disabled={ phase === 'Cleaning'}
                                        title={t('确认删除？')}
                                        onConfirm={async () => {
                                            await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups/${name}`, { method: 'DELETE' })
                                            set_refresher(refresher + 1)
                                        }}
                                        onCancel={() => { }}
                                    >
                                        <Link href="#">{t('删除')} </Link>
                                    </Popconfirm>

                                    <Popconfirm
                                        disabled={!(phase === 'Complete' || phase === 'Failed')}
                                        title={t('确认重新触发？')}
                                        onConfirm={async () => {
                                            const data = await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups/${name}`)

                                            var { source_key, remote_type, prefix, storage_class, storage_resource } = data

                                            await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups`,
                                                {
                                                    method: 'POST',
                                                    body: {
                                                        name: model.cluster.name,
                                                        namespace: model.cluster.namespace,
                                                        source_key: source_key,
                                                        remote_type: remote_type,
                                                        prefix: prefix,
                                                        storage_class: storage_class,
                                                        storage_resource: `${GiProcess(storage_resource)}`
                                                    }
                                                }
                                            )


                                        }}
                                        onCancel={() => { }}
                                    >
                                        <Link
                                            disabled={ !(phase === 'Complete' || phase === 'Failed')}
                                            href="#">{t('重新触发')} 
                                        </Link>
                                    </Popconfirm>

                                    <Link
                                        disabled={ phase !== 'Complete'}
                                        onClick={
                                            () => {
                                                set_restore_modal_open(true)
                                                set_init_value_of_restore_modal({ dolphindb_namespace: namespaces[0].name, dolphindb_name: undefined })
                                                refresh_selectable_names(namespaces[0].name)
                                                refresh_content_of_restore_modal(name)
                                            }}
                                    >
                                        {t('还原')}
                                    </Link>

                                    </Space>
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
                <Column
                    title={t('状态')}
                    key='phase'
                    dataIndex={'phase'}
                />
                <Column
                    title={t('操作', { context: 'backup' })}
                    key='operation'
                    dataIndex={'operation'}
                />
            </Table> :
            <Empty/>
        }
        <Modal
            className='backup-modal'
            open={backup_modal_open}
            title={t('备份')}
            onCancel={() => { set_backup_modal_open(false) }}
            footer={[
                <Button key="back" onClick={() => { set_backup_modal_open(false) }}>
                    {t('取消')}
                </Button>,
                <Button key="submit" type="primary" onClick={async () => {
                    var { source_key, prefix, storage_class, storage_resource } = await form_instance_backup.validateFields()
                    if (!source_key_detail) {
                        //source_key_detail在打开Modal的时候会被set，所以其必有值
                        message.error('SourceKey detail is none. Coder assertion failed')
                        return
                    }
                    const remote_type = source_key_detail[source_key]['type']
                    await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/backups`,
                        {
                            body: {
                                name: model.cluster.name,
                                namespace: model.cluster.namespace,
                                source_key: source_key,
                                remote_type: remote_type,
                                prefix: prefix,
                                storage_class: storage_class,
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
                initialValues={
                    content_of_backup_modal
                }
                requiredMark={false}
                colon={false}
            >
                <>
                    <Form.Item label={t('云端存储配置')} className={'source_key'} rules={[{ required: true, message: t('此项必填') }]} tooltip={t('存储备份文件的存储系统配置')}>
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
                                                            source_key_detail ? <SourceKeyPanel single_sourceKey_detail={source_key_detail[x]}/> : undefined
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
                                }}>{t('添加云端存储配置')}</Button>

                        </Space>
                    </Form.Item>



                    <>{
                        selected_remote_type === 'nfs' ? undefined :
                            <Form.Item
                                name={'prefix'}
                                label={t('桶名')}
                                rules={[{ required: true, message: t('此项必填') }]}
                            >
                                <Input/>
                            </Form.Item>}

                        <Form.Item
                            name={'storage_class'}
                            label={t('存储类名称')}
                            tooltip={t('存储临时备份文件的存储卷名称')}
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
                            label={t('存储空间')}
                        >
                            <InputNumber addonAfter='Gi' min={1}  />
                        </Form.Item>
                    </>
                </>
            </Form>
        </Modal>


        <Modal
            className='backup-modal'
            open={restore_modal_open}
            title={t('还原')}
            onCancel={() => { set_restore_modal_open(false) }}
            footer={[
                <Button key="back" onClick={() => { 
                    set_restore_modal_open(false)
                    set_init_value_of_restore_modal({ dolphindb_name:'', dolphindb_namespace:'' }) }
                }>
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
                            body: {
                                name: model.cluster.name,
                                namespace: model.cluster.namespace,
                                source_key: content_of_restore_modal.source_key,
                                remote_type: content_of_restore_modal.remote_type,
                                prefix: content_of_restore_modal.prefix,
                                storage_class: content_of_restore_modal.storage_class,
                                storage_resource: `${GiProcess(content_of_restore_modal.storage_resource)}`,
                                save_dir: content_of_restore_modal.save_dir,
                                dolphindb_name: dolphindb_name,
                                dolphindb_namespace: dolphindb_namespace,
                                from: content_of_restore_modal.from
                            }
                        }
                    )
                    set_restore_modal_open(false)
                    set_init_value_of_restore_modal({dolphindb_namespace:'', dolphindb_name:''})

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


                <Form.Item name='dolphindb_namespace' label={t('命名空间')}
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
                    label={t('名称')}
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
        /> : <div />}


        <ErrorBoundary>
            <DashboardForOneName name={name_of_current_opened_detail} type={'backups'} open={detail_modal_open} onCancel={() => { set_detail_modal_open(false) }}></DashboardForOneName>
        </ErrorBoundary>
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
                    const {message, create_timestamp, phase, name} = data_item
                    return {
                        name: <Link onClick={() => {
                            set_name_of_current_opened_detail(name)
                            set_detail_modal_open(true)
                        }}>{name}</Link>,

                        create_timestamp: create_timestamp,

                        phase: <ClusterOrBackupStatus phase={phase} message={message} type='restore' />,
                        
                        operation:
                            [
                                <Popconfirm
                                    title={t('确认删除？')}
                                    onConfirm={async () => {
                                        await request_json_with_error_handling(`/v1/dolphindbs/${model.cluster.namespace}/${model.cluster.name}/restores/${name}`, { method: 'DELETE' })
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
                <Column
                    title={t('状态')}
                    key='phase'
                    dataIndex={'phase'}
                />
                <Column
                    title={t('操作', { context: 'backup' })}
                    key='operation'
                    dataIndex={'operation'}
                />
            </Table> :
            <Empty/>
        }

        <ErrorBoundary>
            <DashboardForOneName name={name_of_current_opened_detail} type={'restores'} open={detail_modal_open} onCancel={() => { set_detail_modal_open(false) }} />
        </ErrorBoundary>

    </div>
}

const SourceKeyPanel = ({single_sourceKey_detail}: {single_sourceKey_detail:  SourceKeyDetail[string]})  => {
    //@ts-ignore
    const { type, endpoint, provider, region, access_key, secret_access_key, path} = single_sourceKey_detail
    if (!single_sourceKey_detail)
        return null
    
    return <>
        {
            type === 'nfs' ?

                <Descriptions bordered
                    column={1}
                //layout='vertical'
                >
                    <Descriptions.Item
                        label={t('类型')}
                    >
                        {type}
                    </Descriptions.Item>
                    <Descriptions.Item
                        label={t('服务地址')}
                    >
                        {endpoint}
                    </Descriptions.Item>

                    <Descriptions.Item
                        label={t('共享目录', { context: 'backup' })}
                    >
                        {path}
                    </Descriptions.Item>

                </Descriptions>
                :
                <Descriptions bordered
                    column={1}
                //layout='vertical'
                >
                    <Descriptions.Item
                        label={t('类型')}
                    >
                        {type}
                    </Descriptions.Item>

                    <Descriptions.Item
                        label={t('供应商')}
                    >
                        {provider}
                    </Descriptions.Item>

                    {
                        !(provider === 'Ceph' || provider === 'Minio') ?
                            <Descriptions.Item
                                label={t('区域')}
                            >
                                {region}
                            </Descriptions.Item> :
                            undefined
                    }

                    <Descriptions.Item
                        label={t('访问密钥')}
                    >
                        {access_key}
                    </Descriptions.Item>


                    <Descriptions.Item
                        label={t('加密密钥')}
                    >
                        {secret_access_key}
                    </Descriptions.Item>

                    {
                        !(provider === 'AWS') &&
                            <Descriptions.Item
                                label={t('服务地址')}
                            >
                                {endpoint}
                            </Descriptions.Item>
                    }


                </Descriptions>
        }
    </>
}

const SourceKeyList = (props: { tag: 'backups' | 'restores' | 'source_key' }) => {
    const [source_key_detail, set_source_key_detail] = useState()

    const [refresher, set_refresher] = useState(0)

    const [sourcekey_modal_open, set_sourcekey_modal_open] = useState(false)


    const [source_key_detail_modal_name, set_source_key_detail_modal_name] = useState('')
    const [source_key_detail_modal_open, set_source_key_detail_modal_open] = useState(false)


    const refresh_source_key_detail = async () => {
        const data = await request_json_with_error_handling(`/v1/dolphindbs/backups/config`)
        set_source_key_detail(data)

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
                <span>{t('添加云端存储配置')}</span>
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
            //refresh_source_key 用于改变父组件状态，但是在此不需要，因此传一个空函数
            refresh_source_key={ () => {} }
        /> : <div />}

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
                                        await request_json_with_error_handling(`/v1/dolphindbs/backups/config/${data_item}`, { method: 'DELETE' })
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
            {source_key_detail ? <SourceKeyPanel single_sourceKey_detail={source_key_detail[source_key_detail_modal_name]}/> : undefined}

        </Modal>
    </div>
}

const request_json_with_error_handling = async (url: string, options?: RequestOptions) => {
    try {
        return await request_json(url, options)
    }
    catch (error) {
        model.json_error(error)
        throw error
    }
}

function useInterval(callback, delay) {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    });

    useEffect(() => {
        function tick() {
            // @ts-ignore
            savedCallback.current();
        }

        let id = setInterval(tick, delay);
        return () => clearInterval(id);
    }, [delay]);
}

class ErrorBoundary extends React.Component<any, any> {
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
        phase: keyof typeof backup_statuses
        message: string
    }[]
    page_num: number
    page_size: number
    page_total: number
}

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
    storage_class: string
    storage_resource: number
    stored_path: string
}

type ListOfRestores = ListOfBackups
// 此处 ListOfRestores 和 ListOfBackups并不完全一样，它们的items.phase相差一项'Cleaning'，但是在类型使用过程中几乎无差别

type OneRestoreDetail = OneBakcupDetail & { dolphindb_name:string, dolphindb_namespace:string, from:string }

type SourceKeyDetail = 
{
    [key: string]: ({
        type: 'nfs'
        endpoint: string
        path: string
    } | {
        type: 's3'
        endpoint: string
        provider: string
        secret_access_key: string
        access_key: string
    })
}

type FlattenBackupDetail = {
    name: string
    prefix: string
    remote_type: string
    save_dir: string
    source_key: string
    create_timestamp: string
    phase: string
    storage_class: string
    storage_resource: number
    stored_path: string
}

type FlattenRestoreDetail = FlattenBackupDetail & { dolphindb_name:string, dolphindb_namespace:string, from:string }
