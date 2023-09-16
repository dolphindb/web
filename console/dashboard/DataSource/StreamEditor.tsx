import { createElement, useEffect, useState } from 'react'

import { Input, Popover, Select, Tree } from 'antd'
import type { MenuProps } from 'antd'
import { CloseOutlined, QuestionCircleOutlined, TableOutlined } from '@ant-design/icons'

import { Editor } from '../../shell/Editor/index.js'
import { DataSourceNodeType, data_source_nodes, find_data_source_node_index } from '../storage/date-source-node.js'

const node_items: MenuProps['items'] = [
    {
        key: '1',
        icon: createElement(TableOutlined),
        title: '表格1'
    },
    {
        key: '2',
        icon: createElement(TableOutlined),
        title: '表格2'
    }
]

const content = (
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
  )

type PropsType = { 
    show_preview: boolean
    current_data_source_node: DataSourceNodeType
    change_no_save_flag: (value: boolean) => void
    close_preview: () => void 
}
  
export function StreamEditor ({ 
    show_preview, 
    current_data_source_node,
    change_no_save_flag,
    close_preview
 }: PropsType) {
    
    const [filter_mode, set_filter_mode] = useState('value')
    
    const on_filter_mode_change_handler = (value: string) => {
        set_filter_mode(value)
    }
    
    const [ip_select, set_ip_select] = useState(true)
    
    const on_node_select_change_handler = (value: string) => {
        console.log(`selected ${value}`)
    }
    
    const on_ip_select_change_handler = (value: string) => {
        if (value === 'customize') {
            set_ip_select(false)
            return
        }
    }
    
    useEffect(() => {
        if (current_data_source_node.mode === data_source_nodes[find_data_source_node_index(current_data_source_node.id)].mode)
            change_no_save_flag(false)
    }, [ current_data_source_node.id ])
    
    return <>
        <div className='data-source-config-streameditor'>
            <div className='data-source-config-streameditor-main'>
                <div className='data-source-config-streameditor-main-left'>
                    <Tree
                        showIcon
                        height={405}
                        blockNode
                        defaultSelectedKeys={['1']}
                        className='data-source-config-streameditor-main-left-menu'
                        treeData={node_items}
                    />
                </div>
                <div className='data-source-config-streameditor-main-right'>
                {show_preview
                    ? <div className='data-source-config-preview data-source-config-streameditor-main-right-preview'>
                        <div className='data-source-config-preview-config'>
                            <div className='data-source-config-preview-config-tag'>
                                数据预览
                            </div>
                            <div className='data-source-config-preview-config-close' onClick={close_preview}>
                                <CloseOutlined/>
                                关闭
                            </div>
                        </div>
                        <div className='data-source-config-preview-main'>
                            streampreview
                        </div>
                    </div>
                    : <div className='data-source-config-streameditor-main-right-filter'>
                        <div className='data-source-config-streameditor-main-right-filter-top'>
                            <div className='data-source-config-streameditor-main-right-filter-top-mode'>
                                过滤方式：
                                <Select
                                    defaultValue='value'
                                    className='data-source-config-streameditor-main-right-filter-top-mode-select'
                                    size='small'
                                    onChange={on_filter_mode_change_handler}
                                    options={[
                                        { value: 'value', label: '值过滤' },
                                        { value: 'scope', label: '范围过滤' },
                                        { value: 'hash', label: '哈希过滤' },
                                    ]}
                                />
                                <Popover content={content} title='过滤方式'>
                                    <QuestionCircleOutlined className='data-source-config-streameditor-main-right-filter-top-mode-icon'/>
                                </Popover>
                            </div>
                            <div className='data-source-config-streameditor-main-right-filter-top-col'>
                                当前过滤列为：col1
                            </div>
                        </div>
                        <div className='data-source-config-streameditor-main-right-filter-main'>
                            <Editor />
                        </div>
                    </div>
                }
                </div>
            </div>
        </div>
        <div className='data-source-config-streamconfig'>
            <div className='data-source-config-streamconfig-left'>
                <div>
                    节点：
                    <Select
                        defaultValue='node1'
                        className='data-source-config-streamconfig-left-node-select'
                        size='small'
                        onChange={on_node_select_change_handler}
                        options={[
                            { value: 'node1', label: '节点1' },
                            { value: 'node2', label: '节点2' }
                        ]}
                    />
                </div>
                <div className='data-source-config-streamconfig-left-ip'>
                    IP：
                    {ip_select
                        ? <Select
                            defaultValue='127.0.0.1'
                            className='data-source-config-streamconfig-left-ip-select'
                            size='small'
                            onChange={on_ip_select_change_handler}
                            options={[
                                { value: '127.0.0.1', label: '127.0.0.1' },
                                { value: 'customize', label: '自定义' }
                            ]}
                        />
                        : <div  className='data-source-config-streamconfig-left-ip-manualinput'>
                            <Input size='small' className='data-source-config-streamconfig-left-ip-manualinput-input'/>
                            <CloseOutlined className='data-source-config-streamconfig-left-ip-manualinput-icon' onClick={() => { set_ip_select(true) }}/>
                        </div>
                    }
                </div>
            </div>
            <div className='data-source-config-streamconfig-right'>
                <div>
                    最大行数：
                    <Input size='small' className='data-source-config-streamconfig-right-input'/>
                </div>
            </div>
        </div>
    </>
}
