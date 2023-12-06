import { createElement, useEffect, useRef, useState } from 'react'
import { Input, Popover, Select, Tree, type MenuProps, InputNumber, Switch, Table } from 'antd'
import { QuestionCircleOutlined, SearchOutlined, TableOutlined } from '@ant-design/icons'
import { throttle } from 'lodash'

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
import { InsertVariableBtn } from './InsertVariableBtn.js'
import { type editor } from 'monaco-editor'
import { use_monaco_insert } from '../../utils/hooks/use-monaco-insert.js'
import { t } from '../../../i18n/index.js'


interface PropsType  { 
    loading: boolean
    current_data_source: DataSource
    change_no_save_flag: (value: boolean) => void
    change_current_data_source_property: (key: string, value: DataSourcePropertyType, save_confirm?: boolean) => void
}
  
export function StreamEditor ({ 
    loading,
    current_data_source,
    change_no_save_flag,
    change_current_data_source_property
 }: PropsType) {
    const nodes = model.use(['nodes']).nodes.filter(node => node.mode === NodeType.data || node.mode === NodeType.single)
    const { filter_column_editor, filter_expression_editor } = dashboard.use(['filter_column_editor', 'filter_expression_editor'])
    
    const node_list = [
        ...nodes.map(node => {
            return {
                value: node.name,
                label: node.name
            }
        }),
        { value: '', label: t('自定义') }
    ]
    
    const [stream_tables, set_stream_tables] = useState<MenuProps['items']>([ ])
    const [current_stream, set_current_stream] = useState(current_data_source?.stream_table || '')
    const [stream_filter_col, set_stream_filter_col] = useState('')
    const [ip_list, set_ip_list] = useState<{ label: string, value: string }[]>([ ])
    const [cur_focus_editor, set_cur_focus_editor] = useState<editor.IStandaloneCodeEditor>()
    
    const { on_monaco_insert } = use_monaco_insert(cur_focus_editor)
    const tree_ref = useRef(null)
    const tables_ref = useRef(null)
    
    const stream_editor_ref = useRef<HTMLDivElement>()
    
    useEffect(() => { 
        // 监听点击事件，获取当前激活的编辑器
        function on_click () { 
            if (filter_column_editor?.hasTextFocus())
                set_cur_focus_editor(filter_column_editor)
            else if (filter_expression_editor?.hasTextFocus())
                set_cur_focus_editor(filter_expression_editor)
            else
                set_cur_focus_editor(null)
        }
        stream_editor_ref.current.addEventListener('click', on_click)
        
        return () => { stream_editor_ref?.current?.removeEventListener('click', on_click) }
    }, [filter_column_editor, filter_expression_editor])
    
    useEffect(() => {
        dashboard.filter_column_editor?.updateOptions({ readOnly: loading })
        dashboard.filter_expression_editor?.updateOptions({ readOnly: loading })
    }, [loading])
    
    useEffect(() => {
        (async () => {
            // 获取数据库流表
            const table = await get_stream_tables()
            if (table.length)   {
                const table_items = table.map(stream_table => ({
                    key: stream_table,
                    icon: createElement(TableOutlined),
                    title: stream_table
                }))
                set_stream_tables(table_items)
                tables_ref.current = table_items
                
                if (!table.includes(current_data_source.stream_table)) {
                    change_current_data_source_property('stream_table', table[0], false) 
                    set_current_stream(table[0])
                } 
                else 
                    set_current_stream(current_data_source.stream_table)
                
            }  else 
                change_current_data_source_property('stream_table', '', false)
                
            if (dashboard.filter_column_editor)
                dashboard.filter_column_editor.setValue(current_data_source.filter_column)
            
            if (dashboard.filter_expression_editor)
                dashboard.filter_expression_editor.setValue(current_data_source.filter_expression)
            
            if (current_data_source.mode === get_data_source(current_data_source.id).mode)
                change_no_save_flag(false)
        })()
    }, [ current_data_source.id ])
    
    useEffect(() => {
        tree_ref.current?.scrollTo({ key: current_data_source.stream_table })
    }, [stream_tables])
    
    useEffect(() => {
        (async () => {
            if (current_data_source.stream_table) {
                set_stream_filter_col(await get_stream_filter_col(current_stream))
                change_current_data_source_property('cols', await get_stream_cols(current_stream), false)
            }         
        })()
    }, [current_data_source.stream_table])
    
    useEffect(() => {
        if (current_data_source.node === '')
            return
        
        current_data_source.node = default_value_in_select(current_data_source, 'node', node_list)
        const node = nodes.filter(node => node.name === current_data_source.node)[0]
        
        const closest_node_host = model.find_closest_node_host(node)
        const new_ip_list = [
            {
                value: closest_node_host + ':' + node.port,
                label: closest_node_host + ':' + node.port
            }
        ]
        if (node.host !== closest_node_host)
            new_ip_list.push({
                value: node.host + ':' + node.port,
                label: node.host + ':' + node.port
            })
        node.publicName.split((/,|;/)).forEach(item => {
            if (item !== closest_node_host)
                new_ip_list.push({
                    value: item + ':' + node.port,
                    label: item + ':' + node.port
                })
        })
        set_ip_list(new_ip_list)
        
        change_current_data_source_property('ip', default_value_in_select(current_data_source, 'ip', new_ip_list))
    }, [current_data_source.node])
    
    return <>
        <div className='streameditor' ref={stream_editor_ref}>
            {tables_ref.current?.length
                ? <>
                    <div className='streameditor-main'>
                        <div className='streameditor-main-left'>
                            <Input
                                placeholder={t('请输入要搜索的流表名')}
                                onChange={throttle(event => { 
                                    set_stream_tables(
                                        tables_ref.current.filter((stream_table: any) => stream_table.title.indexOf(event.target.value) !== -1)
                                    )
                                }, 1000)}
                                suffix={<SearchOutlined />} 
                            />
                            <Tree
                                ref={tree_ref}
                                showIcon
                                height={360}
                                blockNode
                                selectedKeys={[current_stream]}
                                className='streameditor-main-left-menu'
                                treeData={stream_tables}
                                onSelect={async key => { 
                                    if (!loading && key.length) {
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
                                        {t('列名预览（共{{length}}列）：', { length: current_data_source.cols.length })}
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
                            {current_data_source.filter &&
                                <>
                                    <div className='streameditor-main-right-filter'>
                                        <div className='streameditor-main-right-filter-top'>
                                            <div className='streameditor-main-right-filter-top-mode'>
                                                {t('列过滤') + '：'}
                                                <Popover 
                                                    content={(
                                                        <div>
                                                            <p>{t('值过滤、范围过滤、哈希过滤')}</p>
                                                        </div>
                                                    )} 
                                                >
                                                    <QuestionCircleOutlined className='streameditor-main-right-filter-top-mode-icon'/>
                                                </Popover>
                                            </div>
                                            <div className='streameditor-main-right-filter-top-col'>
                                                {stream_filter_col ? (t('当前过滤列为:') + stream_filter_col) : t('当前流表无过滤列')}
                                            </div>
                                        </div>
                                        <div className='streameditor-main-right-filter-main'>
                                            <Editor
                                                readonly={loading}
                                                enter_completion
                                                on_mount={(editor, monaco) => {
                                                    editor?.setValue(get_data_source(current_data_source.id).filter_column || '')
                                                    dashboard.set({ filter_column_editor: editor, monaco })
                                                }}
                                                on_change={() => { change_no_save_flag(true) }}
                                                theme='dark'
                                            />
                                        </div>
                                    </div>
                                    <div className='streameditor-main-right-filter'>
                                        <div className='streameditor-main-right-filter-top'>
                                            <div className='streameditor-main-right-filter-top-mode'>
                                                {t('表达式过滤') + '：'}
                                            </div>
                                        </div>
                                        <div className='streameditor-main-right-filter-main'>
                                            <Editor
                                                readonly={loading}
                                                enter_completion
                                                on_mount={(editor, monaco) => {
                                                    editor?.setValue(get_data_source(current_data_source.id).filter_expression || '')
                                                    dashboard.set({ filter_expression_editor: editor, monaco })
                                                }}
                                                on_change={() => { change_no_save_flag(true) }}
                                                theme='dark'
                                            />
                                        </div>
                                    </div>
                                </>
                            }
                        </div>        
                    </div>
                    <div className='streamconfig'>
                        <div className='streamconfig-left'>
                            <div>
                                {t('节点') + '：'}
                                <Select
                                    disabled={loading}
                                    value={ current_data_source.node }
                                    className='streamconfig-left-node-select'
                                    size='small'
                                    onChange={(value: string) => { change_current_data_source_property('node', value) }}
                                    options={node_list}
                                />
                            </div>
                            <div className='streamconfig-left-ip'>
                                IP：
                                {current_data_source.node
                                    ? <Select
                                        disabled={loading}
                                        value={current_data_source.ip}
                                        className='streamconfig-left-ip-select'
                                        size='small'
                                        onChange={(value: string) => { change_current_data_source_property('ip', value) }}
                                        options={ip_list}
                                    />
                                    : <div  className='streamconfig-left-ip-manualinput'>
                                        <Input 
                                            autoFocus
                                            disabled={loading}
                                            size='small' 
                                            className='streamconfig-left-ip-manualinput-input'
                                            value={current_data_source.ip}
                                            onChange={event => { 
                                                if (event !== null)
                                                    change_current_data_source_property('ip', event.target.value) 
                                            }}
                                        />
                                    </div>
                                }
                            </div>
                            {stream_tables.length &&
                                <div>
                                    {t('过滤') + '：'}
                                    <Switch 
                                        disabled={loading}
                                        size='small' 
                                        checked={current_data_source.filter }
                                        onChange={(checked: boolean) => {
                                            change_current_data_source_property('filter', checked)
                                        }} 
                                    />
                                </div>
                            }
                    </div>
                    
                    { current_data_source.filter && <InsertVariableBtn on_insert={on_monaco_insert} /> }
                        <div className='streamconfig-right'>
                            <div>
                                {t('最大行数') + '：'}
                                <InputNumber 
                                    disabled={loading}
                                    size='small' 
                                    min={1}
                                    className='sqlconfig-right-maxline-input' 
                                    value={current_data_source.max_line}
                                    onChange={value => { 
                                        change_current_data_source_property('max_line', value ? Math.ceil(value) : value) 
                                    }}
                                />
                                <Popover 
                                    content={(
                                        <div>
                                            {t('若该值为空则表示不对最大行数进行限制')}
                                        </div>
                                    )} 
                                >
                                    <QuestionCircleOutlined className='streamconfig-right-icon'/>
                                </Popover>
                            </div>
                        </div>
                    </div>
                </>
                : <div className='streameditor-no-table'>{t('无可用流表')}</div>
            }
        </div>
    </> 
}
