import './index.sass'

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { cloneDeep } from 'lodash'

import { Button, Modal, type ButtonProps, Tabs } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/hooks.js'

import { DdbForm } from 'dolphindb'

import { WidgetChartType, dashboard, type Widget } from '../model.js'

import { parse_code } from '../utils.js'

import { model } from '../../model.js'

import { t } from '../../../i18n/index.js'

import { DataSourceList } from './DataSourceList.js'
import { SqlEditor } from './SqlEditor.js'
import { StreamEditor } from './StreamEditor.js'


import {
    data_sources,
    find_data_source_index, 
    get_data_source,
    save_data_source, 
    subscribe_data_source, 
    type DataSource,
    type DataSourcePropertyType,
} from './date-source.js'



const save_confirm_config = {
    cancelText: t('不保存'),
    okText: t('保存'),
    style: { top: '250px' },
    maskStyle: { backgroundColor: 'rgba(0,0,0,.2)' },
    title: t('此数据源存在未保存的更改。你想保存吗？'),   
}

interface IProps extends ButtonProps {
    widget?: Widget
    text?: string
}

export function DataSourceConfig (props: IProps, ref) {
    const { widget, text, ...btn_props } = props
    const { visible, open, close } = use_modal()
    const [modal, contextHolder] = Modal.useModal()
    const { config } = dashboard.use(['config'])
    
    const [show_preview, set_show_preview] = useState(false) 
    // 当前选择应用的数据源
    const [selected_data_sources, set_selected_data_sources] = useState<string[]>(widget?.source_id ?? [ ])
    // 当前点击查看的数据源
    const [current_data_source, set_current_data_source] = useState<DataSource>(null)
    const [loading, set_loading] = useState('')
    
    const no_save_flag = useRef(false)
    
    const is_multi_data_source = useMemo(
        () => WidgetChartType.COMPOSITE_GRAPH === widget?.type
        , [widget?.type])
    
    useEffect(() => { 
        // 非多选数据源的情况下，当前查看数据源即为当前选中数据源
        if (!is_multi_data_source && current_data_source)
            set_selected_data_sources([current_data_source.id])
    }, [current_data_source, is_multi_data_source])
    
    useEffect(() => {
       change_current_data_source('')
    }, [config?.id])
    
    const change_current_data_source = useCallback((key: string) => {
        if (key === '') {
            set_current_data_source(null)
            return
        }    
        set_current_data_source(cloneDeep(get_data_source(key)))
        set_show_preview(false)
    }, [ ])
    
    const change_current_data_source_property = useCallback(
        (key: string, value: DataSourcePropertyType, save_confirm = true) => {
            set_current_data_source((pre: DataSource) => {
                pre[key] = value
                return cloneDeep(pre)
            })
            if (save_confirm)
                no_save_flag.current = true 
        }, [ ])
    
    const handle_save = useCallback(async () => {
        if (current_data_source)
            await save_data_source(current_data_source)
        no_save_flag.current = false
    }, [current_data_source])
    
    const handle_close = useCallback(async () => {
        if (loading)
            return
        if (no_save_flag.current && await modal.confirm(save_confirm_config) ) {
            await handle_save()
            no_save_flag.current = false
        }    
        close()
        set_show_preview(false)
    }, [no_save_flag.current, handle_save, loading])
    
    
    
    return <>
        <Button
            icon={<DatabaseOutlined className='data-source-config-trigger-navigation-icon' />}
            onClick={open}
            {...btn_props}
        >
            {!widget ? t('数据源') : text || t('点击填充数据源')}
        </Button>
            
        <Modal 
            title={t('配置数据源')}
            width='80%' 
            destroyOnClose
            className='data-source'
            open={visible}
            onCancel={handle_close} 
            maskClosable={false}
            styles={{ mask: { backgroundColor: 'rgba(84,84,84,0.5)' } }}
            afterOpenChange={() => {
                let idx = 0
                if (widget?.source_id?.length)  
                    idx = find_data_source_index(widget.source_id[0]) 
                set_current_data_source(cloneDeep(data_sources[Math.max(0, idx)]))
            }}
            footer={
                [
                    current_data_source?.mode === 'sql'
                    ? <Button 
                        key='preview' 
                        loading={loading === 'preview'}
                        onClick={
                            async () => {
                                if (loading)
                                    return
                                try {
                                    set_loading('preview')
                                    const { type, result } = await dashboard.execute_code(parse_code(dashboard.sql_editor.getValue()), model.ddb, true)
                                    change_current_data_source_property('error_message', type === 'success' ? '' : result as string, false)
                                    set_show_preview(true)
                                } finally {
                                    set_loading('')
                                }
                            }
                        }>
                        {t('预览')}
                    </Button>
                    : <div key='preview' />,
                    <Button
                        key='save'
                        type='primary'
                        disabled={
                            (widget?.type === WidgetChartType.HEATMAP && current_data_source?.type !== DdbForm.matrix) ||
                            (widget?.type !== WidgetChartType.HEATMAP && current_data_source?.type === DdbForm.matrix)
                        }
                        loading={loading === 'save'}
                        onClick={async () => {
                            try {
                                if (loading)
                                    return
                                set_loading('save')
                                await handle_save()
                                if (widget) {
                                    if (!selected_data_sources.length) {
                                        dashboard.message.warning(t('请选择数据源'))
                                        return
                                    }
                                    for (let id of selected_data_sources)  
                                        await subscribe_data_source(widget, id)
                                    dashboard.update_widget({ ...widget, source_id: selected_data_sources })
                                    set_show_preview(false)
                                    close()
                                }
                            } finally {
                                set_loading('')
                            }
                        }
                    }>
                        {widget ? t('应用') : t('保存')}
                    </Button>,
                    <Button key='close' onClick={handle_close}>
                        {t('关闭')}
                    </Button>,
                ]
            }
        >
            {/* 未保存提示框 */}
            {contextHolder}
            <div className='data-source-config-main'>
                <DataSourceList
                    widget={widget}
                    loading={loading !== ''}
                    current_data_source={current_data_source}
                    no_save_flag={no_save_flag}
                    save_confirm={() => modal.confirm(save_confirm_config) }
                    handle_save={handle_save}
                    change_current_data_source={change_current_data_source}
                    on_select={(keys: string[]) => {
                        set_selected_data_sources(keys)
                    }}
                    change_current_data_source_property={change_current_data_source_property}
                />
                {current_data_source &&
                    <div className='config-right'>
                        <div className='config-right-top'>
                            <Tabs 
                                onChange={activeKey => { change_current_data_source_property('mode', activeKey) }} 
                                activeKey={current_data_source.mode} 
                                items={[
                                    {
                                        label: 'DolphinDB SQL',
                                        key: 'sql',
                                        disabled: loading !== ''
                                    },
                                    ...(current_data_source.type === DdbForm.matrix ? [ ] : [{
                                        label: t('流数据表'),
                                        key: 'stream',
                                        disabled: loading !== ''
                                    }])
                                ]} 
                            />
                        </div>
                        {current_data_source.mode === 'sql'
                            ? <SqlEditor 
                                loading={loading !== ''}
                                show_preview={show_preview} 
                                current_data_source={current_data_source}
                                close_preview={() =>  { set_show_preview(false) } } 
                                change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                                change_current_data_source_property={change_current_data_source_property}
                            />
                            : <StreamEditor 
                                loading={loading !== ''}
                                current_data_source={current_data_source} 
                                change_no_save_flag={(value: boolean) => no_save_flag.current = value}
                                change_current_data_source_property={change_current_data_source_property}
                            />
                        }
                    </div>
                }
            </div>
        </Modal>
    </>
}
