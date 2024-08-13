import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType } from '@ant-design/pro-components'
import { AutoComplete, Button, Modal, Popconfirm } from 'antd'
import { useCallback, useRef, useState } from 'react'

import useSWR from 'swr'

import { DdbDatabaseError } from 'dolphindb/browser.js'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '../../i18n/index.js'
import { model } from '../model.js'

import { config } from './model.js'
import { type ClusterNode, type NodesConfig } from './type.js'
import { _2_strs, strs_2_nodes, filter_config, get_category } from './utils.js'
import { GroupAddModal, type GroupConfigDatatype, type GroupNodesDatatype } from './GroupAddModal.js'


export function NodesManagement () {

    const [all_nodes, set_all_nodes] = useState<ClusterNode[]>([ ])
    
    const [search_key, set_search_key] = useState('')
    const [search_value, set_search_value] = useState('')
    
    
    const actionRef = useRef<ActionType>()
    
    const { mutate } = useSWR('/get/nodes', async () => config.get_cluster_nodes(), {
        onSuccess: data => {
            const nodes = strs_2_nodes(data.value as any[])
            set_all_nodes(nodes)
        }
    })
    
    const delete_nodes = useCallback(async (node_id: string) => {
        const new_nodes = _2_strs(all_nodes).filter(nod => nod !== node_id)
        await config.save_cluster_nodes(new_nodes)
        await mutate()
    }, [all_nodes])
    
    async function save_node_impl ({ rowKey, host, port, alias, mode, group }) {
        try {
            const node_strs = _2_strs(all_nodes)
            let idx = node_strs.indexOf(rowKey as string)
            // 代理节点先执行 addAgentToController 在线添加
            if (mode === 'agent')
                await config.add_agent_to_controller(host, Number(port), alias)
            if (idx === -1) // 新增
                await config.save_cluster_nodes([`${host}:${port}:${alias},${mode},${group}`, ...node_strs])
            else // 修改
                await config.save_cluster_nodes(node_strs.toSpliced(idx, 1, `${host}:${port}:${alias},${mode},${group}`))
            mutate()
            model.message.success(t('保存成功，重启集群生效'))
        } catch (error) {
            // 数据校验不需要展示报错弹窗
            if (error instanceof DdbDatabaseError)
                throw error
        }
    }
    
    const search_filtered_nodes = search_value ? all_nodes.filter(({ alias }) => alias.toLocaleLowerCase().includes(search_value.toLocaleLowerCase())) : all_nodes
    
    const ungrouped_nodes = search_filtered_nodes.filter(node => !node.computeGroup)
    
    const compute_groups = new Map()
    search_filtered_nodes.forEach(config => {
        if (config.computeGroup)
            if (!compute_groups.has(config.computeGroup))
                compute_groups.set(config.computeGroup, 1)
            else
                compute_groups.set(config.computeGroup, compute_groups.get(config.computeGroup) + 1)
                
    })
    
    const groups = (Array.from(compute_groups.keys()) as unknown as string[]).sort()
    
    
    
    async function add_group (form: { group_name: string, group_nodes: GroupNodesDatatype[], group_configs: GroupConfigDatatype[] }) {
        const { group_name, group_nodes, group_configs } = form
        await config.load_configs()
        const configs: Array<[string, NodesConfig]> = [ ]
        for (const config of group_configs) {
            const { name, value } = config
            const qualifier = `${group_name}%`
            const key = qualifier + '.' + name
            configs.push([key, { name, key, value, qualifier, category: get_category(name) }])
        }
        await config.change_configs(configs)
        await config.load_configs()
        const node_strs = _2_strs(all_nodes)
        const new_nodes = group_nodes.map(node => `${node.host}:${node.port}:${node.alias},computenode,${group_name}`)
        const new_node_strs = [...node_strs, ...new_nodes]
        const unique_node_strs = Array.from(new Set(new_node_strs))
        await config.save_cluster_nodes(unique_node_strs)
        await mutate()
    }
    
    async function delete_group (group_name: string) {
        console.log(group_name)
        await config.load_configs()
        const config_map = config.nodes_configs
        const keys_to_delete = [ ]
        for (const key of config_map.keys())
            if (config_map.get(key)?.qualifier === group_name + '%')
                keys_to_delete.push(key)
        await config.delete_configs(keys_to_delete)
        await config.load_configs()
        const new_nodes = all_nodes.filter(node => node.computeGroup !== group_name)
        await config.save_cluster_nodes(_2_strs(new_nodes))
        await mutate()
    }
    
    const group_nodes = groups.map(group => {
        const nodes = search_filtered_nodes.filter(node => node.computeGroup === group)
        return <div key={group}>
            <div key={group} className='group-title'>
                {group} <Button onClick={() => {
                    Modal.confirm({
                        title: t('确认删除'),
                        content: t('确定要删除计算组 ') + group + t(' 吗？'), // 使用占位符替换组名
                        onOk: async () => {
                            await delete_group(group)
                        },
                        onCancel () { },
                    })
                }} type='link'>{t('删除计算组')}</Button>
            </div>
            <NodeTable nodes={nodes} group={group} onSave={save_node_impl} onDelete={delete_nodes} />
        </div>
    })
    
    return <div className='nodes-management'>
        <div className='search-line'>
            <Button
                icon={<ReloadOutlined />}
                onClick={async () => {
                    await mutate()
                    set_search_key('')
                    set_search_value('')
                    model.message.success(t('刷新成功'))
                }}
            >
                {t('刷新')}
            </Button>
            <Button
                icon={<PlusOutlined />}
                onClick={async () => {
                    NiceModal.show(GroupAddModal, { on_save: add_group })
                }}
            >
                {t('新建计算组')}
            </Button>
            <AutoComplete<string>
                showSearch
                placeholder={t('请输入想要查找的节点别名')}
                optionFilterProp='label'
                value={search_key}
                onChange={value => {
                    set_search_key(value)
                }}
                style={{ width: 300, flex: '1' }}
                onKeyDown={e => {
                    if (e.key === 'Enter')
                        set_search_value(search_key)
                }}
                filterOption={filter_config}
                options={all_nodes.map(({ alias }) => ({
                    label: alias,
                    value: alias
                }))} />
            <Button type='primary' icon={<SearchOutlined />} onClick={() => { set_search_value(search_key) }} />
        </div>
        <div className='group-title'>
            {t('未分组节点')}
        </div>
        <NodeTable nodes={ungrouped_nodes} onSave={save_node_impl} onDelete={delete_nodes} />
        {group_nodes}
    </div>
}



