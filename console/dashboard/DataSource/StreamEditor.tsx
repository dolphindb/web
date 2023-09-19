import { createElement, useEffect, useState } from 'react'

import { Input, Popover, Select, Tree, type MenuProps, InputNumber, Switch } from 'antd'
import { CloseOutlined, QuestionCircleOutlined, TableOutlined } from '@ant-design/icons'

import { Editor } from '../../shell/Editor/index.js'
import { DataView } from '../../shell/DataView.js'

import { 
    type DataSourceNodePropertyType, 
    DataSourceNode, 
    data_source_nodes, 
    find_data_source_node_index, get_stream_tables, get_stream_cols 
} from '../storage/date-source-node.js'
import { dashboard } from '../model.js'
import { NodeType, model } from '../../model.js'
import { default_value_in_select } from '../utils.js'

type PropsType = { 
    current_data_source_node: DataSourceNode
    change_no_save_flag: (value: boolean) => void
    change_current_data_source_node_property: (key: string, value: DataSourceNodePropertyType, save_confirm?: boolean) => void
}
  
export function StreamEditor ({ 
    current_data_source_node,
    change_no_save_flag,
    change_current_data_source_node_property
 }: PropsType) {
    const nodes = model.use(['nodes']).nodes.filter(node => node.mode === NodeType.data || node.mode === NodeType.single)
    const node_list = nodes.map(node => {
        return {
            value: node.name,
            label: node.name
        }
    })
    
    const [stream_tables, set_stream_tables] = useState<MenuProps['items']>([ ])
    const [current_stream, set_current_stream] = useState(current_data_source_node?.stream_table || '')
    const [stream_cols, set_stream_cols] = useState<{ label: string, value: string }[]>([ ])
    const [ip_list, set_ip_list] = useState<{ label: string, value: string }[]>([ ])
    const [ip_select, set_ip_select] = useState(
        !current_data_source_node.ip || (ip_list.filter(item => item.value === current_data_source_node.ip).length !== 0)
    )
    
    useEffect(() => {
        (async () => {
            if (current_data_source_node.mode === data_source_nodes[find_data_source_node_index(current_data_source_node.id)].mode)
                change_no_save_flag(false)
            
            // 获取数据库流表
            const table = await get_stream_tables()
            if (table.length)   {
                set_stream_tables(table.map(stream_table => {
                    return {
                        key: stream_table,
                        icon: createElement(TableOutlined),
                        title: stream_table
                    }
                }))
                if (!table.includes(current_data_source_node.stream_table)) {
                    change_current_data_source_node_property('stream_table', table[0], false) 
                    set_current_stream(table[0])
                }
            }  else 
                change_current_data_source_node_property('stream_table', '', false)
        })()
    }, [ current_data_source_node.id ])
    
    useEffect(() => {
        (async () => {
            if (current_data_source_node.stream_table) 
                set_stream_cols((await get_stream_cols(current_data_source_node.stream_table, true)).map(col => {
                    return {
                        label: col,
                        value: col
                    }
                }))  
        })()
    }, [current_data_source_node.stream_table])
    
    useEffect(() => {
        const node = nodes.filter(node => node.name === default_value_in_select(current_data_source_node, 'node', node_list))[0]
        const new_ip_list = [
            {
                value: node.host + ':' + node.port,
                label: node.host + ':' + node.port
            },
            {
                value: node.publicName + ':' + node.port,
                label: node.publicName + ':' + node.port
            }
        ]
        set_ip_list(new_ip_list)
        const new_ip = default_value_in_select(current_data_source_node, 'ip', new_ip_list)
        if (ip_select)
            change_current_data_source_node_property('ip', new_ip)
    }, [current_data_source_node.node])
    
    return <>
        <div className='data-source-config-streameditor'>
            <div className='data-source-config-streameditor-main'>
                <div className='data-source-config-streameditor-main-left'>
                    <Tree
                        showIcon
                        height={405}
                        blockNode
                        selectedKeys={[current_stream]}
                        className='data-source-config-streameditor-main-left-menu'
                        treeData={stream_tables}
                        onSelect={async key => { 
                            if (key.length) {
                                change_current_data_source_node_property('stream_table', String(key[0]))
                                set_current_stream(String(key[0]))
                            }
                        }}
                    />
                </div>
                {stream_tables.length
                    ? <div className='data-source-config-streameditor-main-right'>
                        <div className='data-source-config-preview' style={{ height: current_data_source_node.filter ? '60%' : '100%' }}>
                            <div className='data-source-config-preview-config'>
                                <div className='data-source-config-preview-config-tag'>
                                    列名预览
                                </div>
                            </div>
                            <div className='data-source-config-preview-main'>
                                <DataView dashboard/>
                            </div>
                        </div>
                        {current_data_source_node.filter
                            ? <div className='data-source-config-streameditor-main-right-filter'>
                                <div className='data-source-config-streameditor-main-right-filter-top'>
                                    <div className='data-source-config-streameditor-main-right-filter-top-mode'>
                                        过滤方式：
                                        <Select
                                            defaultValue={current_data_source_node.filter_mode || 'value'}
                                            className='data-source-config-streameditor-main-right-filter-top-mode-select'
                                            size='small'
                                            onChange={(value: string) => change_current_data_source_node_property('filter_mode', value)}
                                            options={[
                                                { value: 'value', label: '值过滤' },
                                                { value: 'scope', label: '范围过滤' },
                                                { value: 'hash', label: '哈希过滤' },
                                            ]}
                                        />
                                        <Popover 
                                            content={(
                                                <div>
                                                    <p>值过滤：一个向量。</p>
                                                    <p>范围过滤：一个数据对。范围包含下限值，但不包括上限值。</p>
                                                    <p>
                                                        哈希过滤：一个元组。第一个元素表示 bucket 的个数；第二个元素是一个标量或数据对，
                                                        <br />
                                                        其中标量表示 bucket 的索引（从0开始），数据对表示 bucket 的索引范围（包含下限值，
                                                        <br />
                                                        但不包括上限值）。
                                                    </p>
                                                </div>
                                            )} 
                                            title='过滤方式'
                                        >
                                            <QuestionCircleOutlined className='data-source-config-streameditor-main-right-filter-top-mode-icon'/>
                                        </Popover>
                                    </div>
                                    <div className='data-source-config-streameditor-main-right-filter-top-col'>
                                        过滤列:
                                        <Select
                                            defaultValue={default_value_in_select(current_data_source_node, 'filter_col', stream_cols)}
                                            className='data-source-config-streameditor-main-right-filter-top-mode-select'
                                            size='small'
                                            onChange={(value: string) => change_current_data_source_node_property('filter_col', value)}
                                            options={stream_cols}
                                        />
                                    </div>
                                </div>
                                <div className='data-source-config-streameditor-main-right-filter-main'>
                                    <Editor
                                        enter_completion
                                        on_mount={(editor, monaco) => {
                                            editor?.setValue(data_source_nodes[find_data_source_node_index(current_data_source_node.id)].filter_condition || '')
                                            dashboard.set({ editor, monaco })
                                        }}
                                        on_change={() => change_no_save_flag(true)}
                                    />
                                </div>
                            </div>
                            : <></>
                        }
                    </div>
                    : <></>
                }
            </div>
        </div>
        {stream_tables.length
            ? <div className='data-source-config-streamconfig'>
                <div className='data-source-config-streamconfig-left'>
                    <div>
                        节点：
                        <Select
                            defaultValue={default_value_in_select(current_data_source_node, 'node', node_list) }
                            className='data-source-config-streamconfig-left-node-select'
                            size='small'
                            onChange={(value: string) => { change_current_data_source_node_property('node', value) }}
                            options={node_list}
                        />
                    </div>
                    <div className='data-source-config-streamconfig-left-ip'>
                        IP：
                        {ip_select
                            ? <Select
                                value={current_data_source_node.ip}
                                className='data-source-config-streamconfig-left-ip-select'
                                size='small'
                                onChange={(value: string) => {
                                    if (value === 'customize') {
                                        set_ip_select(false)
                                        return
                                    } 
                                    else 
                                        change_current_data_source_node_property('ip', value)
                                }}
                                options={[
                                    ...ip_list,
                                    { value: 'customize', label: '自定义' }
                                ]}
                            />
                            : <div  className='data-source-config-streamconfig-left-ip-manualinput'>
                                <Input 
                                    size='small' 
                                    className='data-source-config-streamconfig-left-ip-manualinput-input'
                                    value={current_data_source_node.ip}
                                    onChange={event => { 
                                        if (event !== null)
                                            change_current_data_source_node_property('ip', event.target.value) 
                                    }}
                                />
                                <CloseOutlined 
                                    className='data-source-config-streamconfig-left-ip-manualinput-icon' 
                                    onClick={() => { 
                                        set_ip_select(true) 
                                        const new_ip = default_value_in_select(current_data_source_node, 'ip', ip_list)
                                        if (new_ip !== current_data_source_node.ip)
                                            change_current_data_source_node_property('ip', new_ip)
                                    }}
                                />
                            </div>
                        }
                    </div>
                    <div>
                        过滤：
                        <Switch 
                            size='small' 
                            checked={current_data_source_node.filter }
                            onChange={(checked: boolean) => {
                                change_current_data_source_node_property('filter', checked)
                            }} 
                        />
                    </div>
                </div>
                <div className='data-source-config-streamconfig-right'>
                    <div>
                        最大行数：
                        <InputNumber 
                            size='small' 
                            min={1}
                            max={1000}
                            className='data-source-config-sqlconfig-right-maxline-input' 
                            value={current_data_source_node.max_line}
                            onChange={value => { 
                                if (value !== null)
                                    change_current_data_source_node_property('max_line', Math.ceil(value)) 
                            }}
                        />
                    </div>
                </div>
            </div>
            : <></>
        }
    </>
}
