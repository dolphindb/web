import './cloud.sass'
import { request_json } from 'xshell/net.browser.js'
import { default as React, useEffect, useState } from 'react'

import { default as dayjs } from 'dayjs'

import ReactJson from 'react-json-view'

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
    Divider,
    Checkbox,
    Space,
    Tag,
    Menu
} from 'antd'


import { ReloadOutlined, SearchOutlined, SwitcherFilled } from '@ant-design/icons'
import type { PresetStatusColorType } from 'antd/lib/_util/colors.js'
import type { AlignType } from 'rc-table/lib/interface.js'

import { delay } from 'xshell/utils.browser.js'

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
import { JSONTree } from 'react-json-tree';
import { useCallback } from 'react'
import Sider from 'antd/lib/layout/Sider.js'
import { Content, Header } from 'antd/lib/layout/layout.js'
import { FC } from 'react'
import { useContext } from 'react'
import cluster from 'cluster'

const { Column, ColumnGroup } = Table;

const { Option } = Select
const { Title, Text, Link } = Typography

const Context_of_tag_indicating_which_page_should_be_display = React.createContext<{ Tagg: string, setTag: (x: 'ClusterDetail' | 'Clusters' | 'Dashboar_For_One_Name_Backup') => any }>({ Tagg: 'Clusters', setTag: ()=>{} })

export function Cloud() {
    const { cluster } = model.use(['cluster'])
    const [tag, setTag] = React.useState('Clusters')

    const [name, setName] = React.useState('')
    return <Context_of_tag_indicating_which_page_should_be_display.Provider
        value={{ Tagg: tag, setTag: setTag }}>
        <Name_of_backup_item.Provider
            value={{ name: name, setName: setName }}
        >
            <TestComp></TestComp>
        </Name_of_backup_item.Provider>
    </Context_of_tag_indicating_which_page_should_be_display.Provider>

}

const Name_of_backup_item = React.createContext<{ name: string, setName: (x: string) => any }>({name:'none', setName:x=>{}})
const TestComp = (() => {
    const { name, setName } = React.useContext(Name_of_backup_item)
    function switchResult(tag: string) {
        switch (tag) {
            case 'ClusterDetail':
                return <ClusterDetail></ClusterDetail>
            case 'Clusters':
                return <Clusters></Clusters>
            case 'Dashboar_For_One_Name_Backup':
                return <Dashboar_For_One_Name_Backup name={name}></Dashboar_For_One_Name_Backup>
            default:
                return <div></div>
        }
    }
    const { Tagg, setTag } = useContext(Context_of_tag_indicating_which_page_should_be_display)

    return switchResult(Tagg)
})

/** Type of cluster detail field: 'info' or 'config' */
type FieldType = 'info' | 'config' | 'monitor' | 'backup'

