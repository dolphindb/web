import './index.sass'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'

import { t } from '@i18n'

import { AutoComplete, Button, Popconfirm } from 'antd'

import { EditableProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'

import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import NiceModal from '@ebay/nice-modal-react'

import useSWR from 'swr'

import { model } from '@model'

import { RefreshButton } from '@/components/RefreshButton/index.js'

import { filter_config, strs_2_nodes } from './utils.js'
import { NodesConfigAddModal } from './NodesConfigAddModal.js'

import { config, validate_config, validate_qualifier } from './model.js'



export function ComputeGroupConfig () {
    // 这里指的是配置节点的文件，不是节点配置文件
    const { mutate, data: nodes = [ ] } = useSWR('/get/nodes_config_file', async () => { 
        const result = await config.get_cluster_nodes() 
        const nodes = strs_2_nodes(result as any[])
        return nodes
    }, { revalidateOnMount: true, revalidateOnFocus: true })
    const [current_compute_group, set_current_compute_group] = useState<string>('')
    
    const [search_kw, set_search_kw] = useState('')
    
    const compute_groups = useMemo(() => {
        const groups_map = new Map()
        nodes.forEach(config => {
          if (config.computeGroup)
              groups_map.set(config.computeGroup, (groups_map.get(config.computeGroup) || 0) + 1)
        })
        return groups_map
      }, [nodes])
    
    const groups = Array.from(compute_groups.keys())
    
    useEffect(() => {
        const is_current_select_in_groups = groups.includes(current_compute_group)
        set_current_compute_group(groups.length && !is_current_select_in_groups ? groups[0] : '')
    }, [nodes])
    
    const select_items = groups.map(group => {
        const count = compute_groups.get(group)
        return <div
            key={group}
            className={`select-item ${current_compute_group === group ? 'active' : ''}`}
            onClick={() => {
                set_current_compute_group(group)
            }}
        >
            <div className='title'>
                {group}
            </div>
            {count} {t('个节点')}
        </div>
    })
    
    const actionRef = useRef<ActionType>(undefined)
    
    const delete_config = useCallback(
        async (config_name: string) => {
            await config.delete_configs([config_name])
            model.message.success(t('删除成功'))
            actionRef.current?.reload()
            
        },
        [ ]
    )
    
    useEffect(() => {
        actionRef.current?.reload()
    }, [current_compute_group])
    
    async function on_search () {
        actionRef.current?.reload()
    }
    
    const columns: ProColumns<any>[] = [
        {
            title: t('配置项'),
            dataIndex: 'name',
            key: 'name',
            width: 400,
        },
        {
            title: t('值'),
            dataIndex: 'value',
            key: 'value',
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
                        action?.startEditable?.(record.key)
                    }}
                >
                    {t('编辑')}
                </Button>,
                <Popconfirm
                    title={t('确认删除此配置项？')}
                    key='delete'
                    onConfirm={async () => {
                        await delete_config(record.key)
                    }}
                    okButtonProps={{ danger: true }}
                >
                    <Button variant='link' color='danger'>
                        {t('删除')}
                    </Button>
                </Popconfirm>
            ],
        },
    ]
    
    return <div className='config compute-group'>
        {select_items.length > 0 && <div className='select' >
            {select_items}
        </div>}
        <div>
            <div className='toolbar'>
                <div className='auto-search'>
                    <AutoComplete<string>
                        showSearch
                        placeholder={t('请输入想要查找的配置项')}
                        optionFilterProp='label'
                        value={search_kw}
                        style={{ width: 300, flex: '1' }}
                        onChange={set_search_kw}
                        filterOption={filter_config}
                        onKeyDown={e => {
                            if (e.key === 'Enter')
                                on_search()
                        }}
                        options={Object.entries(config.get_config_classification()).map(([cfg_cls, configs]) => ({
                            label: cfg_cls,
                            options: Array.from(configs).map(cfg => ({
                                label: cfg,
                                value: cfg
                            }))
                        }))} />
                    <Button icon={<SearchOutlined />} onClick={on_search} />
                </div>
                {current_compute_group !== '' && <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={async () =>
                        NiceModal.show(NodesConfigAddModal, {
                            compute_group: current_compute_group, on_save: actionRef.current?.reload
                        })
                    }
                >
                    {t('新增配置')}
                </Button>}
                <RefreshButton
                    onClick={async () => {
                        set_search_kw('')
                        await actionRef.current?.reload()
                        await mutate()
                        model.message.success(t('刷新成功'))
                    }}
                />
                
            </div>
            <div className='table-padding'>
                <EditableProTable
                    rowKey='key'
                    actionRef={actionRef}
                    columns={columns}
                    request={async () => {
                        const nodesConfigRaw = await config.load_configs()
                        
                        // 将 nodes_configs 字符串数组转换为 NodesConfig 对象数组
                        const nodes_configs = Array.from(nodesConfigRaw.values())
                        
                        // 筛选配置项
                        const filtered_configs = nodes_configs.filter(config =>
                            config.qualifier.startsWith(`${current_compute_group}%`) && config.key.includes(search_kw)
                        )
                        return {
                            data: filtered_configs,
                            success: true,
                            total: filtered_configs.length
                        }
                    }}
                    recordCreatorProps={false}
                    editable={{
                        type: 'single',
                        onSave: async (rowKey, data) => {
                            try {
                                const { name, qualifier, value } = data
                                await validate_config(name, value)
                                await validate_qualifier(name, qualifier) 
                                const key = (qualifier ? qualifier + '.' : '') + name
                                if (rowKey !== key)
                                    config.nodes_configs.delete(rowKey as string)
                                await config.change_configs([[key, { name, qualifier, value, key }]])
                                model.message.success(t('保存成功，重启计算节点生效'))
                                // 数据可能被以其他方式修改，保存后重新加载获取新的数据
                                actionRef.current?.reload()
                            } catch (error) {
                                model.show_error({ error })
                                throw error
                            }
                        },
                        onDelete: async key => {
                            try {
                                await delete_config(key as string)
                            } catch (error) {
                                model.show_error({ error })
                                throw error
                            }
                        },
                        actionRender: (row, config, defaultDom) => [
                            defaultDom.save,
                            <Popconfirm
                                title={t('确认删除此配置项？')}
                                key='delete'
                                onConfirm={async () => {
                                    try {
                                        await delete_config(row.key as string)
                                    } catch (error) {
                                        model.show_error({ error })
                                        throw error
                                    }
                                }}
                                okButtonProps={{ danger: true }}
                            >
                                <Button variant='link' color='danger'>{t('删除')}</Button>
                            </Popconfirm>,
                            defaultDom.cancel
                        ],
                        deletePopconfirmMessage: t('确认删除此配置项？'),
                        deleteText: <Button variant='link' color='danger'>{t('删除')}</Button>
                    }}
                />
            </div>
        </div>
        
    </div>
}
