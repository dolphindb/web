import { useEffect } from 'react'

import { CloseOutlined } from '@ant-design/icons'
import { InputNumber, Switch } from 'antd'

import { Editor } from '../../shell/Editor/index.js'
import { DataView } from '../../shell/DataView.js'

import { dashboard } from '../model.js'
import { DataSourceNode, type DataSourceNodePropertyType, get_source_node } from '../storage/date-source-node.js'

type PropsType = { 
    show_preview: boolean
    current_data_source_node: DataSourceNode
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
        if (dashboard.editor)
            dashboard.editor?.setValue(current_data_source_node.code)
        
        if (current_data_source_node.mode === get_source_node(current_data_source_node.id).mode)
            change_no_save_flag(false)
    }, [ current_data_source_node.id ])
    
    return <>
        <div className='sqleditor'>
            <div className='sqleditor-main' style={{  height: (show_preview ? '40%' : '100%') }}>
                <Editor 
                    enter_completion
                    on_mount={(editor, monaco) => {
                        editor?.setValue(get_source_node(current_data_source_node.id).code)
                        dashboard.set({ editor, monaco })
                    }}
                    on_change={() => change_no_save_flag(true)}
                    theme='dark'
                />
            </div>
            {show_preview
                ? <div className='preview'>
                    <div className='preview-config'>
                        <div className='preview-config-tag'>
                            数据预览
                        </div>
                        <div className='preview-config-close' onClick={close_preview}>
                            <CloseOutlined/>
                            关闭
                        </div>
                    </div>
                    <div className='preview-main'>
                        {result?.data
                            ? <DataView dashboard/>
                            : <div className='preview-main-error'>{current_data_source_node.error_message }</div> 
                        }
                    </div>
                </div>
                : <></>
            }
        </div>
        <div className='sqlconfig'>
            <div className='sqlconfig-left'>
                <div className='sqlconfig-left-refresh'>
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
                            min={0.001}
                            className='sqlconfig-left-intervals-input'
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
            <div className='sqlconfig-right'>
                <div>
                    最大行数：
                    <InputNumber 
                        size='small' 
                        min={1}
                        className='sqlconfig-right-maxline-input' 
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
