import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import { AutoComplete, Button, message, Modal, Popconfirm } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'

import useSWR from 'swr'

import { DdbDatabaseError, DdbInt } from 'dolphindb/browser.js'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '../../i18n/index.js'
import { DdbNodeState, model, NodeType } from '../model.js'

import { config } from './model.js'
import { type ClusterNode, type NodesConfig } from './type.js'
import { _2_strs, strs_2_nodes, filter_config, get_category } from './utils.js'
import { GroupAddModal, type GroupConfigDatatype, type GroupNodesDatatype } from './GroupAddModal.js'


export function NodesManagement () {

    const [all_nodes, set_all_nodes] = useState<ClusterNode[]>([ ])
    
    const [search_key, set_search_key] = useState('')
    const [search_value, set_search_value] = useState('')
    
    const { mutate } = useSWR('/get/nodes', async () => config.get_cluster_nodes(), {
        onSuccess: data => {
            const nodes = strs_2_nodes(data.value as any[])
            set_all_nodes(nodes)
        }
    })
    
    const delete_nodes = useCallback(async (node_id: string) => {
        if (!isNaN(Number(node_id))) 
            return 
        
        const nodes = await model.get_cluster_perf(false)
        const [rest] = node_id.split(',')
        const [, , alias] = rest.split(':')
        const this_node = nodes.find(n => n.name === alias)
        if (this_node?.state === DdbNodeState.online) {
            message.error(t('无法移除在线节点，请到集群总览中停止后移除'))
            return 
        }
        if (this_node && this_node.mode === NodeType.computing) // 必须是计算节点才能在线删除
            await model.ddb.call('removeNode', [this_node.name])
        
        const new_nodes = _2_strs(all_nodes).filter(nod => nod !== node_id)
        await config.save_cluster_nodes(new_nodes)
        await mutate()
    }, [all_nodes])
    
    async function save_node_impl ({ rowKey, host, port, alias, mode, group }) {
        try {
            const node_strs = _2_strs(all_nodes)
            let idx = all_nodes.findIndex(node => node.alias === alias)
            // 代理节点先执行 addAgentToController 在线添加
            if (mode === 'agent')
                await config.add_agent_to_controller(host, Number(port), alias)
            if (idx < 0) { // 新增
                await config.save_cluster_nodes([...node_strs, `${host}:${port}:${alias},${mode},${group}`,])
                const add_node_arg = [host, new DdbInt(Number(port)), alias, true, mode]
                if (group)
                    add_node_arg.push(group)
                const perf = await model.get_cluster_perf(false)
                if (perf.findIndex(node => node.name === alias) < 0) // 如果集群中没有该节点
                    await model.ddb.call('addNode', add_node_arg)
                model.message.success(t('新增成功，请到集群总览启动'))
            }
            else { // 修改
                await config.save_cluster_nodes(node_strs.toSpliced(idx, 1, `${host}:${port}:${alias},${mode},${group}`))
                
                model.message.success(t('保存成功，重启集群生效'))
            }
            mutate()
            
            
        } catch (error) {
            // 数据校验不需要展示报错弹窗
            if (error instanceof DdbDatabaseError)
                throw error
        }
    }
    
    const search_filtered_nodes = search_value ? all_nodes.filter(({ alias }) => alias.toLocaleLowerCase().includes(search_value.toLocaleLowerCase())) : all_nodes
    
    const ungrouped_nodes = search_filtered_nodes.filter(node => !node.computeGroup)
    
    const groups = useMemo(() => {
        const compute_groups = new Map()
        search_filtered_nodes.forEach(config => {
          if (config.computeGroup)
              if (!compute_groups.has(config.computeGroup))
                  compute_groups.set(config.computeGroup, 1)
             else
                  compute_groups.set(config.computeGroup, compute_groups.get(config.computeGroup) + 1)
        })
        return (Array.from(compute_groups.keys()) as unknown as string[]).sort()
      }, [search_filtered_nodes])
    
    
    
    async function add_group (form: { group_name: string, group_nodes: GroupNodesDatatype[], group_configs: GroupConfigDatatype[] }) {
        const { group_name, group_nodes, group_configs } = form
        const group_nodes_to_add = group_nodes.filter(node => all_nodes.findIndex(exist_node => exist_node.alias === node.alias) < 0)
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
        const new_nodes = group_nodes_to_add.map(node => `${node.host}:${node.port}:${node.alias},computenode,${group_name}`)
        const new_node_strs = [...node_strs, ...new_nodes]
        const unique_node_strs = Array.from(new Set(new_node_strs))
        await config.save_cluster_nodes(unique_node_strs)
        const perf = await model.get_cluster_perf(false)
        for (const node_to_add of group_nodes_to_add) 
            if (perf.findIndex(node => node.name === node_to_add.alias) < 0)
                await model.ddb.call('addNode', [node_to_add.host, new DdbInt(Number(node_to_add.port)), node_to_add.alias, true, 'computenode', group_name])
        
        await mutate()
    }
    
    
    async function delete_group (group_name: string) {
        const nodes = await model.get_cluster_perf(false)
        const group_nodes = nodes.filter(node => node.computeGroup === group_name)
        let can_delete = group_nodes.findIndex(node => node.state === DdbNodeState.online) < 0
        // for (const node of group_nodes) 
        //     if (node.state === DdbNodeState.online) 
        //         can_delete = false
            
        if (!can_delete) {
            message.error(t('组内有在线节点，请到集群总览中停止节点后移除'))
            return 
        }
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
        
        // 调用删除节点 API
        for (const node of group_nodes)
            await model.ddb.call('removeNode', [node.name])
        
        await mutate()
    }
    
    const group_nodes = groups.map(group => {
        const nodes = search_filtered_nodes.filter(node => node.computeGroup === group)
        return <div key={group}>
            <div key={group} className='group-title'>
                {group} <Button onClick={() => {
                    Modal.confirm({
                        title: t('确认删除'),
                        content: t('确定要删除计算组 {{group}} 吗？', { group }), // 使用占位符替换组名
                        onOk: async () => {
                            await delete_group(group)
                        },
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
            <div className='search-comp'>
                <AutoComplete<string>
                    showSearch
                    placeholder={t('请输入想要查找的节点别名')}
                    optionFilterProp='label'
                    value={search_key}
                    onChange={value => {
                        set_search_key(value)
                    }}
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
                    }, is_group ? {
                        pattern: new RegExp(`^${group}`),
                        message: t('别名必须以组名 ') + group + t(' 开头')
                    } : undefined]
                }
            },
            {
                title: t('类型'),
                dataIndex: 'mode',
                key: 'mode',
                valueType: 'select',
                valueEnum: {
                    computenode: {
                        text: t('计算节点'),
                        value: 'computenode'
                    },
                    ...is_group ?  [ ] : [
                        {
                            text: t('数据节点'),
                            value: 'datanode'
                        },
                        {
                            text: t('控制节点'),
                            value: 'controller',
                        },
                        {
                            text: t('代理节点'),
                            value: 'agent',
                        }
                        
                    ] 
                    
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
