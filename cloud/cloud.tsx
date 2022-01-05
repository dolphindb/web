import './cloud.sass'

import { default as React, useEffect, useState } from 'react'

import { Badge, Button, Form, Input, Select, Table, Typography, InputNumber, message, Tooltip, Popconfirm, Divider, PageHeader, Descriptions } from 'antd'
import { ConsoleSqlOutlined, ReloadOutlined } from '@ant-design/icons'
import type { PresetStatusColorType } from 'antd/lib/_util/colors'

import { t } from '../i18n'
import {
    model,
    type ClusterMode,
    type ClusterType,
    type Cluster,
    type ClusterNode,
    type ClusterConfig,
    type ClusterConfigItem,
} from './model'

import icon_add from './add.svg'


const { Option } = Select
const { Title, Text, Link } = Typography


export function Cloud () {
    const { cluster } = model.use(['cluster']) 
    
    if (cluster)
        return <ClusterDetail />
    
    return <Clusters />
}


function ClusterDetail () {
    const { cluster } = model.use(['cluster'])
    
    const { namespace, name, log_mode, version, storage_class_name, Services: services, status, created_at } = cluster

    const [config, setConfig] = useState<ClusterConfig>({
        cluster_config: [],
        controller_config: [],
        agent_config: []
    })

    const onConfigChange = (config: ClusterConfig) => {
        setConfig(config)
        console.log(`cluster ${cluster.namespace}/${cluster.name} new config:`, config)
    }

    useEffect(() => {
        async function fetchClusterConfig() {
            const config = await model.get_cluster_config(cluster)
            setConfig(config)
            console.log(`cluster ${cluster.namespace}/${cluster.name} config:`, config)
        }
        fetchClusterConfig()
    }, [cluster])

    
    return <div className='cluster'>
        <PageHeader
            className='cluster-header'
            title={
                <Title level={4}>{name}</Title>
            }
            onBack={() => {
                model.set({ cluster: null })
            }}
        />
        
        <Descriptions
            title={
                <Title level={4}>Info</Title>
            }
            column={2}
            bordered
        >
            <Descriptions.Item label='namespace'>{namespace}</Descriptions.Item>
            <Descriptions.Item label='name'>{name}</Descriptions.Item>
            <Descriptions.Item label='status'>
                <ClusterStatus {...status}/>
            </Descriptions.Item>
            <Descriptions.Item label='version'>{version}</Descriptions.Item>
            <Descriptions.Item label='mode'>
                <Mode cluster={cluster} />
            </Descriptions.Item>
            <Descriptions.Item label='log mode'>{log_modes[log_mode] || log_mode}</Descriptions.Item>
            <Descriptions.Item label='created at'>{created_at.format('YYYY.MM.DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label='storage class'>{storage_class_name}</Descriptions.Item>
        </Descriptions>
        
        <Descriptions
            title={
                <Title level={4}>Service</Title>
            }
            column={2}
            bordered
        >
            { services.Controller && <Descriptions.Item label='controller'>
                <ServiceNode {...services.Controller} />
            </Descriptions.Item> }
            <Descriptions.Item label='datanode'>
                <ServiceNode {...services.Datanode} />
            </Descriptions.Item>
        </Descriptions>
        
        <ClusterNodes cluster={cluster} />
        
        <ClusterConfigs config={config} cluster={cluster} onConfigChange={onConfigChange} />
    </div>
}


function Clusters () {
    const { clusters, namespaces, storageclasses } = model.use(['clusters', 'namespaces', 'storageclasses'])
    
    const [creating, set_creating] = useState(false)
    
    const [mode, set_mode] = useState<ClusterMode>('cluster')
    
    const [cluster_type, set_cluster_type] = useState<ClusterType>('multicontroller')
    
    
    return <div className='clusters'>
        <Title className='title-overview' level={3}>{t('集群总览')}</Title>
        
        <div className='actions'>
            <Button
                type='primary'
                className='button-create'
                onClick={() => {
                    set_creating(true)
                }}
            >
                <img className='icon-add' src={icon_add} />
                <span>{t('新建集群')}</span>
            </Button>
            
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={() => {
                    model.get_clusters()
                    model.get_namespaces()
                    model.get_storageclasses()
                }}
            >{t('刷新')}</Button>
        </div>
        
        
        <Table
            className='list'
            columns={[
                {
                    title: 'name',
                    dataIndex: 'name',
                    render (name, cluster: Cluster) {
                        return <Link
                            onClick={async () => {
                                await model.get_cluster(cluster)
                            }}>{name}</Link>
                    }
                },
                {
                    title: 'mode',
                    key: 'mode',
                    render: (value, cluster) => <Mode cluster={cluster} />
                },
                {
                    title: 'version',
                    dataIndex: 'version'
                },
                {
                    title: 'services',
                    key: 'services',
                    dataIndex: 'Services',
                    render: services => <>
                        { services.Controller && <ServiceNode type='controller' {...services.Controller} /> }
                        <ServiceNode type='datanode' {...services.Datanode} />
                    </>
                },
                {
                    title: 'status',
                    dataIndex: ['status'],
                    render: (status: ClusterNode['status']) => 
                        <ClusterStatus {...status} />
                },
                {
                    title: 'actions',
                    key: 'actions',
                    render (value, cluster) {
                        return <Popconfirm
                            title={t('确认删除集群')}
                            onConfirm={async () => {
                                try {
                                    await model.delete(cluster)
                                    message.success(t('集群删除成功'))
                                    await model.get_clusters()
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
            rowKey='name'
            pagination={false}
        />
        
        { creating && <Title className='creating-title' level={4}>{t('新建集群配置')}</Title> }
        
        { creating && <Form
            name='cluster-form'
            className='form'
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            initialValues={{
                mode,
                cluster_type,
                version: 'v2.00.3',
                datanode: {
                    replicas: 0,
                },
                controller: {
                    replicas: 3
                }
            }}
            onFinish={async values => {
                const { mode, cluster_type } = values
                
                console.log(values)
                
                values.datanode.data_size = Number(values.datanode.data_size)
                
                if (cluster_type === 'singlecontroller')
                    values.controller.replicas = 0
                
                if (mode === 'standalone')
                    delete values.controller
                
                try {
                    await model.create(values)
                    message.success(t('集群创建成功'))
                    set_creating(false)
                } catch (error) {
                    message.error(t('集群创建失败'))
                    throw error
                }
                
                await model.get_clusters()
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
        >
            <Form.Item name='name' label='name' rules={[{ required: true }]}>
                <Input />
            </Form.Item>

            <Form.Item name='namespace' label='namespace' rules={[{ required: true }]}>
                <Select placeholder='Please select a namespace'>
                    {
                        namespaces.map(ns => (
                            <Option value={ns.name} key={ns.name}>{ns.name}</Option>
                        ))
                    }
                </Select>
            </Form.Item>

            <Form.Item name='storage_class' label='storage_class'>
                <Select placeholder='Please select a storage class'>
                    {
                        storageclasses.map(sc => (
                            <Option value={sc.name} key={sc.name}>{sc.name}</Option>
                        ))
                    }
                </Select>
            </Form.Item>
            
            <Form.Item name='mode' label='mode' rules={[{ required: true }]}>
                <Select>
                    <Option value='standalone'>standalone</Option>
                    <Option value='cluster'>cluster</Option>
                </Select>
            </Form.Item>
            
            <Form.Item name='version' label='version' rules={[{ required: true }]}>
                <Select>
                    <Option value='v1.30.14'>v1.30.14</Option>
                    <Option value='v1.30.15'>v1.30.15</Option>
                    <Option value='v2.00.3'>v2.00.3</Option>
                </Select>
            </Form.Item>
            
            { mode === 'cluster' && <>
                <Form.Item name='cluster_type' label='cluster_type' rules={[{ required: true }]}>
                    <Select>
                        <Option value='singlecontroller'>singlecontroller</Option>
                        <Option value='multicontroller'>multicontroller</Option>
                    </Select>
                </Form.Item>
                
                { cluster_type === 'multicontroller' && <Form.Item name={['controller', 'replicas']} label='controller.replicas' rules={[{ required: true }]}>
                    <InputNumber min={3} precision={0} />
                </Form.Item>}
                
                <Form.Item name={['controller', 'data_size']} label='controller.data_size' rules={[{ required: true }]}>
                    <InputNumber addonAfter='Gi' />
                </Form.Item>
            </> }
            
            <Form.Item name={['datanode', 'replicas']} label='datanode.replicas' rules={[{ required: true }]}>
                <InputNumber min={0} precision={0} />
            </Form.Item>
            
            <Form.Item name={['datanode', 'data_size']} label='datanode.data_size' rules={[{ required: true }]}>
                <InputNumber placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
            </Form.Item>
            
            <Form.Item name={['resources', 'cpu']} label='cpu' rules={[{ required: true }]}>
                <InputNumber placeholder='0.1, 1, 2, ...' addonAfter={t('核')}/>
            </Form.Item>
            
            <Form.Item name={['resources', 'memory']} label='memory' rules={[{ required: true }]}>
                <InputNumber placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi'/>
            </Form.Item>
            
            <Form.Item wrapperCol={{ offset: 8 }} rules={[{ required: true }]}>
                <Button type='primary' htmlType='submit' className='submit'>{t('提交')}</Button>
                <Button type='default' htmlType='reset' className='reset'>{t('重置')}</Button>
                <Button
                    className='cancel'
                    type='default'
                    onClick={() => {
                        set_creating(false)
                    }}
                >{t('取消')}</Button>
            </Form.Item>
        </Form> }
    </div>
}

function ServiceNode ({
    type,
    ip,
    port
}: {
    type?: 'controller' | 'datanode'
    ip: string
    port: string
}) {
    const link = `${ip}:${port}`
    return <div className='service-node'>
        {type && <span className='type'>{type}: </span> }
        <a className='link' target='_blank' href={`//${link}`}>{link}</a>
    </div>
}


function Mode ({
    cluster: { mode, cluster_type }
}: {
    cluster?: Cluster
}) {
    return <>{`${mode}${ mode === 'standalone' ? '' : `/${cluster_type}` }`}</>
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
            Controller: controllers,
            Datanode: datanodes,
        },
        set_nodes
    ] = useState<{
        Controller: ClusterNode[]
        Datanode: ClusterNode[]
    }>({
        Controller: [ ],
        Datanode: [ ]
    })
    
    
    useEffect(() => {
        ;(async () => {
            /*
            const nodes = await model.get_cluster_nodes(cluster)
            let nodes_ = { } as Record<NodeMode, ClusterNode[]>
            
            for (const node of nodes)
                if (!(node.mode in nodes_))
                    nodes_[node.mode] = [node]
                else
                    nodes_[node.mode].push(node)
            
            set_nodes(nodes_)
            */
           
           set_nodes(
               await model.get_cluster_nodes(cluster)
           )
        })()
    }, [cluster])
    
    return <div className='cluster-nodes'>
            <div className='controllers'>
                <Title level={4}>Controllers ({controllers.length})</Title>
                <NodeList mode='controller' nodes={controllers} />
            </div>
            
            { datanodes && <div className='datanodes'>
                <Title level={4}>Data Nodes ({datanodes.length})</Title>
                <NodeList mode='datanode' nodes={datanodes} />
            </div>}
    </div>
}


function NodeList ({
    mode,
    nodes
}: {
    mode: 'controller' | 'datanode'
    nodes: ClusterNode[]
}) {
    return <Table
        className={`${mode}s`}
        rowKey='name'
        dataSource={nodes}
        pagination={false}
        columns={[
            {
                title: 'name',
                dataIndex: 'name',
            },
            {
                title: 'cpu',
                dataIndex: ['resources', 'limits', 'cpu'],
            },
            {
                title: 'memory',
                dataIndex: ['resources', 'limits', 'memory'],
            },
            {
                title: 'status',
                dataIndex: 'status',
                render: (status: ClusterNode['status']) => <ClusterStatus {...status} />
            },
        ]}
    />
}


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
                    <Text underline>{phase}</Text>
                </Tooltip>
            :
                phase
        }
        status={statuses[phase] || 'default'}
    />
}


function ClusterConfigs ({
    cluster,
    config,
    onConfigChange
}: {
    cluster: Cluster,
    config: ClusterConfig,
    onConfigChange: (config: ClusterConfig) => void
}) {


    return <div className="cluster-config">
        <Title level={4} className='cluster-config-header'>Configuration</Title>
        <ConfigUpdateBar config={config} cluster={cluster} onConfigChange={onConfigChange}/>
        <ConfigList title="cluster_config" configList={config.cluster_config} />
        <ConfigList title="controller_config" configList={config.controller_config} />
        <ConfigList title="agent_config" configList={config.agent_config} />
    </div>
}

function ConfigList ({
    configList,
    title
}: {
    configList: ClusterConfigItem[],
    title: String
}) {
    return (
        <>
            <Title level={5} className='cluster-config-subheader'>{title}</Title>
            <Table dataSource={configList} columns={
                [{
                    title: "name",
                    dataIndex: "name",
                    key: "name",
                    width: 40
                },{
                    title: "value",
                    dataIndex: "value",
                    key: "value",
                    width: 10
                },{
                    title: "type",
                    dataIndex: "type",
                    key: "type",
                    width: 10
                }, {
                    title: "description",
                    dataIndex: "description",
                    key: "description",
                    width: 40
                }]
            } 
            pagination={false}
            className='cluster-config-table'
            />
        </>
    )
}

function ConfigUpdateBar({
    cluster,
    config,
    onConfigChange,
}: {
    cluster: Cluster,
    config: ClusterConfig,
    onConfigChange: (config: ClusterConfig) => void
}) {

    const fieldOptions = Object.keys(config)
    const [keys, setKeys] = useState<ClusterConfigItem[]>([])
    const [inputType, setInputType] = useState<'string' | 'int'>('string')

    const [form] = Form.useForm()

    const onFieldChange = (field) => {
        setKeys(config[field])
    }

    const onKeyChange = (val) => {
        form.setFieldsValue({ value: "" })
        let currType = inputType
        keys.forEach((key) => {
            if (key.name === val) currType = key.type as ('string' | 'int')
        })
        if (currType !== inputType) {
            setInputType(currType)
        }
    }

    const onSubmit = async (values) => {
        const newConfig: ClusterConfig = {
            agent_config: [],
            cluster_config: [],
            controller_config: []
        }
        newConfig[values.field].push({
            name: values.key,
            value: String(values.value)
        })
        console.log(newConfig)
        try {
            await model.update_cluster_config(cluster, newConfig)
            message.success(t("配置参数更新成功"))
            const config = await model.get_cluster_config(cluster)
            onConfigChange(config)
        } catch (err) {
            message.error(t("配置参数更新失败"))
            console.error(err)
        }
    }


    useEffect(() => {
        form.setFieldsValue({ key: (keys[0] && keys[0].name) || "", value: "" })
        setInputType((keys[0] && keys[0].type as ('string' | 'int')) || 'string')
    }, [keys])

    return(
        <>
            <Title level={5} className='cluster-config-subheader'>Update Configuration</Title>
            <Form
                className='update-config-form'
                layout='inline'
                form={form}
                initialValues={{
                    field: ""
                }}
                requiredMark={false}
                colon={false}
                onFinish={onSubmit}
            >
                <Form.Item 
                    name="field" 
                    label="field" 
                    rules={[{required: true}]}
                >
                    <Select 
                        onChange={onFieldChange}
                        style={{width: 200}}
                    >
                        {
                            fieldOptions.map(field => (
                                <Option value={field} key={field}>{field}</Option>
                            ))
                        }
                    </Select>
                </Form.Item>
                <Form.Item name="key" label="key" rules={[{required: true}]}>
                    <Select
                        style={{width: 200}}
                        disabled={form.getFieldValue("field") === ""}
                        onChange={onKeyChange}
                    >
                        {
                            keys.map(key => (
                                <Option value={key.name} key={key.name}>{key.name}</Option>
                            ))
                        }
                    </Select>
                </Form.Item>
                <Form.Item name="value" label="value"  rules={[{required: true}]}>
                {
                    inputType === 'string' ? 
                    (
                        <Input 
                            style={{width: 200}}
                            disabled={form.getFieldValue("field") === ""}
                        />
                    ) : 
                    (
                        <InputNumber 
                            style={{width: 200}}
                            disabled={form.getFieldValue("field") === ""}
                        />
                    )
                }
                </Form.Item>
                <Form.Item>
                    <Button type='primary' htmlType='submit' className='submit'>{t('提交')}</Button>
                </Form.Item>
            </Form>
        </>
    )
}


const log_modes = {
    0: 'file',
    1: 'stdout',
    2: 'file and stdout'
} as const

export default Cloud
