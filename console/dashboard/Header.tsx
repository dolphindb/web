import './Header.sass'

import { useState } from 'react'
import { Button, Input, Modal, Select, Tag, Tooltip, Upload } from 'antd'
import { DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FileAddOutlined, HomeOutlined, PauseOutlined, PlusCircleOutlined, SaveOutlined, ShareAltOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/modal.js'
import { genid } from 'xshell/utils.browser.js'

import { model } from '../model.js'
import { t } from '../../i18n/index.js'
import { CompileAndRefresh } from '../components/CompileAndRefresh.js'

import { type Widget, dashboard, type DashBoardConfig } from './model.js'
import { DataSourceConfig } from './DataSource/DataSourceConfig.js'
import { clear_data_sources, export_data_sources } from './DataSource/date-source.js'
import { VariableConfig } from './Variable/VariableConfig.js'
import { export_variables } from './Variable/variable.js'
import cn from 'classnames'
import { HostSelect } from '../components/HostSelect.js'


export function get_widget_config (widget: Widget) {
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
    label: string | JSX.Element
}


export function Header () {
    const { editing, widgets, configs, config } = dashboard.use(['editing', 'widgets', 'configs', 'config'])
    const [new_dashboard_id, set_new_dashboard_id] = useState<number>()
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    const { visible: save_visible, open: save_open, close: save_close } = use_modal()
    
    async function get_latest_config () {
        const updated_config = {
            ...config,
            data: {
                datasources: await export_data_sources(),
                variables: await export_variables(),
                canvas: {
                    widgets: widgets.map(widget => get_widget_config(widget))
                }
            }  
            
        }
        // await dashboard.update_config(updated_config)
        return updated_config
    }
    
    /** 生成可以比较的 config */
    function exact_config (config: DashBoardConfig) {
        return { ...config, 
                 data: { 
                        ...config.data, 
                        datasources: config.data.datasources.map(ds => ({ 
                                ...ds, 
                                cols: [ ], 
                                deps: [ ],
                                error_message: '' })),
                        variables: config.data.variables.map(va => ({
                                ...va,
                                deps: [ ]
                        })) 
                    } 
                }
    }
    
    
    async function handle_save () {
        try {
            const updated_config = await get_latest_config()
            await dashboard.update_dashboard_config(updated_config)
            dashboard.message.success(t('数据面板保存成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    
    async function handle_add () {
        try {
            if (!new_dashboard_name.trim()) {
                dashboard.message.error(t('数据面板名称不允许为空'))
                return 
            }
            
            if (configs?.find(({ name }) => name === new_dashboard_name)) {
                dashboard.message.error(t('名称重复，请重新输入'))
                return 
            }
            
            const new_dashboard_config = dashboard.generate_new_config(new_dashboard_id, new_dashboard_name)
            
            // await dashboard.update_config(new_dashboard_config)
            await dashboard.add_dashboard_config(new_dashboard_config)
            await dashboard.render_with_config(new_dashboard_config)
            model.set_query('dashboard', String(new_dashboard_id))
            dashboard.message.success(t('添加成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
        add_close()
    }
    
    
    async function handle_edit () {
        try {
            if (!edit_dashboard_name) {
                dashboard.message.error(t('数据面板名称不允许为空'))
                return 
            }
            
            if (configs.find(({ id, name }) => id !== config.id && name === edit_dashboard_name)) {
                dashboard.message.error(t('名称重复，请重新输入'))
                return
            }
            
            const updated_config = {
                ...config,
                name: edit_dashboard_name,
            }
            
            // await dashboard.update_config(updated_config)
            await dashboard.update_dashboard_config(updated_config)
            // await dashboard.save_configs_to_local()
            dashboard.message.success(t('修改成功'))
            
            edit_close()
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    
    async function handle_delete () {
        try {
            if (!configs.length) {
                dashboard.message.error(t('当前数据面板列表为空'))
                return
            }
            
            clear_data_sources()
            
            await dashboard.delete_dashboard_configs([config.id])
            const filtered_configs = configs.filter(({ id }) => id !== config.id)
            model.set_query('dashboard', String(filtered_configs[0].id))
            
            // await dashboard.update_config(config, true)
            
            // await dashboard.save_configs_to_local()
            
            dashboard.message.success(t('删除成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    
    function return_to_overview () {
        clear_data_sources()
        dashboard.set({ config: null })
        model.set_query('dashboard', null)
        model.set({ sider: true, header: true })
    }
    
    function on_preview () {
        dashboard.set_editing(false)
        model.set_query('preview', '1')
    }
    
    
    function on_edit () { 
        dashboard.set_editing(true)
        model.set_query('preview', null)
    }
    
    
    return <div className='dashboard-header'>
        <Select
            className='switcher'
            placeholder='选择 dashboard'
            onChange={async (_, option: DashboardOption) => {
                const current_dashboard = configs.find(({ id }) => id === option.key)
                clear_data_sources()
                // await dashboard.update_config(
                //     current_dashboard
                // )
                dashboard.render_with_config(current_dashboard)
                model.set_query('dashboard', String(current_dashboard.id))
                if (!current_dashboard.owned)
                    on_preview()
                    
            }}
            // defaultValue={ config?.name || new_dashboard_name}
            value={config?.name}
            bordered={false}
            options={configs?.map(({ id, name, owned }) => ({
                key: id,
                value: name,
                label: <div className='dashboard-options-label'>
                    <span className={cn({ 'dashboard-options-label-name': !owned })}>{name}</span>
                    {!owned && <Tag color='processing' className='status-tag' >{t('他人分享')}</Tag> }
                </div>
            }))}
        />
        
        <div className='actions'>
            <Tooltip title='返回'>
                <Button className='action' onClick={async () => { 
                    const latest_config = exact_config(await get_latest_config())
                    const server_config = exact_config(await dashboard.get_dashboard_config(config.id) as DashBoardConfig)
                    if (JSON.stringify(latest_config) === JSON.stringify(server_config)) 
                        return_to_overview()
                    else
                        save_open()
                    
                }}><HomeOutlined /></Button>
            </Tooltip>
            {editing && <>
                <Modal open={add_visible}
                    maskClosable={false}
                    onCancel={add_close}
                    onOk={handle_add}
                    closeIcon={false}
                    title={t('请输入数据面板的名称')}>
                    <Input value={new_dashboard_name}
                        onChange={event => { set_new_dashboard_name(event.target.value) }}
                        />
                </Modal>
            
                <Modal open={edit_visible}
                    maskClosable={false}
                    onCancel={edit_close}
                    onOk={handle_edit}
                    closeIcon={false}
                    title={t('请输入新的数据面板名称')}>
                    <Input value={edit_dashboard_name} onChange={event => { set_edit_dashboard_name(event.target.value) }}/>
                </Modal>
                
                <Modal open={save_visible}
                    maskClosable={false}
                    onCancel={return_to_overview}
                    onOk={async () => { 
                        await handle_save()
                        save_close()
                        return_to_overview()                                    
                    }}
                    okText={t('保存')}
                    cancelText={t('不保存')}
                    closeIcon={false}
                    title={t('当前数据面板未保存，是否需要保存')} />
                
                <Tooltip title='新增'>
                    <Button
                        className='action'
                        onClick={() => {
                            const new_id = genid()
                            set_new_dashboard_id(new_id)                
                            set_new_dashboard_name(String(new_id).slice(0, 4))
                            add_open()
                        }}
                    >
                        <FileAddOutlined />
                    </Button>
                </Tooltip>
            
                <Tooltip title='修改名称'>
                    <Button
                        className='action' 
                        onClick={() => { 
                            edit_open()
                            set_edit_dashboard_name(config?.name) 
                        }}
                    >
                        <EditOutlined />
                    </Button>
                </Tooltip>
            
                <Tooltip title='保存'>
                    <Button className='action' onClick={handle_save}><SaveOutlined /></Button>
                </Tooltip>
            
                <Tooltip title={t('导出')}>
                    <Button className='action' onClick={async () => {
                        try {
                            await get_latest_config()
                            
                            let a = document.createElement('a')
                            a.download = `dashboard.${config.name}.json`
                            a.href = URL.createObjectURL(
                                new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' })
                            )
                            
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                        } catch (error) {
                            model.show_error({ error })
                        }
                    }}><UploadOutlined /></Button>
                </Tooltip>
            
                <Tooltip title={t('导入')}>
                    <Upload
                        showUploadList={false}
                        beforeUpload={async file => {
                            try {
                                const import_config = JSON.parse(await file.text()) as DashBoardConfig
                                if (configs.findIndex(c => c.id === import_config.id) !== -1)
                                    await dashboard.update_dashboard_config(import_config)
                                else
                                    await dashboard.add_dashboard_config(import_config)
                                model.set_query('dashboard', String(import_config.id))
                                return false
                            } catch (error) {
                                dashboard.show_error({ error })
                                throw error
                            }
                        }}
                    >
                        <Button className='action'>
                            <DownloadOutlined />
                        </Button>
                    </Upload>
                </Tooltip>
                <Tooltip title={t('分享')}>
                    <Button className='action'><ShareAltOutlined/></Button>
                </Tooltip>
                <Tooltip title='删除'>
                    <Button className='action' onClick={handle_delete}><DeleteOutlined /></Button>
                </Tooltip>
                {(model.dev || model.cdn ) && <HostSelect />}
            
                {model.dev && <CompileAndRefresh />}
            </>
            }
            {/* <Tooltip title='刷新'>
                <Button className='action' onClick={() => { dashboard.message.error(t('功能还未实现')) }}><SyncOutlined /></Button>
            </Tooltip>
            
            <Tooltip title='暂停流数据接收'>
                <Button className='action' onClick={() => { dashboard.message.error(t('功能还未实现')) }}><PauseOutlined /></Button>
            </Tooltip>
             */}
            
           
           
        </div>
        
        {
            config?.owned && <div className='modes'>
            <span
                className={`right-editormode-editor ${editing ? 'editormode-selected' : ''}`}
                onClick={on_edit}
            >
                <EditOutlined /> 编辑
            </span>
            <span className='divider'>|</span>
            <span
                className={`right-editormode-preview ${editing ? '' : 'editormode-selected'} `}
                onClick={on_preview}
            >
                <EyeOutlined /> 预览
            </span>
        </div>
        
        }
        
        <div className='padding' />
        
        {
            editing && <div className='configs'>
                <VariableConfig/>
                <DataSourceConfig/>
            </div>
        }
    </div>
}
