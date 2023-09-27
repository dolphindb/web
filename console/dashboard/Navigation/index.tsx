import './index.sass'

import { useState, useCallback } from 'react'
import { Button, Input, Modal, Select, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined, FileOutlined, HomeOutlined, PauseOutlined, PlusCircleOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/modal.js'
import { genid } from 'xshell/utils.browser.js'

import { model } from '../../model.js'
import { t } from '../../../i18n/index.js'
import { CompileAndRefresh } from '../../components/CompileAndRefresh.js'

import { type Widget, dashboard } from '../model.js'
import { DataSourceConfig } from '../DataSource/DataSourceConfig.js'
import { export_data_sources } from '../DataSource/date-source.js'
import { VariableConfig } from '../Variable/VariableConfig.js'
import { export_variables } from '../Variable/variable.js'


function get_widget_config (widget: Widget) {
    return  {
        id: widget.id,
        w: widget.w,
        h: widget.h,
        x: widget.x,
        y: widget.y,
        type: widget.type,
        source_id: widget.source_id,
        config: widget.config,
    }
    
}

interface DashboardOption {
    key: number
    value: string
    label: string
}


export function Navigation () {
    const { editing, widgets, configs, config } = dashboard.use(['editing', 'widgets', 'configs', 'config'])
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    // console.log('names', configs?.map(config => config.name))
    function get_new_config () {
        return {
            id: genid(),
            name: new_dashboard_name,
            datasources: [ ],
            variables: [ ],
            canvas: {
                widgets: [ ],
            }
        }
    }
    
    async function handle_save () {
        const new_config =  {
            ...config,
            datasources: await export_data_sources(),
            variables: await export_variables(),
            canvas: {
                widgets: widgets.map(widget => get_widget_config(widget))
            }
        }
        dashboard.set({ config: new_config, 
                        configs: [...configs.filter(({ id }) => id !== config.id), new_config] })
        try {
            await dashboard.save_configs()
            dashboard.message.success(t('dashboard 保存成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    
    async function handle_add () {
        if (!new_dashboard_name) {
            dashboard.message.error(t('dashboard 名称不允许为空'))
            return 
        } 
        if (configs.find(({ name }) => name === new_dashboard_name)) {
            dashboard.message.error(t('名称重复，请重新输入'))
            return 
        } 
        const new_dashboard_config = get_new_config()
        dashboard.set({ config: new_dashboard_config })
        dashboard.set({ configs: [...configs, new_dashboard_config] })
        try {
            await dashboard.save_configs()
            dashboard.message.success(t('添加成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
        add_close()
    }
    
    
    async function handle_edit () {
        if (!edit_dashboard_name) {
            dashboard.message.error(t('dashboard 名称不允许为空'))
            return 
        }
        if (configs.find(({ id, name }) => id !== config.id && name === edit_dashboard_name)) {
            dashboard.message.error(t('名称重复，请重新输入'))
            return
        } 
        const edit_dashboard_config = {
            ...config,
            name: edit_dashboard_name,
        }
        dashboard.set({
            config: edit_dashboard_config,
            configs: [...configs.filter(({ id }) => id !== config.id), edit_dashboard_config]
        })
        
        try {
            await dashboard.save_configs()
            dashboard.message.success(t('修改成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
        edit_close()
    }
    
    
    async function handle_delete () {
        if (!configs.length) {
            dashboard.message.error(t('当前 dashboard 列表为空'))
            return 
        }
        const other_configs = configs.filter(({ id }) => id !== config.id)
        dashboard.set({
            configs: other_configs,
            config: other_configs[0]
        })
        try {
            await dashboard.save_configs()
            dashboard.message.success(t('删除成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
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
                onChange={(value: string, option: DashboardOption) => {
                    const choose_config = configs.find(({ id }) => id === option.key) 
                    dashboard.set({ config: choose_config, widget: null })
                    
                    // dashboard.set({ widgets: choose_config.canvas.widgets })
                    const url_params = new URLSearchParams(location.search)
                    const url = new URL(location.href)
                    url_params.set('dashboard', String(choose_config.id))
                    url.search = url_params.toString()
                    history.replaceState({ }, '', url)
                }}
                // defaultValue={ config?.name || new_dashboard_name}
                value={config?.name}
                bordered={false}
                options={configs?.map(({ id, name }) => ({
                    key: id,
                    value: name,
                    label: name
                }))}
                // options={[
                //     { value: 'dashboard1', label: 'dashboard1' },
                //     { value: 'dashboard2', label: 'dashboard2' },
                //     { value: 'dashboard3', label: 'dashboard3' },
                // ]}
            />
        </div>
        <div className='right'>
            <div className='right-icons'>
                <Modal open={add_visible}
                       onCancel={add_close}
                       onOk={handle_add}
                       closeIcon={false}
                       title={t('请输入 dashboard 的名称')}>
                    <Input value={new_dashboard_name}
                           onChange={event => { set_new_dashboard_name(event.target.value) }}
                           />
                </Modal>
                
                <Modal open={edit_visible}
                       onCancel={edit_close}
                       onOk={handle_edit}
                       closeIcon={false}
                       title={t('请输入新的 dashboard 名称')}>
                    <Input value={edit_dashboard_name}
                           onChange={event => { set_edit_dashboard_name(event.target.value) }}/>
                </Modal>
                
                <Tooltip title='返回交互编程'>
                    <Button className='action'><HomeOutlined onClick={back_to_home} /></Button>
                </Tooltip>
                
                <Tooltip title='新增'>
                    <Button
                        className='action'
                        onClick={() => {
                            add_open()
                            set_new_dashboard_name(`dashboard-${String(genid()).slice(0, 4)}`)
                        }}
                    >
                        <FileOutlined />
                    </Button>
                </Tooltip>
                
                <Tooltip title='保存'>
                    <Button className='action' onClick={handle_save}><SaveOutlined /></Button>
                </Tooltip>
                
                <Tooltip title='修改'>
                    <Button className='action' 
                            onClick={() => { 
                                edit_open()
                                set_edit_dashboard_name(config?.name) 
                            }}>
                                <EditOutlined />
                    </Button>
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
                
                { model.dev && <CompileAndRefresh /> }
            </div>
            
            <div className='right-editormode'>
                <span
                    className={`right-editormode-editor ${editing ? 'editormode-selected' : ''}`}
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
                <VariableConfig/>
                <DataSourceConfig/>
            </div>
        </div>
    </div>
}