interface NodeTableProps {
    nodes: ClusterNode[]
    group?: string
    onSave: (params: any) => Promise<void>
    onDelete: (nodeId: string) => Promise<void>
}

function NodeTable ({ nodes, group, onSave, onDelete }: NodeTableProps) {

    function get_cols (is_group = false) {
        return [
            {
                title: t('别名'),
                dataIndex: 'alias',
                key: 'alias',
                fieldProps: {
                    placeholder: t('请输入别名'),
                },
                formItemProps: {
                    rules: [{
                        required: true,
                        message: t('请输入别名')
                    }]
                }
            },
            {
                title: t('类型'),
                dataIndex: 'mode',
                key: 'mode',
                valueType: 'select',
                valueEnum: {
                    datanode: is_group ? undefined : {
                        text: t('数据节点'),
                        value: 'datanode'
                    },
                    computenode: {
                        text: t('计算节点'),
                        value: 'computenode'
                    },
                    controller: is_group ? undefined : {
                        text: t('控制节点'),
                        value: 'controller',
                    },
                    agent: is_group ? undefined : {
                        text: t('代理节点'),
                        value: 'agent',
                    },
                    
                },
                fieldProps: {
                    placeholder: t('请选择节点类型'),
                },
                formItemProps: {
                    rules: [{
                        required: true,
                        message: t('请选择节点类型')
                    }]
                }
            },
            {
                title: t('主机名 / IP 地址'),
                dataIndex: 'host',
                key: 'host',
                fieldProps: {
                    placeholder: t('请输入主机名 / IP 地址'),
                },
                formItemProps: {
                    rules: [{
                        required: true,
                        message: t('请输入主机名 / IP 地址')
                    }]
                }
            },
            {
                title: t('端口号'),
                dataIndex: 'port',
                key: 'port',
                fieldProps: {
                    placeholder: t('请输入端口号'),
                    type: 'number',
                },
                formItemProps: {
                    rules: [{
                        required: true,
                        message: t('请输入端口号')
                    }]
                }
            },
            {
                title: t('操作'),
                valueType: 'option',
                key: 'actions',
                width: 240,
                render: (text, record, _, action) => [
                    <Button
                        type='link'
                        key='editable'
                        className='mr-btn'
                        onClick={() => {
                            action?.startEditable?.(record.id)
                        }}
                    >
                        {t('编辑')}
                    </Button>,
                    <Popconfirm
                        title={t('确认删除此节点？')}
                        key='delete'
                        onConfirm={async () => onDelete(record.id as string)}>
                        <Button
                            type='link'
                        >
                            {t('删除')}
                        </Button>
                    </Popconfirm>
                ],
            },
        ]
    }
    
    const actionRef = useRef<ActionType>()
    
    return <EditableProTable
        rowKey='id'
        columns={get_cols(!!group) as any}
        actionRef={actionRef}
        recordCreatorProps={
            {
                position: 'bottom',
                record: () => ({
                    id: String(Date.now()),
                    host: '',
                    port: '',
                    alias: '',
                    mode: ''
                }),
                creatorButtonText: t('新增节点'),
                onClick: () => {
                    const tbody = document.querySelector('.ant-table-body')
                    setTimeout(() => tbody.scrollTop = tbody.scrollHeight, 1)
                }
            }
        }
        scroll={{ y: 'calc(100vh - 250px)' }}
        value={nodes}
        editable={
            {
                type: 'single',
                onSave: async (rowKey, { host, port, alias, mode }) => {
                    await onSave({ rowKey, host, port, alias, mode, group: group || '' })
                },
                onDelete: async (_, row) => onDelete(row.id),
                deletePopconfirmMessage: t('确认删除此节点？'),
                saveText:
                    <Button
                        type='link'
                        key='editable'
                        className='mr-btn'
                    >
                        {t('保存')}
                    </Button>,
                deleteText:
                    <Button
                        type='link'
                        key='delete'
                        className='mr-btn'
                    >
                        {t('删除')}
                    </Button>,
                cancelText:
                    <Button
                        type='link'
                        key='cancal'
                    >
                        {t('取消')}
                    </Button>,
            }
        }
    />
}
