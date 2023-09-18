import { useEffect } from 'react'

import { CloseOutlined } from '@ant-design/icons'
import { InputNumber, Switch } from 'antd'

import { Editor } from '../../shell/Editor/index.js'
import { DataView } from '../../shell/DataView.js'

import { dashboard } from '../model.js'
import { type DataSourceNodeType, type DataSourceNodePropertyType, data_source_nodes, find_data_source_node_index } from '../storage/date-source-node.js'

type PropsType = { 
    show_preview: boolean
    current_data_source_node: DataSourceNodeType
    close_preview: () => void 
    change_no_save_flag: (value: boolean) => void
    change_current_data_source_node_property: (key: string, value: DataSourceNodePropertyType, save_confirm?: boolean) => void
}
export function SqlEditor ({ 
        current_data_source_node, 
        show_preview,
        change_current_data_source_node_property,
        change_no_save_flag,  
        close_preview,
    }: PropsType) 
{ 
    const { result } = dashboard.use(['result'])
    
    useEffect(() => {
        if (current_data_source_node.mode === data_source_nodes[find_data_source_node_index(current_data_source_node.id)].mode)
            change_no_save_flag(false)
    }, [ current_data_source_node.id ])
    
    return <>
        <div className='data-source-config-sqleditor'>
            <div className='data-source-config-sqleditor-main' style={{  height: (show_preview ? '40%' : '100%') }}>
                <Editor 
                    enter_completion
                    on_mount={(editor, monaco) => {
                        editor?.setValue(data_source_nodes[find_data_source_node_index(current_data_source_node.id)].code || '')
                        dashboard.set({ editor, monaco })
                    }}
                    on_change={() => change_no_save_flag(true)}
                />
            </div>
            {show_preview
                ? <div className='data-source-config-preview'>
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
                        {result?.data
                            ? <DataView dashboard/>
                            : <div className='data-source-config-preview-main-error'>{current_data_source_node.error_message }</div> 
                        }
                    </div>
                </div>
                : <></>
            }
        </div>
        <div className='data-source-config-sqlconfig'>
            <div className='data-source-config-sqlconfig-left'>
                <div className='data-source-config-sqlconfig-left-refresh'>
                    自动刷新：
                    <Switch 
                        size='small' 
                        checked={current_data_source_node.auto_refresh }
                        onChange={(checked: boolean) => {
                            change_current_data_source_node_property('auto_refresh', checked)
                        }} 
                    />
                </div>
                {current_data_source_node.auto_refresh 
                    ? <div>
                        间隔时间：
                        <InputNumber 
                            size='small' 
                            min={1}
                            max={1000}
                            className='data-source-config-sqlconfig-left-intervals-input'
                            value={current_data_source_node.interval}
                            onChange={value => {
                                if (value !== null)
                                    change_current_data_source_node_property('interval', Math.ceil(value)) 
                            }}
                        />
                        s
                    </div> 
                    : <></>
                }
            </div>
            <div className='data-source-config-sqlconfig-right'>
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
    </>
}
