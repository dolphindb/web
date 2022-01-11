import './cloud.sass'

import { default as React, useEffect, useState } from 'react'

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
    PageHeader, 
    Descriptions,
    Tabs,
    Layout,
    Modal,
    Switch,
    Divider
    } from 'antd'
import { ConsoleSqlOutlined, ReloadOutlined } from '@ant-design/icons'
import type { PresetStatusColorType } from 'antd/lib/_util/colors'
import type { AlignType } from 'rc-table/lib/interface'

import { language, t } from '../i18n'
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


/** Type of cluster detail field: 'info' or 'config' */
type FieldType = 'info' | 'config'

function ClusterDetail () {
    const { cluster } = model.use(['cluster'])
    
    const { name } = cluster

    const [field, setField] = useState<FieldType>('info') 

    const fields : FieldType[] = ['info', 'config']

    const onButtonClick = (value: FieldType) => {
        setField(value)
    }

    const Content = {
        info: <InfoTab />,
        config: <ClusterConfigs cluster={cluster} />
    }
    
    return (
        <div className='cluster'>
            <Layout>
                <Layout.Header>
                    <PageHeader
                        className='cluster-header'
                        title={
                            <Title level={4}>{name}</Title>
                        }
                        onBack={() => {
                            model.set({ cluster: null })
                        }}
                    />
                </Layout.Header>
                <Layout>
                    <Layout.Sider theme='light' className='sidebar' width='250px'>
                        <ClusterDetailMenu field={field} fields={fields} onButtonClick={onButtonClick} />
                    </Layout.Sider>
                    <Layout.Content className='content'>
                        {Content[field]}
                    </Layout.Content>
                </Layout>
            </Layout>

        </div>
    )
}


function ClusterDetailMenu ({
    field,
    fields,
    onButtonClick
}: {
    field: FieldType,
    fields: FieldType[],
    onButtonClick: (value: FieldType) => void
}) {

    return(
        <div className='detail-menu'>
            {fields.map(f => (
                <ClusterDetailMenuItem key={f} focused={field === f} onClick={onButtonClick} value={f} />
            ))}
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
        onClick(value)
    }

    let currClass = 'detail-menu-item'

    if (focused) {
        currClass += ' detail-menu-item-checked'
    }

    const displayValue = {
        info: t("基本信息"),
        config: t("配置参数")
    }

    return(
        <div className={currClass} onClick={onButtonClick}>
                <span className='font-content-wrapper'>
                    {displayValue[value]}
                </span>
        </div>
    )
}

function InfoTab() {
    const { cluster } = model.use(['cluster'])
    
    const { namespace, name, log_mode, version, storage_class_name, Services: services, status, created_at } = cluster
    
    return (
        <>
            <Descriptions
                title={
                    <Title level={4}>Info</Title>
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
                    <Title level={4}>Service</Title>
                }
                column={2}
                bordered
            >
                { services.Controller && <Descriptions.Item label='controller'>
                    <ServiceNode {...services.Controller} />
                </Descriptions.Item> }
                { services.Datanode ? 
                    <Descriptions.Item label='datanode'>
                        <ServiceNode {...services.Datanode} />
                    </Descriptions.Item>
                :
                    <Descriptions.Item label='standalone'>
                        <ServiceNode {...services.Standalone} />
                    </Descriptions.Item>
                }
            </Descriptions>
            
            <ClusterNodes cluster={cluster} />
        </>
    )
}


