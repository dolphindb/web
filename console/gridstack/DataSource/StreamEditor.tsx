import { createElement, useState } from 'react'

import { Menu, Popover, Select } from 'antd'
import type { MenuProps } from 'antd'
import { CloseOutlined, QuestionCircleOutlined, TableOutlined } from '@ant-design/icons'

import { Editor } from '../../shell/Editor/index.js'

const node_items: MenuProps['items'] = [
    {
        key: '1',
        icon: createElement(TableOutlined),
        label: '表格1'
    },
    {
        key: '2',
        icon: createElement(TableOutlined),
        label: '表格2'
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

export function StreamEditor ({ show_preview, close_preview }: { show_preview: boolean, close_preview: () => void }) {
    const [filter_mode, set_filter_mode] = useState('value')
    
    const on_filter_mode_change_handler = (value: string) => {
        set_filter_mode(value)
    }
    
    return <>
        <div className='data-source-config-streameditor'>
            <div className='data-source-config-streameditor-main'>
                <div className='data-source-config-streameditor-main-left'>
                    <Menu
                        mode='inline'
                        defaultSelectedKeys={['1']}
                        className='data-source-config-streameditor-main-left-menu'
                        items={node_items}
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
    </>
}