function ClusterDetail() {
    const { cluster } = model.use(['cluster'])

    const { name } = cluster

    const [field, set_field] = useState<FieldType>('info')

    const fields: FieldType[] = ['info', 'config', 'monitor', 'backup']

    const { Tagg, setTag } = useContext(Context_of_tag_indicating_which_page_should_be_display)

    const Content = {
        info: <InfoTab />,
        config: <ClusterConfigs cluster={cluster} />,
        backup: <Show_backup_restore_sched />
    }

    return (
        <div className='cluster'>
            <PageHeader
                className='cluster-header'
                title={
                    <Title level={3}>{name}</Title>
                }
                onBack={() => {
                    model.set({ cluster: undefined })
                    setTag('Clusters')
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
                    <ClusterStatus {...status} />
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
                {services.Controller && <Descriptions.Item label={t('控制节点')}>
                    <ServiceNode {...services.Controller} />
                </Descriptions.Item>}
                {services.Datanode ?
                    <Descriptions.Item label={t('数据节点')}>
                        <ServiceNode {...services.Datanode} />
                    </Descriptions.Item>
                    :
                    <Descriptions.Item label={t('单机节点')}>
                        <ServiceNode {...services.Standalone} />
                    </Descriptions.Item>
                }
                {services.Computenode && <Descriptions.Item label={t('计算节点')}>
                    <ServiceNode {...services.Computenode} />
                </Descriptions.Item>}
            </Descriptions>

            <ClusterNodes cluster={cluster} />
        </>
    )
}


function Clusters() {
    const { clusters, versions, namespaces } = model.use(['clusters', 'versions', 'namespaces'])

    const [create_panel_visible, set_create_panel_visible] = useState(false)

    const [queries, set_queries] = useState<QueryOptions>(default_queries)

    const { Tagg, setTag } = useContext(Context_of_tag_indicating_which_page_should_be_display)

    useEffect(() => {
        let flag = true
            ; (async () => {
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
                icon={<ReloadOutlined />}
                onClick={() => {
                    model.get_clusters(queries)
                }}
            >{t('刷新')}</Button>
        </div>


        <Table
            className='list'
            columns={[
                ...namespaces.length >= 2 ? [{
                    title: t('命名空间'),
                    dataIndex: 'namespace',
                    sorter: { multiple: 2 },
                    defaultSortOrder: 'ascend',
                    sortDirections: ['ascend', 'descend', 'ascend'],
                    filters: namespaces.map(ns => ({
                        text: ns.name,
                        value: ns.name
                    }))
                } as any] : [],
                {
                    title: t('名称'),
                    dataIndex: 'name',
                    sorter: { multiple: 1 },
                    defaultSortOrder: 'ascend',
                    sortDirections: ['ascend', 'descend', 'ascend'],
                    filterIcon: <SearchOutlined />,
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
                                setTag('ClusterDetail')
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
                    render(value, cluster) {
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
                let queries = {} as QueryOptions
                let sortField: string[] = []
                let orders: string[] = []


                if (Array.isArray(sorters)) {
                    sorters.sort((l, r) =>
                        -((l.column.sorter as any).multiple - (r.column.sorter as any).multiple)
                    )

                    for (let i = 0; i < sorters.length; i++) {
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
                form={form}
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



                {mode === 'cluster' && <>
                    <Form.Item name='cluster_type' label={t('集群类型')} rules={[{ required: true }]}>
                        <Select>
                            <Option value='singlecontroller'>{t('单控制节点')}</Option>
                            <Option value='multicontroller'>{t('多控制节点')}</Option>
                        </Select>
                    </Form.Item>

                    <Divider orientation='left'>{t('控制节点')}</Divider>

                    {cluster_type === 'multicontroller' && <Form.Item name={['controller', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                        <InputNumber min={3} precision={0} />
                    </Form.Item>}

                    <Form.Item name={['controller', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['controller', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['controller', 'port']} label={t('端口')} rules={[{ required: true }]}>
                        <InputNumber min={0} />
                    </Form.Item>

                    <Form.Item name={['controller', 'resources', 'cpu']} label='CPU' rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter={t('核')} />
                    </Form.Item>

                    <Form.Item name={['controller', 'resources', 'memory']} label={t('内存')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi' />
                    </Form.Item>
                </>}

                <Divider orientation='left'>{t('数据节点')}</Divider>

                {mode === 'cluster' && <Form.Item name={['datanode', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
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
                    <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter={t('核')} />
                </Form.Item>

                <Form.Item name={['datanode', 'resources', 'memory']} label={t('内存')} rules={[{ required: true }]}>
                    <InputNumber min={0} placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi' />
                </Form.Item>

                {mode === 'cluster' && <>
                    <Divider orientation='left'>{t('计算节点')}</Divider>

                    <Form.Item name={['computenode', 'replicas']} label={t('节点数')} rules={[{ required: true }]}>
                        <InputNumber min={0} precision={0} />
                    </Form.Item>

                    <Form.Item name={['computenode', 'data_size']} label={t('数据存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['computenode', 'log_size']} label={t('日志存储空间')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter='Gi' />
                    </Form.Item>

                    <Form.Item name={['computenode', 'port']} label={t('端口')} rules={[{ required: true }]}>
                        <InputNumber min={0} />
                    </Form.Item>

                    <Form.Item name={['computenode', 'resources', 'cpu']} label='CPU' rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.1, 1, 2, ...' addonAfter={t('核')} />
                    </Form.Item>

                    <Form.Item name={['computenode', 'resources', 'memory']} label={t('内存')} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder='0.5, 1, 2, 4, ...' addonAfter='Gi' />
                    </Form.Item>
                </>}
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

function ServiceNode({
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

function Mode({
    cluster: { mode, cluster_type }
}: {
    cluster?: Cluster
}) {
    return <>{`${modes[mode]}${mode === 'standalone' ? '' : ` (${cluster_types[cluster_type]})`}`}</>
}


const statuses: Record<string, PresetStatusColorType> = {
    Available: 'success',
    Running: 'success',
    Progressing: 'processing',
}


function ClusterNodes({
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
        controllers: [],
        datanodes: [],
        computenodes: []
    })

    async function get_nodes() {
        set_nodes(
            await model.get_cluster_nodes(cluster)
        )
    }

    useEffect(() => {
        let flag = true
            ; (async () => {
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


function NodeList({
    cluster,
    mode,
    nodes,
    get_nodes,
}: {
    cluster: Cluster,
    mode: 'controller' | 'datanode' | 'computenode'
    nodes: ClusterNode[]
    get_nodes: Function
}) {
    return <Table
        className='config-table'
        rowKey={node => `${node.namespace}.${node.name}`}
        dataSource={nodes}
        pagination={false}
        columns={[
            {
                title: t('名称'),
                dataIndex: 'name',
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
            },
            {
                title: t('内存'),
                dataIndex: ['resources', 'limits', 'memory'],
            },
            {
                title: t('数据储存空间'),
                dataIndex: 'datasize',
                render: () => cluster[mode]?.dataSize
            },
            {
                title: t('日志储存空间'),
                dataIndex: 'logsize',
                render: () => cluster[mode]?.logSize
            },
            {
                title: t('创建时间'),
                dataIndex: 'creationTimestamp',
                render: (creationTimestamp: ClusterNode['creationTimestamp']) =>
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
                render(_, node) {
                    return <>
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
                    </>
                }
            }
        ]}
    />
}

const phases = {
    Available: '运行正常',
    Ready: '准备中',
    Progressing: '准备中',
    Unschedulable: '等待调度',
    Unavailable: '故障',
    Unknown: '未知',
    Running: '运行中'
} as const

function ClusterStatus({
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

function ClusterConfigs({
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

    const onConfigChange = (newItem: Partial<ClusterConfigItem> & { name: string }, type: ConfigType) => {
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
        if (index > -1) {
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
                onCancel={() => { setSubmitPopVisible(false) }}
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
    onConfigChange: (config: Partial<ClusterConfigItem> & { name: string }, type: ConfigType) => void,
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
            onConfigChange(config as Partial<ClusterConfigItem> & { name: string }, type)
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
                                    message: t('请输入参数值')
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


const list_of_namespace_example = [
    {
        "name": "api-test-backup",
        "createTimestamp": "2022-08-22T14:57:46+08:00",
        "phase": "Complete"
    },
    {
        "name": "api-test-backup-sched202046f1-b27e-4af5-8f75-4199af7d995e",
        "createTimestamp": "2022-08-22T09:40:04+08:00",
        "phase": "Complete"
    },
    {
        "name": "api-test-backup-sched3172b86b-ac35-4e64-8c20-a2954adb99e0",
        "createTimestamp": "2022-08-22T09:30:04+08:00",
        "phase": "Complete"
    },
    {
        "name": "api-test-backup-sched3bbc7312-f15b-45e8-9931-24a4f7dddb18",
        "createTimestamp": "2022-08-22T09:45:04+08:00",
        "phase": "Complete"
    },
    {
        "name": "api-test-backup-sched4304a653-f1bc-483d-98e2-16ea4d013de2",
        "createTimestamp": "2022-08-22T09:50:04+08:00",
        "phase": "Complete"
    },
    {
        "name": "api-test-backup-scheda0b85fb7-4a01-4666-a37d-fbc96e054a16",
        "createTimestamp": "2022-08-22T09:35:04+08:00",
        "phase": "Complete"
    }
]

function Show_backup_restore_sched (){
    const items = [{label: 'backup', key:0},{label:'restore',key:1},{lable:'sched',key:2}]
    return <Layout>
        <Header style={{padding:0}}>
            <Menu items={items} mode='horizontal' theme='light' ></Menu>
        </Header>
        <Layout>
            <Content>
                <Backup_List_of_Namespace></Backup_List_of_Namespace>
            </Content>
        </Layout>
    </Layout>
}


//https://stackoverflow.com/questions/46240647/react-how-to-force-a-function-component-to-render
function useForceUpdate(){
    const [value, setValue] = useState(0); // integer state
    return () => setValue(value => value + 1); // update state to force render
    // An function that increment 👆🏻 the previous state like here 
    // is better than directly setting `value + 1`
}

function Backup_List_of_Namespace() {
    //const [current_display_name, set_current_name] = useState<string>('')
    const [detail_of_name, setDetail] = useState({})
    const { name, setName } = React.useContext(Name_of_backup_item)
    const { Tagg, setTag } = useContext(Context_of_tag_indicating_which_page_should_be_display)

    const [loading, setLoading] = useState(false);
    const [backup_open, backup_setOpen] = useState(false);
    const [delete_open, delete_setOpen] = useState(false);
    const [restore_open, restore_setOpen] = useState(false);
    const [sched_open, sched_setOpen] = useState(false);

    const [config_form] = Form.useForm()
    const [restore_form] = Form.useForm()
    const [sched_form] = Form.useForm()

    const [fetched_list_of_namesace, setData] = useState<typeof list_of_namespace_example>( list_of_namespace_example)
    const [current_manipulate_item_name, set_current_name] = useState<string>('')
    const forceUpdate = useForceUpdate()
    var [data_of_current_manipulating_name, set_current_data] = useState<typeof example_data_of_backup_return.data| undefined>()
    
    async function fetch_namelist_of_current_namespace () {
        const data = await request_json(`v1/backup/backups/${model.cluster.namespace}`)
        setData(data)
    }
    useEffect(
        ()=>{
            fetch_namelist_of_current_namespace()
        },[]
    )

    return <>
        <Layout style={{ height: '100vh', overflow: 'auto' }}>
            <Layout.Sider
                width={'100%'}
                theme='light'
            >
                <Table dataSource={fetched_list_of_namesace.map(
                    data_item => {
                        return {
                            name: <Link onClick={() => {
                                setName(data_item.name)
                                setTag('Dashboar_For_One_Name_Backup')
                            }}>{data_item.name}</Link>, 
                            createTimestamp: data_item.createTimestamp,
                            phase: data_item.phase, 
                            delete:<Popconfirm
                            title='You sure to delete?'
                            onConfirm={() => {
                                request_json(`/v1/backup/backups/${model.cluster.namespace}/${data_item.name}`,{method:'delete'})
                                forceUpdate()
                            }}
                            onCancel={()=>{}}
                            >
                                <a href="#">Delete</a>
                            </Popconfirm>,
                            restore:<Link
                            onClick={async () => {
                                const data = (await request_json(`/v1/backup/backups/${model.cluster.namespace}/${data_item.name}`) as typeof example_data_of_backup_return).data
                                set_current_data(data)
                                set_current_name(data_item.name)
                                restore_setOpen(true)
                            }}>
                                {'Add restore'}
                            </Link>,
                            sched:<Link
                            onClick={() => {
                                sched_setOpen(true)
                            }}>
                                {'Add sched'}
                            </Link>
                        }
                    }
                )}
                    pagination={false}
                >
                    <Column
                        title={"Name"}
                        key='name'
                        dataIndex={'name'}
                    />
                    <Column
                        title={"TimeStamp"}
                        key='createTimestamp'
                        dataIndex={'createTimestamp'}
                    />
                    <Column
                        title={"Phase"}
                        key='phase'
                        dataIndex={'phase'}
                    />
                    <Column
                        title={'Delete'}
                        key='delete'
                        dataIndex={'delete'}
                    />
                    <Column
                        title={'restore'}
                        key='restore'
                        dataIndex={'restore'}
                    />
                    <Column
                        title={'sched'}
                        key='sched'
                        dataIndex={'sched'}
                    />
                </Table>
            </Layout.Sider>
            {/*}
            <Layout.Content>
                <JSONTree
                    data={detail_of_name}
                    theme={theme}
                    invertTheme={false}
                ></JSONTree>
            </Layout.Content>
                */}
        </Layout>

        <Button style={{ position: 'absolute', right: 100, bottom: 100 }} type='primary' onClick={()=>{backup_setOpen(true)}} >添加配置</Button>
        
        {/**add backup */}
        <Modal
            open={backup_open}
            title="Add config"
            onCancel={()=>{backup_setOpen(false)}}
            footer={[
                <Button key="back" onClick={()=>{backup_setOpen(false)}}>
                    {t('取消')}
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={ async () => {
                    const data_to_post = await config_form.validateFields()
                    const { name, namespace, cleanPolicy, remoteType, sourceName, dataSource, port, host } = data_to_post
                    request_json('v1/backup/backups', {
                        body: {
                            "name": name,
                            "namespace": namespace,
                            "spec": {
                                "cleanPolicy": cleanPolicy,
                                "prefix": "backup",
                                "forceDir": "schedbackup",
                                "remoteType": remoteType,
                                "dataSource": dataSource,
                                "sourceName": sourceName,
                                "server": {
                                    "port": port,
                                    "host": host,
                                    "usedId": "admin",
                                    "password": "123456"
                                }
                            }
                        },
                        method: 'post'
                    })
                    backup_setOpen(false)
                }}>
                    {t('提交')}
                </Button>
            ]}
        >
            <Form
                form={config_form}
            >
                <Form.Item
                    name={'namespace'}
                    label={t('命名空间')}
                >
                    <Input readOnly={true}></Input>
                </Form.Item>

                <Form.Item
                    name={'name'}
                    label={t('名字')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'cleanPolicy'}
                    label={t('清除策略')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'remoteType'}
                    label={t('远程类型')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('数据源')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('源流名称')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'host'}
                    label={'主机'}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'port'}
                    label={'端口'}
                >
                    <Input ></Input>
                </Form.Item>


            </Form>
        </Modal>
        
        {/**add restore */}
        <Modal
            open={restore_open}
            title="Add restore"
            onCancel={()=>{restore_setOpen(false)}}
            footer={[
                <Button key="back" onClick={()=>{restore_setOpen(false)}}>
                    {t('取消')}
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={ async () => {
                    const data_to_post = await restore_form.validateFields()
                    const { name, namespace, cleanPolicy, remoteType, sourceName, dataSource, port, host } = data_to_post
                    request_json('v1/backup/backups', {
                        body: {
                            "name": name,
                            "namespace": namespace,
                            "spec": {
                                "cleanPolicy": cleanPolicy,
                                "prefix": "backup",
                                "forceDir": "schedbackup",
                                "remoteType": remoteType,
                                "dataSource": dataSource,
                                "sourceName": sourceName,
                                "server": {
                                    "port": port,
                                    "host": host,
                                    "usedId": "admin",
                                    "password": "123456"
                                }
                            }
                        },
                        method: 'post'
                    })
                    restore_setOpen(false)
                }}>
                    {t('提交')}
                </Button>
            ]}
        >
            <Form
                form={restore_form}
                initialValues={function () {
                    const data = data_of_current_manipulating_name
                    if (data)
                        return{
                            namespace: model.cluster.namespace,
                            name: current_manipulate_item_name,
                            cleanPolicy: data.spec.cleanPolicy,
                            remoteType: data.spec.remoteType,
                            dataSource: data.spec.dataSource,
                            sourceName: data.spec.sourceName,
                            host: data.spec.conn.host,
                            port: data.spec.conn.port
                        }
                    
                }()}
            >
                <Form.Item
                    name={'namespace'}
                    label={t('命名空间')}
                >
                    <Input readOnly={true}></Input>
                </Form.Item>

                <Form.Item
                    name={'name'}
                    label={t('名字')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'cleanPolicy'}
                    label={t('清除策略')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'remoteType'}
                    label={t('远程类型')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('数据源')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('源流名称')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'host'}
                    label={'主机'}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'port'}
                    label={'端口'}
                >
                    <Input ></Input>
                </Form.Item>


            </Form>
        </Modal>

        {/**add sched */}
        <Modal
            open={sched_open}
            title="Add sched"
            onCancel={()=>{sched_setOpen(false)}}
            footer={[
                <Button key="back" onClick={()=>{sched_setOpen(false)}}>
                    {t('取消')}
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={ async () => {
                    const data_to_post = await sched_form.validateFields()
                    const { name, namespace, cleanPolicy, remoteType, sourceName, dataSource, port, host } = data_to_post
                    request_json('v1/backup/backups', {
                        body: {
                            "name": name,
                            "namespace": namespace,
                            "spec": {
                                "cleanPolicy": cleanPolicy,
                                "prefix": "backup",
                                "forceDir": "schedbackup",
                                "remoteType": remoteType,
                                "dataSource": dataSource,
                                "sourceName": sourceName,
                                "server": {
                                    "port": port,
                                    "host": host,
                                    "usedId": "admin",
                                    "password": "123456"
                                }
                            }
                        },
                        method: 'post'
                    })
                    sched_setOpen(false)
                }}>
                    {t('提交')}
                </Button>
            ]}
        >
            <Form
                form={sched_form}
            >
                <Form.Item
                    name={'namespace'}
                    label={t('命名空间')}
                >
                    <Input readOnly={true}></Input>
                </Form.Item>

                <Form.Item
                    name={'name'}
                    label={t('名字')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'cleanPolicy'}
                    label={t('清除策略')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'remoteType'}
                    label={t('远程类型')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('数据源')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('源流名称')}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'host'}
                    label={'主机'}
                >
                    <Input ></Input>
                </Form.Item>

                <Form.Item
                    name={'port'}
                    label={'端口'}
                >
                    <Input ></Input>
                </Form.Item>


            </Form>
        </Modal>
        
        
    </>
}

const example_data_of_backup_return = {
    "code": 0,
    "data": {
        "spec": {
            "toolImage": "dolphindb.io/backup:v1.0",
            "cleanPolicy": "Retain",
            "remoteType": "nfs",
            "dataSource": "nfs",
            "sourceName": "remote_nfs",
            "jobResources": {},
            "storageResources": {},
            "securityContext": {
                "capabilities": {
                    "add": [
                        "SYS_ADMIN"
                    ]
                },
                "privileged": true
            },
            "conn": {
                "host": "192.168.0.72",
                "port": "31579",
                "usedId": "admin",
                "password": "123456"
            }
        },
        "status": {
            "timeStarted": "2022-08-22T06:57:46Z",
            "timeCompleted": "2022-08-22T07:01:49Z",
            "phase": "Complete",
            "conditions": [
                {
                    "type": "Scheduled",
                    "status": "True",
                    "lastTransitionTime": "2022-08-22T06:57:46Z",
                    "reason": "Scheduled",
                    "message": "Backup"
                },
                {
                    "type": "Running",
                    "status": "True",
                    "lastTransitionTime": "2022-08-22T06:57:46Z",
                    "reason": "Running"
                },
                {
                    "type": "Complete",
                    "status": "True",
                    "lastTransitionTime": "2022-08-22T07:01:49Z",
                    "reason": "Succeeded"
                }
            ]
        }
    },
    "msg": "api-test-backup"
}

const Dashboar_For_One_Name_Backup: FC<{ name: string }> = (props) => {
    const { cluster } = model.use(['cluster'])
    const { namespace } = cluster
    const { Tagg, setTag } = useContext(Context_of_tag_indicating_which_page_should_be_display)
    const [data, setData] = useState<typeof example_data_of_backup_return.data>()
    async function fetch_data() {
        const data = await request_json(`/v1/backup/backups/${namespace}/${props.name}`)
        setData(data.data)
    }

    useEffect(() => {
        fetch_data()
    }, [])

    //Modal part
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const [form] = Form.useForm()

    const showModal = () => {
        setOpen(true);
    };

    const handleSubmit = async () => {
        const data_to_post = await form.validateFields()
        const { name, namespace, cleanPolicy, remoteType, sourceName, dataSource, port, host } = data_to_post
        request_json('v1/backup/backups', {
            body: {
                "name": name,
                "namespace": namespace,
                "spec": {
                    "cleanPolicy": cleanPolicy,
                    "prefix": "backup",
                    "forceDir": "schedbackup",
                    "remoteType": remoteType,
                    "dataSource": dataSource,
                    "sourceName": sourceName,
                    "server": {
                        "port": port,
                        "host": host,
                        "usedId": "admin",
                        "password": "123456"
                    }
                }
            },
            method: 'post'
        })
        setOpen(false)
    };

    const handleCancel = () => {
        setOpen(false);
    };

    if(!data){
        return <div>No data</div>
    }
    return <div className='cluster'>
        <PageHeader
            className='cluster-header'
            title={
                <Title level={3}>{props.name}</Title>
            }
            onBack={() => {
                setTag('ClusterDetail')
            }}
        />

        <Descriptions
            title={
                <Title level={4}>{t('信息')}</Title>
            }
            column={2}
            bordered
        >
            <Descriptions.Item label={t('命名空间')}>{namespace}</Descriptions.Item>
            <Descriptions.Item label={t('名字')}>{props.name}</Descriptions.Item>
        </Descriptions>

        <Descriptions
            title={
                <Title level={4}>{t('备份信息')}</Title>
            }
            column={2}
            bordered
        >
            <Descriptions.Item label={t('清除策略')}>{data.spec.cleanPolicy}</Descriptions.Item>
            <Descriptions.Item label={t('远程类型')}>{data.spec.remoteType}</Descriptions.Item>
            <Descriptions.Item label={t('数据源')}>{data.spec.dataSource}</Descriptions.Item>
            <Descriptions.Item label={t('源流名称')}>{data.spec.sourceName}</Descriptions.Item>
        </Descriptions>

        <Descriptions
            title={
                <Title level={4}>{t('连接信息')}</Title>
            }
            column={2}
            bordered
        >
            <Descriptions.Item label={t('主机')}>{data.spec.conn.host}</Descriptions.Item>
            <Descriptions.Item label={t('端口')}>{data.spec.conn.port}</Descriptions.Item>
        </Descriptions>

        <Button style={{ position: 'absolute', right: 100, bottom: 100 }} type='primary' onClick={showModal} >根据现有配置添加备份</Button>
        <Modal
            open={open}
            title="Title"
            onCancel={handleCancel}
            footer={[
                <Button key="back" onClick={handleCancel}>
                    {t('取消')}
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    {t('提交')}
                </Button>
            ]}
        >
            <Form
                form={form}
                initialValues={{
                    namespace: namespace,
                    name: props.name,
                    cleanPolicy: data.spec.cleanPolicy,
                    remoteType: data.spec.remoteType,
                    dataSource: data.spec.dataSource,
                    sourceName: data.spec.sourceName,
                    host: data.spec.conn.host,
                    port: data.spec.conn.port
                }}
            >
                <Form.Item
                    name={'namespace'}
                    label={t('命名空间')}
                >
                    <Input readOnly={true} defaultValue={namespace}></Input>
                </Form.Item>

                <Form.Item
                    name={'name'}
                    label={t('名字')}
                >
                    <Input defaultValue={props.name}></Input>
                </Form.Item>

                <Form.Item
                    name={'cleanPolicy'}
                    label={t('清除策略')}
                >
                    <Input defaultValue={data.spec.cleanPolicy}></Input>
                </Form.Item>

                <Form.Item
                    name={'remoteType'}
                    label={t('远程类型')}
                >
                    <Input defaultValue={data.spec.remoteType}></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('数据源')}
                >
                    <Input defaultValue={data.spec.dataSource}></Input>
                </Form.Item>

                <Form.Item
                    name={'dataSource'}
                    label={t('源流名称')}
                >
                    <Input defaultValue={data.spec.sourceName}></Input>
                </Form.Item>

                <Form.Item
                    name={'host'}
                    label={'主机'}
                >
                    <Input defaultValue={data.spec.conn.host}></Input>
                </Form.Item>

                <Form.Item
                    name={'port'}
                    label={'端口'}
                >
                    <Input defaultValue={data.spec.conn.port}></Input>
                </Form.Item>


            </Form>
        </Modal>

    </div>
}

