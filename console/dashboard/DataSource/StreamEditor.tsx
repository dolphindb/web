import { createElement, useEffect, useRef, useState } from 'react'

import { Input, Popover, Select, Tree, type MenuProps, InputNumber, Switch, Table } from 'antd'
import { CloseOutlined, QuestionCircleOutlined, TableOutlined } from '@ant-design/icons'

import { Editor } from '../../shell/Editor/index.js'

import { 
    type DataSourcePropertyType, 
    type DataSource, 
    get_stream_tables, 
    get_stream_cols, 
    get_data_source,
    get_stream_filter_col
} from './date-source.js'
import { dashboard } from '../model.js'
import { NodeType, model } from '../../model.js'
import { default_value_in_select } from '../utils.js'

type PropsType = { 
    current_data_source: DataSource
    change_no_save_flag: (value: boolean) => void
    change_current_data_source_property: (key: string, value: DataSourcePropertyType, save_confirm?: boolean) => void
}
  
export function StreamEditor ({ 
    current_data_source,
    change_no_save_flag,
    change_current_data_source_property
 }: PropsType) {
    const nodes = model.use(['nodes']).nodes.filter(node => node.mode === NodeType.data || node.mode === NodeType.single)
    const node_list = nodes.map(node => {
        return {
            value: node.name,
            label: node.name
        }
    })
    
    const [stream_tables, set_stream_tables] = useState<MenuProps['items']>([ ])
    const [current_stream, set_current_stream] = useState(current_data_source?.stream_table || '')
    const [stream_filter_col, set_stream_filter_col] = useState('')
    const [ip_list, set_ip_list] = useState<{ label: string, value: string }[]>([ ])
    const [ip_select, set_ip_select] = useState(true)
    
    const tree_ref = useRef(null)
    
    useEffect(() => {
        (async () => {
            tree_ref.current?.scrollTo({ key: current_data_source.stream_table })
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
                if (!table.includes(current_data_source.stream_table)) {
                    change_current_data_source_property('stream_table', table[0], false) 
                    set_current_stream(table[0])
                }
            }  else 
                change_current_data_source_property('stream_table', '', false)
                
            if (dashboard.filter_editor)
                dashboard.filter_editor?.setValue(current_data_source.code)
            
            if (current_data_source.mode === get_data_source(current_data_source.id).mode)
                change_no_save_flag(false)
        })()
    }, [ current_data_source.id ])
    
    useEffect(() => {
        (async () => {
            if (current_data_source.stream_table) {
                set_stream_filter_col(await get_stream_filter_col(current_stream))
                change_current_data_source_property('cols', await get_stream_cols(current_stream), false)
            }         
        })()
    }, [current_data_source.stream_table])
    
    useEffect(() => {
        const node = nodes.filter(node => node.name === default_value_in_select(current_data_source, 'node', node_list))[0]
        const new_ip_list = [
            {
                value: node.host + ':' + node.port,
                label: node.host + ':' + node.port
            },
            ...node.publicName.split((/,|;/)).map(item => {
                return {
                    value: item + ':' + node.port,
                    label: item + ':' + node.port
                }
            })
        ]
        set_ip_list(new_ip_list)
        
        const new_ip_select = !current_data_source.ip || (new_ip_list.filter(item => item.value === current_data_source.ip).length !== 0)
        if (new_ip_select)
            change_current_data_source_property('ip', default_value_in_select(current_data_source, 'ip', new_ip_list))
        
        set_ip_select(new_ip_select)
    }, [current_data_source.node])
    
    return <>
        <div className='streameditor'>
            {stream_tables.length
                ? <div className='streameditor-main'>
                    <div className='streameditor-main-left'>
                        <Tree
                            ref={tree_ref}
                            showIcon
                            height={395}
                            blockNode
                            selectedKeys={[current_stream]}
                            className='streameditor-main-left-menu'
                            treeData={stream_tables}
                            onSelect={async key => { 
                                if (key.length) {
                                    change_current_data_source_property('stream_table', String(key[0]))
                                    set_current_stream(String(key[0]))
                                }
                            }}
                        />
                    </div>
                    <div className='streameditor-main-right'>
                        <div className='preview' style={{ height: current_data_source.filter ? '40%' : '100%' }}>
                            <div className='preview-config'>
                                <div className='preview-config-tag'>
                                    {`列名预览（共${current_data_source.cols.length}列）：`}
                                </div>
                            </div>
                            <div className='preview-main'>
                                <Table 
                                    columns={[
                                        {
                                            title: 'Index',
                                            dataIndex: 'index',
                                        },
                                        {
                                            title: 'Name',
                                            dataIndex: 'name',
                                        },
                                    ]} 
                                    dataSource={
                                        current_data_source.cols.map((col, index) => {
                                            return {
                                                key: col,
                                                index: index + 1,
                                                name: col
                                            }
                                        })
                                    } 
                                    bordered
                                    size='small'
                                    pagination={{ pageSize: 6, position: ['bottomCenter'] }} 
                                />
                            </div>
                        </div>
                        {current_data_source.filter
                            ? <>
                                <div className='streameditor-main-right-filter'>
                                    <div className='streameditor-main-right-filter-top'>
                                        <div className='streameditor-main-right-filter-top-mode'>
                                            过滤条件：
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
                                            >
                                                <QuestionCircleOutlined className='streameditor-main-right-filter-top-mode-icon'/>
                                            </Popover>
                                        </div>
                                        <div className='streameditor-main-right-filter-top-col'>
                                            {stream_filter_col ? ('当前过滤列为:' + stream_filter_col) : '当前流表无过滤列'}
                                        </div>
                                    </div>
                                    <div className='streameditor-main-right-filter-main'>
                                        <Editor
                                            enter_completion
                                            on_mount={(editor, monaco) => {
                                                editor?.setValue(get_data_source(current_data_source.id).filter_condition || '')
                                                dashboard.set({ filter_editor: editor, monaco })
                                            }}
                                            on_change={() => { change_no_save_flag(true) }}
                                            theme='dark'
                                        />
                                    </div>
                                </div>
                                <div className='streameditor-main-right-filter'>
                                    <div className='streameditor-main-right-filter-top'>
                                        <div className='streameditor-main-right-filter-top-mode'>
                                            额外过滤条件：
                                        </div>
                                    </div>
                                    <div className='streameditor-main-right-filter-main'>
                                        <Editor
                                            enter_completion
                                            on_mount={(editor, monaco) => {
                                                editor?.setValue(get_data_source(current_data_source.id).extra_filter_condition || '')
                                                dashboard.set({ extra_filter_editor: editor, monaco })
                                            }}
                                            on_change={() => { change_no_save_flag(true) }}
                                            theme='dark'
                                        />
                                    </div>
                                </div>
                            </>
                            : <></>
                        }
                    </div>        
                </div>
                : <div className='streameditor-no-table'>无可用流表</div>
            }
        </div>
        <div className='streamconfig'>
                <div className='streamconfig-left'>
                    <div>
                        节点：
                        <Select
                            defaultValue={default_value_in_select(current_data_source, 'node', node_list) }
                            className='streamconfig-left-node-select'
                            size='small'
                            onChange={(value: string) => { change_current_data_source_property('node', value) }}
                            options={node_list}
                        />
                    </div>
                    <div className='streamconfig-left-ip'>
                        IP：
                        {ip_select
                            ? <Select
                                value={current_data_source.ip}
                                className='streamconfig-left-ip-select'
                                size='small'
                                onChange={(value: string) => {
                                    if (value === 'customize') {
                                        set_ip_select(false)
                                        return
                                    } 
                                    else 
                                        change_current_data_source_property('ip', value)
                                }}
                                options={[
                                    ...ip_list,
                                    { value: 'customize', label: '自定义' }
                                ]}
                            />
                            : <div  className='streamconfig-left-ip-manualinput'>
                                <Input 
                                    size='small' 
                                    className='streamconfig-left-ip-manualinput-input'
                                    value={current_data_source.ip}
                                    onChange={event => { 
                                        if (event !== null)
                                            change_current_data_source_property('ip', event.target.value) 
                                    }}
                                />
                                <CloseOutlined 
                                    className='streamconfig-left-ip-manualinput-icon' 
                                    onClick={() => { 
                                        set_ip_select(true) 
                                        const new_ip = default_value_in_select(current_data_source, 'ip', ip_list)
                                        if (new_ip !== current_data_source.ip)
                                            change_current_data_source_property('ip', new_ip)
                                    }}
                                />
                            </div>
                        }
                    </div>
                    {stream_tables.length
                        ? <div>
                            过滤：
                            <Switch 
                                size='small' 
                                checked={current_data_source.filter }
                                onChange={(checked: boolean) => {
                                    change_current_data_source_property('filter', checked)
                                }} 
                            />
                        </div>
                        : <></>
                    }
                </div>
                <div className='streamconfig-right'>
                    <div>
                        最大行数：
                        <InputNumber 
                            size='small' 
                            min={1}
                            className='sqlconfig-right-maxline-input' 
                            value={current_data_source.max_line}
                            onChange={value => { 
                                if (value !== null)
                                    change_current_data_source_property('max_line', Math.ceil(value)) 
                            }}
                        />
                    </div>
                </div>
        </div>
    </> 
}
