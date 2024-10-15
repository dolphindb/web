import NiceModal from '@ebay/nice-modal-react'
import { AutoComplete, Button, Input, message, Modal, Popover, Table, Tooltip, type TableProps } from 'antd'

import { useCallback, useState } from 'react'

import { t } from '../../i18n/index.js'
import { model } from '@/model.js'



export const GroupAddModal = NiceModal.create((props: { on_save: (form: { group_name: string, group_nodes: GroupNodesDatatype[], group_configs: GroupConfigDatatype[] }) => Promise<{ success: boolean, message?: string }> }) => {
    const modal = NiceModal.useModal()
    
    const [group_name, set_group_name] = useState('')
    const [validating, set_validating] = useState(false)
    
    const [group_nodes, set_group_nodes] = useState<GroupNodesDatatype[]>([{ key: String((new Date()).getTime()), host: '', port: '', alias: '' }])
    const [group_configs, set_group_configs] = useState<GroupConfigDatatype[]>([
        { key: 'default1', name: 'computeNodeCacheDir', value: '' },
        { key: 'default2', name: 'computeNodeMemCacheSize', value: '' },
        { key: 'default3', name: 'computeNodeDiskCacheSize', value: '' },
        { key: 'default4', name: 'enableComputeNodeCacheEvictionFromQueryThread', value: '' },
    ])
    const [batch_add_node_count, set_batch_add_node_count] = useState(1)
    
    function validate (): boolean {
        if (group_name === '')
            return false
            
        for (const node of group_nodes) // 非空校验，并且别名必须包含 group_name
            if (node.host === '' || node.port === '' || node.alias === '' || (!node.alias.startsWith(group_name)))
                return false
                
        for (const config of group_configs)
            if (config.name === '' || config.value === '')
                return false
                
        return true
    }
    
    const filter_config = useCallback(
        (input: string, option?: { label: string, options: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase()), [ ])
            
    function delete_group_node (key: string) {
        set_group_nodes(group_nodes.filter(node => node.key !== key))
    }
    
    function delete_config (key: string) {
        set_group_configs(group_configs.filter(config => config.key !== key))
    }
    
    function update_group_node_by_field (key: string, field: keyof GroupNodesDatatype, value: string) {
        set_group_nodes(group_nodes.map(node => {
            if (node.key === key)
                node[field] = value
            return node
        }))
    }
    
    function update_config_by_field (key: string, field: keyof GroupConfigDatatype, value: string) {
        set_group_configs(group_configs.map(config => {
            if (config.key === key)
                config[field] = value
            return config
        }))
    }
    
    function batch_add_empty_config () {
        set_group_configs([...group_configs, { key: String((new Date()).getTime()), name: '', value: '' }])
    }
    
    function batch_add_empty_node (count: number) {
        const new_nodes = [ ]
        for (let i = 0;  i < count;  i++)
            new_nodes.push({ key: String((new Date()).getTime() + i), host: '', port: '', alias: '' })
        set_group_nodes([...group_nodes, ...new_nodes])
    }
    
    
    const group_nodes_columns: TableProps<GroupNodesDatatype>['columns'] = [
        {
            title: t('别名'), key: 'alias', render: (_, { key, alias }) => {
                const isError = validating && (alias === '' || !alias.startsWith(group_name))
                return <div>
                    <Tooltip
                        title={<span className='validate-error-node'>{t('别名必须以组名')} {group_name} {t('开头')}</span>}
                        placement='topLeft'
                        open={isError ? undefined : false}
                        color='white'
                        trigger='focus'
                    >
                        <Input
                            status={isError ? 'error' : undefined}
                            placeholder={t('请输入别名')}
                            value={alias}
                            onChange={e => { update_group_node_by_field(key, 'alias', e.target.value) }}
                        />
                    </Tooltip>
                </div>
            }
        },
        { title: t('主机名 / IP 地址'), key: 'host', render: (_, { key, host }) => <Input status={(validating && host === '') ? 'error' : undefined} placeholder={t('请输入主机名 / IP 地址')} value={host} onChange={e => { update_group_node_by_field(key, 'host', e.target.value) }} /> },
        { title: t('端口号'), key: 'port', render: (_, { key, port }) => <Input status={(validating && port === '') ? 'error' : undefined} type='number' placeholder={t('请输入端口号')} value={port} onChange={e => { update_group_node_by_field(key, 'port', e.target.value) }} /> },
        
        {
            title: t('操作'), key: 'operation', render: (_, { key }) => {
                return <Button type='link' onClick={() => { delete_group_node(key) }}>{t('删除')}</Button>
            }
        }
    ]
    
    const group_configs_columns: TableProps<GroupConfigDatatype>['columns'] = [
        {
            title: t('配置项'), key: 'name', render: (_, { key, name }) => <AutoComplete<string>
                showSearch
                optionFilterProp='label'
                filterOption={filter_config}
                value={name}
                style={{ width: 400 }}
                status={(validating && name === '') ? 'error' : undefined}
                onChange={e => {
                    update_config_by_field(key, 'name', e)
                }}
                options={Object.entries(model.get_config_classification()).map(([cfg_cls, configs]) => ({
                    label: cfg_cls,
                    options: Array.from(configs).map(cfg => ({
                        label: cfg,
                        value: cfg
                    }))
                }))} />
        },
        { title: t('值'), key: 'value', render: (_, { key, value }) => <Input status={(validating && value === '') ? 'error' : undefined} placeholder={t('请输入值')} value={value} onChange={e => { update_config_by_field(key, 'value', e.target.value) }} /> },
        { title: t('操作'), key: 'operation', render: (_, { key }) => <Button type='link' onClick={() => { delete_config(key) }}>{t('删除')}</Button> }
    ]
    
    
    return <Modal
        className='add-compute-group-modal'
        open={modal.visible}
        onCancel={modal.hide}
        maskClosable={false}
        title={t('新增计算组')}
        footer={false}
        width='80%'
        height='90vh'
        afterClose={modal.remove}>
        <div className='label'>
            {t('计算组名称')}
        </div>
        <div style={{ position: 'relative' }}>
            <Input placeholder={t('请输入计算组名称')} status={(validating && group_name === '' ) ? 'error' : undefined} value={group_name} onChange={e => { set_group_name(e.target.value) }} />
        </div>
        <div className='label'>
            {t('批量添加节点')}
        </div>
        <div>
            <Table
                dataSource={group_nodes}
                columns={group_nodes_columns}
                pagination={false}
            />
        </div>
        <div className='add-nodes'>
            {t('在列表后添加')}
            <Input type='number' style={{ width: 100 }} value={batch_add_node_count} onChange={e => { set_batch_add_node_count(Number(e.target.value)) }} />
            {t('个节点')}
            <Button onClick={() => { batch_add_empty_node(batch_add_node_count) }}>
                {t('批量添加')}
            </Button>
        </div>
        <div className='label'>
            {t('计算组配置')}
        </div>
        <div>
            <Table
                dataSource={group_configs}
                columns={group_configs_columns}
                pagination={false}
            />
        </div>
        <div className='add-nodes'>
            <Button onClick={batch_add_empty_config}>{t('新增一条配置')}</Button>
        </div>
        <div className='add-nodes' style={{ flexFlow: 'row-reverse' }}>
            <Button onClick={() => {
                if (group_nodes.length <= 0) {
                    message.warning(t('请添加至少 1 个节点'))
                    return
                }
                if (validate())
                    props.on_save({ group_name, group_nodes, group_configs }).then(r => {
                    if (r.success)
                        modal.hide()
                    })
                else
                    set_validating(true)
            }} type='primary'>{t('完成')}</Button>
            <Button onClick={modal.hide}>{t('取消')}</Button>
        </div>
    </Modal>
})

export interface GroupNodesDatatype { key: string, host: string, port: string, alias: string }
export interface GroupConfigDatatype { key: string, name: string, value: string }