function Clusters () {
    const { clusters } = model.use(['clusters'])
    
    const [createPanelVisible, setCreatePaneVisible] = useState(false)

    return <div className='clusters'>
        <Title className='title-overview' level={3}>{t('集群管理')}</Title>
        
        <div className='actions'>
            <Button
                type='primary'
                className='button-create'
                onClick={() => {
                    setCreatePaneVisible(true)
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
                    model.get_versions()
                }}
            >{t('刷新')}</Button>
        </div>
        
        
        <Table
            className='list'
            columns={[
                {
                    title: t('名称'),
                    dataIndex: 'name',
                    render (name, cluster: Cluster) {
                        return <Link
                            onClick={async () => {
                                await model.get_cluster(cluster)
                            }}>{name}</Link>
                    }
                },
                {
                    title: t('模式'),
                    key: 'mode',
                    render: (value, cluster) => <Mode cluster={cluster} />
                },
                {
                    title: t('版本'),
                    dataIndex: 'version'
                },
                {
                    title: t('服务'),
                    key: 'services',
                    dataIndex: 'Services',
                    render: services => {
                        if (services.Controller) {
                            return (
                            <>
                                <ServiceNode type='controller' {...services.Controller} />
                                <ServiceNode type='datanode' {...services.Datanode} />
                            </>
                            )
                        } else {
                            return (
                                <ServiceNode type='standalone' {...services.Standalone} />
                            )
                        }
                    }  
                },
                {
                    title: t('状态'),
                    dataIndex: ['status'],
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

        <CreateClusterPanel
            visible={createPanelVisible}
            closePanel={() => {setCreatePaneVisible(false)}}
        />
    </div>
}

function CreateClusterPanel({
    visible,
    closePanel,
}: {
    visible: boolean,
    closePanel: () => void
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
        
        if (mode === 'standalone') {
            delete values.controller
            delete values.datanode
        }
        try {
            await model.create(values)
            message.success(t('集群创建成功'))
            closePanel()
        } catch (error) {
            message.error(t('集群创建失败'))
            throw error
        }
        
        await model.get_clusters()
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
                    version: versions.length !== 0 ? versions[0] : "",
                    controller: {
                        replicas: 3,
                        data_size: 1,
                        log_size: 1,
                    },
                    datanode: {
                        replicas: 0,
                        data_size: 1,
                        log_size: 1,
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
                    tooltip={t("只能包含小写字母、数字、'-' 以及 '.' , 必须以字母数字开头和结尾")}
                    rules={[{ 
                            required: true, 
                            pattern: new RegExp('^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'),
                        }]}
                    messageVariables={{
                        pattern: t("集群名称只能包含小写字母、数字、'-' 以及 '.' , 必须以字母数字开头和结尾")
                    }}
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
                            <Option value="">{""}</Option>
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
                            <Option value="">{""}</Option>
                        }
                    </Select>
                </Form.Item>
                
                <Form.Item name='mode' label={t('模式')} rules={[{ required: true }]}>
                    <Select>
                        <Option value='standalone'>standalone</Option>
                        <Option value='cluster'>cluster</Option>
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
                            <Option value="">{""}</Option>
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
                            <Option value='singlecontroller'>singlecontroller</Option>
                            <Option value='multicontroller'>multicontroller</Option>
                        </Select>
                    </Form.Item>

                    <Divider orientation='left'>{t('控制节点配置')}</Divider>
                    
                    { cluster_type === 'multicontroller' && <Form.Item name={['controller', 'replicas']} label={t('控制节点副本数')} rules={[{ required: true }]}>
                        <InputNumber min={3} precision={0} />
                    </Form.Item>}
                    
                    <Form.Item name={['controller', 'data_size']} label={t('控制节点数据存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...'  addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['controller', 'log_size']} label={t('控制节点日志存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                    </Form.Item>

                </> }

                <Divider orientation='left'>{t('数据节点配置')}</Divider>
                
                {mode === 'cluster' && <Form.Item name={['datanode', 'replicas']} label={t('数据节点副本数')} rules={[{ required: true }]}>
                    <InputNumber min={0} precision={0} />
                </Form.Item>}
                
                <Form.Item name={['datanode', 'data_size']} label={t('数据节点数据存储空间')} rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                </Form.Item>

                <Form.Item name={['datanode', 'log_size']} label={t('数据节点日志存储空间')} rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                </Form.Item>
                
                <Divider orientation='left'>{t('资源限制')}</Divider>

                <Form.Item name={['resources', 'cpu']} label='cpu' rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter={t('核')}/>
                </Form.Item>
                
                <Form.Item name={['resources', 'memory']} label={t('内存')} rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi'/>
                </Form.Item>
            </Form>
        </Modal>
        
    )
}

function ServiceNode ({
    type,
    ip,
    port
}: {
    type?: 'controller' | 'datanode' | 'standalone'
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

    if (cluster.mode === 'cluster') {
        return (
            <div className='cluster-nodes'>
                    {controllers && <div className='controllers'>
                        <Title level={4}>Controllers ({controllers.length})</Title>
                        <NodeList mode='controller' nodes={controllers} cluster={cluster}/>
                    </div>}
                    
                    {datanodes &&  <div className='datanodes'>
                        <Title level={4}>Data Nodes ({datanodes.length})</Title>
                        <NodeList mode='datanode' nodes={datanodes} cluster={cluster} />
                    </div>}
            </div>
        )
    } else {
        return (
            <div className='datanodes'>
            <Title level={4}>Standalone</Title>
            <NodeList mode='datanode' nodes={datanodes} cluster={cluster} />
            </div>
        )
    }
    
}


function NodeList ({
    cluster,
    mode,
    nodes
}: {
    cluster: Cluster,
    mode: 'controller' | 'datanode'
    nodes: ClusterNode[]
}) {
    return <Table
        className='config-table'
        rowKey='name'
        dataSource={nodes}
        pagination={false}
        columns={[
            {
                title: t('名称'),
                dataIndex: 'name',
            },
            {
                title: 'cpu',
                dataIndex: ['resources', 'limits', 'cpu'],
            },
            {
                title: t('内存'),
                dataIndex: ['resources', 'limits', 'memory'],
            },
            {
                title: t('数据储存空间'),
                dataIndex: 'datasize',
                render: () => mode === 'controller' ? cluster.controller?.dataSize : cluster.datanode?.dataSize
            },
            {
                title: t('日志储存空间'),
                dataIndex: 'logsize',
                render: () => mode === 'controller' ? cluster.controller?.logSize : cluster.datanode?.logSize
            },
            {
                title: t('状态'),
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

/** Type of Configuration: Cluster, Controller, Agent */
type ConfigType = 'cluster' | 'controller' | 'agent' | 'standalone'

function ClusterConfigs ({
    cluster
}: {
    cluster: Cluster
}) {

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

    return <div className="cluster-config">
        <Title level={4} className='cluster-config-header'>Configuration</Title>
        {cluster.mode === 'cluster' ?
            <Tabs size='large'>
                <Tabs.TabPane tab={t("集群参数")} key='cluster'>
                    <ConfigEditableList 
                        type='cluster' 
                        configList={config.cluster_config} 
                        editedList={editedConfig.cluster_config} 
                        onConfigChange={onConfigChange} 
                    />
                </Tabs.TabPane>
                <Tabs.TabPane tab={t("控制节点参数")} key='controller'>
                    <ConfigEditableList 
                        type='controller' 
                        configList={config.controller_config} 
                        editedList={editedConfig.controller_config} 
                        onConfigChange={onConfigChange} 
                    />
                </Tabs.TabPane >
                <Tabs.TabPane tab={t("代理节点参数")} key='agent' >
                    <ConfigEditableList 
                        type='agent' 
                        configList={config.agent_config}  
                        editedList={editedConfig.agent_config}
                        onConfigChange={onConfigChange} 
                    />
                </Tabs.TabPane>
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
                <Button type="primary" className='cluster-button' onClick={() => {setSubmitPopVisible(true)}}>{t('提交参数修改')}</Button>
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
}
) {

    const [form] = Form.useForm()
    const [editingName, setEditingName] = useState('')

    const isEditing = (record: ClusterConfigItem) => record.name === editingName

    const edit = (record: ClusterConfigItem) => {
        if (record.type !== 'bool') {
            form.setFieldsValue({ value: record.value })
        } else {
            form.setFieldsValue({ value: record.value === 'true' })
        }
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
            dataIndex: "name",
            key: "name",
            width: '25%',
            editable: false
        },
        {
            title: t('当前值'),
            dataIndex: "value",
            key: "value",
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
            dataIndex: "default_value",
            key: "default value",
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
            dataIndex: "type",
            key: "type",
            width: '6%',
            align: 'center' as AlignType,
            editable: false
        }, 
        {
            title: t('描述'),
            dataIndex: language === 'zh' ? 'description_zh' : 'description',
            key: "description",
            editable: false
        }, {
            title: t('操作'),
            dataIndex: 'actions',
            key: "actions",
            width: '10%',
            editable: false,
            render: (_: any, record: ClusterConfigItem) => {
                const editable = isEditing(record)
                return editable ? (
                    <span>
                        <Typography.Link onClick={() => save(record.name)} style={{ marginRight: 8 }}>
                        {t("保存更改")}
                        </Typography.Link>
                        <Typography.Link onClick={cancel}>
                        {t("取消")}
                        </Typography.Link>
                    </span>
                ) : (
                    <Typography.Link disabled={editingName !== ''} onClick={() => edit(record)}>
                      {t("编辑参数")}
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
    editing: boolean;
    dataIndex: string;
    title: any;
    inputType: 'bool' | 'string' | 'int' | 'int64' | 'int32';
    record: ClusterConfigItem;
    index: number;
    children: React.ReactNode;
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
                        (inputType === 'int' || inputType === 'int64' || inputType === 'int32') ? 
                        [{
                            required: true,
                            message: t("请输入参数值")
                        }] 
                        : 
                        []}
                    valuePropName={record.type === 'bool' ? 'checked' : 'value'}
                >
                    {
                        inputType === 'int' || inputType === 'int64' || inputType === 'int32' ? <InputNumber min={0} /> : 
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

export default Cloud
