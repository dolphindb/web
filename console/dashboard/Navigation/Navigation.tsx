import { useState } from 'react'
import { Button, Input, Modal, Select, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined, FileOutlined, FolderAddOutlined, HomeOutlined, PauseOutlined, SyncOutlined } from '@ant-design/icons'

import { model } from '../../model.js'
import { Widget, dashboard } from '../model.js'
import { use_modal } from 'react-object-model/modal.js'
import { DataSourceConfig } from '../DataSource/DataSourceConfig.js'
import { genid } from 'xshell/utils.browser.js'
import { export_data_sources } from '../DataSource/date-source.js'
import './index.sass'
import { useCallback } from 'react'
import { t } from '../../../i18n/index.js'


function get_widget_config (widget: Widget) {
        return {
            id: widget.id,
            w: widget.w,
            h: widget.h,
            x: widget.x,
            y: widget.y,
            type: widget.type,
            source_id: widget.source_id,
            config: widget.config }
}

export function Navigation () {
    const { editing, widgets, configs, config } = dashboard.use(['editing', 'widgets', 'configs', 'config'])
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const { visible, open, close } = use_modal()
    
    async function handle_save () {
        console.log('config:', JSON.stringify( {
            ...config,
            datasources: export_data_sources(),
            canvas: {
                widgets: widgets.map(widget => get_widget_config(widget))
            }
        }))
        // const new_config =  {
        //     ...config,
        //     datasources: export_data_sources(),
        //     canvas: {
        //         widgets: widgets.map(widget => get_widget_config(widget))
        //     }
        // }
        // dashboard.set({ config: new_config, 
        //                 configs: [...configs.filter(({ id }) => id !== config.id), new_config] })
        // try {
        //     await dashboard.save_configs()
        //     model.message.success(t('dashboard 保存成功'))
        // } catch (error) {
        //     model.show_error({ error })
        // }
    }
    
    
    async function handle_add () {
        const new_dashboard_config = {
            id: genid(),
            name: new_dashboard_name,
            datasources: [ ],
            canvas: {
                widgets: [ ],
            }
        }
        dashboard.set({ configs: [...configs, new_dashboard_config] })
        // console.log(new_dashboard_config)
        try {
            await dashboard.save_configs()
            model.message.success(t('添加成功'))
        } catch (error) {
            model.show_error({ error })
        }
    }
    
    
    async function handle_delete () {
        dashboard.set({ configs: configs.filter(({ id }) => id !== config.id) })
        try {
            await dashboard.save_configs()
            model.message.success(t('删除成功'))
        } catch (error) {
            model.show_error({ error })
        }
    }
    
    const back_to_home = useCallback(() => { 
        model.set({ view: 'shell', sider: true, header: true })
    }, [ ])
    
    
    return <div className='dashboard-navigation'>
        <div className='left'>
            <Select
                className='left-select'
                placeholder='选择 dashboard'
                onChange={(value: string) => {
                    console.log(`selected ${value}`)
                    const url_params = new URLSearchParams(location.search)
                    const url = new URL(location.href)
                    url_params.set('dashboard', value)
                    url.search = url_params.toString()
                    location.href = url.toString()
                }}
                bordered={false}
                options={[
                    { value: 'dashboard1', label: 'dashboard1' },
                    { value: 'dashboard2', label: 'dashboard2' },
                    { value: 'dashboard3', label: 'dashboard3' },
                ]}
            />
        </div>
        <div className='right'>
            <div className='right-icons'>
                <Modal open={visible}
                       onCancel={close}
                       onOk={handle_add}
                       closeIcon={false}>
                    <Input value={new_dashboard_name}
                           onChange={event => set_new_dashboard_name(event.target.value)}/>
                </Modal>
                <Tooltip title='保存'>
                    <Button className='action' onClick={handle_save}><FileOutlined /></Button>
                </Tooltip>
                <Tooltip title='新增'>
                    <Button className='action' onClick={open}><FolderAddOutlined /></Button>
                </Tooltip>
                <Tooltip title='删除'>
                    <Button className='action' onClick={handle_delete}><DeleteOutlined /></Button>
                </Tooltip>
                <Tooltip title='刷新'>
                    <Button className='action'><SyncOutlined /></Button>
                </Tooltip>
                <Tooltip title='暂停流数据接收'>
                    <Button className='action'><PauseOutlined /></Button>
                </Tooltip>
            </div>
            <div className='right-editormode'>
                <span
                    className={
                        `right-editormode-editor ${editing ? 'editormode-selected' : ''}`
                    }
                    onClick={() => { dashboard.set_editing(true) }}
                >
                    <EditOutlined /> 编辑
                </span>
                <span className='divider'>|</span>
                <span
                    className={`right-editormode-preview ${editing ? '' : 'editormode-selected'} `}
                    onClick={() => { dashboard.set_editing(false) }}
                >
                    <EyeOutlined /> 预览
                </span>
            </div>
            <div className='right-config'>
                <DataSourceConfig/>
            </div>
            <div className='back-to-home'>
                <Tooltip title='返回交互编程'>
                    <HomeOutlined onClick={back_to_home} />
                </Tooltip>
            </div>
        </div>
    </div>
}
