import { CloseOutlined } from '@ant-design/icons'
import { InputNumber, Switch } from 'antd'

import { Editor } from '../../shell/Editor/index.js'
import { DataView } from '../../shell/DataView.js'

import { shell } from '../../shell/model.js'

import { type dataSourceNodeType, type dataSourceNodePropertyType } from '../storage/date-source-node.js'

type PropsType = { 
    show_preview: boolean
    close_preview: () => void 
    current_data_source_node: dataSourceNodeType
    change_current_data_source_node_property: (key: string, value: dataSourceNodePropertyType) => void
}
export function SqlEditor ({ 
        current_data_source_node, 
        change_current_data_source_node_property, 
        show_preview, 
        close_preview,
    }: PropsType) 
{
    shell.term = shell.term || new window.Terminal()
    return <>
        <div className='data-source-config-sqleditor'>
            <div className='data-source-config-sqleditor-main' style={{  height: (show_preview ? '40%' : '100%') }}>
                <Editor 
                    enter_completion
                    on_mount={(editor, monaco) => {
                        editor.setValue(current_data_source_node.code || '')
                        shell.set({ editor, monaco })
                    }}
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
                        {current_data_source_node.error_message 
                            ? <div className='data-source-config-preview-main-error'>{current_data_source_node.error_message }</div> 
                            : <DataView type='dashboard'/>
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
                            min={0.001}
                            className='data-source-config-sqlconfig-left-intervals-input'
                            value={current_data_source_node.interval}
                            onChange={value => {
                                if (value !== null)
                                    change_current_data_source_node_property('interval', value) 
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
                        min={0}
                        max={1000}
                        className='data-source-config-sqlconfig-right-maxline-input' 
                        value={current_data_source_node.max_line}
                        onChange={value => { 
                            if (value !== null)
                                change_current_data_source_node_property('max_line', value) 
                        }}
                    />
                </div>
            </div>
        </div>
    </>
}
