import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { EditableProTable, type ActionType } from '@ant-design/pro-components'
import { AutoComplete, Button, Popconfirm } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'

import useSWR from 'swr'

import { DdbDatabaseError, DdbInt } from 'dolphindb/browser.js'

import NiceModal from '@ebay/nice-modal-react'

import { t } from '../../i18n/index.js'
import { DdbNodeState, model, NodeType } from '../model.js'

import { RefreshButton } from '@/components/RefreshButton/index.tsx'

import { config } from './model.js'
import { type ClusterNode, type NodesConfig } from './type.js'
import { _2_strs, strs_2_nodes, filter_config, get_category } from './utils.ts'
import { GroupAddModal, type GroupConfigDatatype, type GroupNodesDatatype } from './GroupAddModal.js'


export function NodesManagement () {
    const [search_key, set_search_key] = useState('')
    const [search_value, set_search_value] = useState('')
    
    const { mutate, data } = useSWR('/get/nodes', async () => {
            const data = await config.get_cluster_nodes()
            const nodes = strs_2_nodes(data)
            console.log(_2_strs(nodes))
            return { nodes, data_key: (new Date()).toISOString() }
        }
    )
    
    const all_nodes: ClusterNode[] = data?.nodes ?? [ ]
    const data_key = data?.data_key ?? ''
    
    const delete_nodes = useCallback(async (node_id: string) => {
        if (!isNaN(Number(node_id)))
            return
            
        const nodes = await model.get_cluster_perf(false)
        const [rest] = node_id.split(',')
        const [, , alias] = rest.split(':')
        const this_node = nodes.find(n => n.name === alias)
        if (this_node?.state === DdbNodeState.online) {
            model.message.error(t('无法移除在线节点，请到集群总览中停止后移除'))
            return
        }
        let is_compute_node = false
        if (this_node && this_node.mode === NodeType.computing) { // 必须是计算节点才能在线删除
            await model.ddb.call('removeNode', [this_node.name])
            model.message.success(t('移除节点成功'))
            is_compute_node = true
        }    
        const new_nodes = _2_strs(all_nodes).filter(nod => nod !== node_id)
        await config.save_cluster_nodes(new_nodes)
        await mutate()
        if (!is_compute_node) 
            model.message.success(t('移除节点配置成功，重启集群生效'))
        
    }, [all_nodes])
    
    async function save_node_impl ({ rowKey, host, port, alias, mode, group, zone }, changed_alias, is_add, old_alias) {
        try {
            
            // 1、检查别名是否重复
            if ((changed_alias || is_add) && all_nodes.findIndex(node => node.alias === alias) >= 0) {
                model.message.error(t('该节点别名已存在，无法修改或添加'))
                throw new Error(t('该节点别名已存在，无法修改或添加'))
            }
            
            const node_strs = _2_strs(all_nodes)
            // 2、检查主机名和端口号是否重复
            const duplicate = all_nodes.find(node => node.host === host && node.port === port)
            // 如果找到重复的节点，除非找到的这个恰好就是我们正在修改的节点，否则报错
            if (duplicate && !(old_alias === duplicate.alias)) {
                model.message.error(t('集群中已存在主机名和端口号相同的节点'))
                throw new Error(t('集群中已存在主机名和端口号相同的节点'))
            }
            
            if (is_add) { // 新增
                const add_node_arg = [host, new DdbInt(Number(port)), alias, true, mode]
                if (group)
                    add_node_arg.push(group)
                else
                    add_node_arg.push('')
                add_node_arg.push(zone)
                const perf = await model.get_cluster_perf(false)
                if (perf.findIndex(node => node.name === alias) < 0) // perf 里面没有相同别名的节点，才可以添加
                    if (mode === 'agent')
                        try {
                            await config.add_agent_to_controller(host, Number(port), alias)
                        } catch (err) {
                            model.message.error(t('新增节点失败，服务端报错：') + err.message)
                            throw new Error(t('新增节点失败，服务端报错：') + err.message)
                        }
                    else if (mode !== 'controller')
                        try {
                            await model.ddb.call('addNode', add_node_arg)
                            model.message.success(t('新增节点成功，请到集群总览启动'))
                        } catch (err) {
                            model.message.error(t('新增节点失败，服务端报错：') + err.message)
                            throw new Error(t('新增节点失败，服务端报错：') + err.message)
                        }        
                await config.save_cluster_nodes([...node_strs, `${host}:${port}:${alias},${mode},${group},${zone}`,])    
                if (mode === 'controller')
                    model.message.success(t('保存成功，重启集群生效'))
            }
            else  // 修改
                 {
                    const idx = all_nodes.findIndex(node => node.alias === old_alias)
                    await config.save_cluster_nodes(node_strs.toSpliced(idx, 1, `${host}:${port}:${alias},${mode},${group},${zone}`))
                    model.message.success(t('保存成功，重启集群生效'))
                }
            mutate()
        } catch (error) {
            // 数据校验不需要展示报错弹窗
            if (error instanceof DdbDatabaseError)
                throw error
            throw new Error(error)
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
    
    
    
    async function add_group (form: { group_name: string, group_nodes: GroupNodesDatatype[], group_configs: GroupConfigDatatype[] }): Promise<{ success: boolean, message?: string }> {
        const { group_name, group_nodes, group_configs } = form
        const group_nodes_to_add = group_nodes.filter(node => all_nodes.findIndex(exist_node => exist_node.alias === node.alias) < 0)
        const perf = await model.get_cluster_perf(false)
        for (const node_to_add of group_nodes_to_add)
            if (perf.findIndex(node => node.name === node_to_add.alias) < 0)
                try {
                    await model.ddb.call('addNode', [node_to_add.host, new DdbInt(Number(node_to_add.port)), node_to_add.alias, true, 'computenode', group_name, node_to_add.zone])
                } catch (e) {
                    model.message.error(t('新增节点失败，服务端报错：') + e.message)
                    return { success: false, message: t('新增节点失败，服务端报错：') + e.message }
                }
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
        const new_nodes = group_nodes_to_add.map(node => `${node.host}:${node.port}:${node.alias},computenode,${group_name},${node.zone}`)
        const new_node_strs = [...node_strs, ...new_nodes]
        const unique_node_strs = Array.from(new Set(new_node_strs))
        await config.save_cluster_nodes(unique_node_strs)
        
                
        await mutate()
        return { success: true }
    }
    
    
    async function delete_group (group_name: string) {
        const nodes = await model.get_cluster_perf(false)
        const group_nodes = nodes.filter(node => node.computeGroup === group_name)
        let can_delete = group_nodes.findIndex(node => node.state === DdbNodeState.online) < 0
        // for (const node of group_nodes) 
        //     if (node.state === DdbNodeState.online) 
        //         can_delete = false
        
        if (!can_delete) {
            model.message.error(t('组内有在线节点，请到集群总览中停止节点后移除'))
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
                {group} 
                <Button
                    style={{ marginLeft: 'auto' }}
                    icon={<DeleteOutlined />}
                    onClick={() => {
                        model.modal.confirm({
                            title: t('确定要删除计算组 {{group}} 吗？', { group }), // 使用占位符替换组名
                            onOk: async () => {
                                await delete_group(group)
                            },
                            okButtonProps: { danger: true }
                        })
                    }}
                    danger
                >{t('删除计算组')}</Button>
            </div>
            <NodeTable key={`${data_key}_group_${group}`} nodes={nodes} group={group} onSave={save_node_impl} onDelete={delete_nodes} />
        </div>
    })
    
    return <div className='nodes-management'>
        <div className='search-line'>
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
                <Button icon={<SearchOutlined />} onClick={() => { set_search_value(search_key) }} />
            </div>
            <Button
                icon={<PlusOutlined />}
                type='primary'
                onClick={async () => {
                    NiceModal.show(GroupAddModal, { on_save: add_group })
                }}
            >
                {t('新建计算组')}
            </Button>
            <RefreshButton
                onClick={async () => {
                    await mutate()
                    set_search_key('')
                    set_search_value('')
                    model.message.success(t('刷新成功'))
                }}
           />
        </div>
        <div className='table-padding'>
            {/* 被搜索筛选了，且没有非计算组节点，不展示 */}
            {(ungrouped_nodes.length > 0 || search_value === '') && <NodeTable key={`${data_key}_ungrouped_nodes`} nodes={ungrouped_nodes} onSave={save_node_impl} onDelete={delete_nodes} />}
            {group_nodes}
        </div>
    </div>
}



interface NodeTableProps {
    nodes: ClusterNode[]
    group?: string
    onSave: (params: any, changed_alias: boolean, is_add: boolean, old_alias: string) => Promise<void> // 如果节点名变了，需要特别检查是否有存在的别名
    onDelete: (nodeId: string) => Promise<void>
}

function NodeTable ({ nodes, group, onSave, onDelete }: NodeTableProps) {
    function get_cols (is_group = false) {
        const alias_rule: { required?: boolean, pattern?: RegExp, message?: string, validator?: (_: any, value: string) => Promise<void> }[] = [{
            required: true,
            message: t('请输入别名')
        }, {
            pattern: /^\S+$/,
            message: t('别名不能包含空格')
        }]
        
        if (is_group)
            alias_rule.push(
                {
                    validator: async (_, value) => {
                        if (!value.startsWith(group))
                            throw new Error(t('别名必须以组名 {{group}} 开头', { group }))
                    },
                    message: t('别名必须以组名 {{group}} 开头', { group })
                }
            )
            
        return [
            {
                title: t('节点别名'),
                dataIndex: 'alias',
                key: 'alias',
                fieldProps: {
                    placeholder: t('请输入别名'),
                },
                formItemProps: {
                    rules: alias_rule
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
                    ...is_group ? { } : {
                        datanode: {
                            text: t('数据节点'),
                            value: 'datanode'
                        },
                        controller: {
                            text: t('控制节点'),
                            value: 'controller',
                        },
                        agent: {
                            text: t('代理节点'),
                            value: 'agent',
                        }
                    }
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
                    }, {
                        pattern: /^\S+$/,
                        message: t('主机名 / IP 地址不能包含空格')
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
                title: t('可用区'),
                dataIndex: 'zone',
                key: 'zone',
                fieldProps: {
                    placeholder: t('请输入可用区'),
                    type: 'string',
                },
                formItemProps: {
                    rules: [{
                        required: false,
                        message: t('请输入可用区')
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
                        okButtonProps={{ danger: true }}
                        onConfirm={async () => onDelete(record.id as string)}>
                        <Button
                            variant='link'
                            color='danger'
                        >
                            {t('删除')}
                        </Button>
                    </Popconfirm>
                ],
            },
        ]
    }
    
    const actionRef = useRef<ActionType>(undefined)
    
    return <EditableProTable
        rowKey='id'
        columns={get_cols(!!group) as any}
        actionRef={actionRef}
        recordCreatorProps={
            {
                position: 'bottom', // @ts-ignore
                record: () => ({ 
                    id: String(Date.now()),
                    host: '',
                    port: '',
                    zone: '',
                    alias: '',
                    mode: '',
                }),
                type: 'default',
                variant: 'outlined',
                creatorButtonText: t(' 新增节点'),
                onClick: () => {
                    const tbody = document.querySelector('.ant-table-body')
                    setTimeout(() => { tbody.scrollTop = tbody.scrollHeight }, 1)
                }
            }
        }
        scroll={{ y: 'calc(100vh - 250px)' }}
        value={nodes}
        editable={
            {
                type: 'single',
                onSave: async (rowKey, { host, port, alias, mode, zone }, originRow) => {
                    try {
                        const changed_alias = originRow.alias !== alias
                        const is_add = originRow.alias === ''
                        await onSave({ rowKey, host, port, alias, mode, zone, group: group || '' }, changed_alias, is_add, originRow.alias)
                    } catch (error) {
                        model.show_error({ error })
                        throw error
                    }
                    
                },
                onDelete: async (_, row) => {
                    try {
                        await onDelete(row.id)
                    } catch (error) {
                        model.show_error({ error })
                        throw error
                    }
                },
                actionRender: (row, config, defaultDom) => [
                    defaultDom.save,
                    defaultDom.cancel
                ],
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
                        variant='link'
                        color='danger'
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
