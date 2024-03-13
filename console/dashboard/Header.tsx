import './Header.sass'

import { useState } from 'react'
import { Button, Input, Modal, Popconfirm, Select, Tag, Tooltip, } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FileAddOutlined, HomeOutlined, RollbackOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/hooks.js'
import { genid } from 'xshell/utils.browser.js'

import { model } from '../model.js'
import { t } from '../../i18n/index.js'
import { CompileAndRefresh } from '../components/CompileAndRefresh.js'

import { type Widget, dashboard, DashboardPermission } from './model.js'
import { DataSourceConfig } from './DataSource/DataSourceConfig.js'
import { clear_data_sources, export_data_sources } from './DataSource/date-source.js'
import { VariableConfig } from './Variable/VariableConfig.js'
import { export_variables } from './Variable/variable.js'
import cn from 'classnames'
import { HostSelect } from '../components/HostSelect.js'
import { check_name } from './utils.js'
import { Import } from './Import/Import.js'
import { Share } from './Share/Share.js'


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
    value: number
    label: string | JSX.Element
}


export function Header () {
    const { editing, widgets, configs, config } = dashboard.use(['editing', 'widgets', 'configs', 'config'])
    const [new_dashboard_id, set_new_dashboard_id] = useState<number>()
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    const [copy_dashboard_name, set_copy_dashboard_name] = useState('')
    
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    const { visible: save_visible, open: save_open, close: save_close } = use_modal()
    const { visible: copy_visible, open: copy_open, close: copy_close } = use_modal()
    
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
    // function exact_config (config: DashBoardConfig) {
    //     return { ...config, 
    //              data: { 
    //                     ...config.data, 
    //                     datasources: config.data.datasources.map(ds => ({ 
    //                             ...ds, 
    //                             cols: [ ], 
    //                             deps: [ ],
    //                             error_message: '' })),
    //                     variables: config.data.variables.map(va => ({
    //                             ...va,
    //                             deps: [ ]
    //                     })) 
    //                 } 
    //             }
    // }
    
    
    async function handle_save () {
        const updated_config = await get_latest_config()
        await dashboard.update_dashboard_config(updated_config)
        dashboard.set({ save_confirm: false })
        dashboard.message.success(t('数据面板保存成功'))
    }
    
    
    async function handle_add () {
        const check_name_message = check_name(new_dashboard_name)
        if (check_name_message) {
            dashboard.message.error(check_name_message)
            return
        }
        
        const new_dashboard_config = dashboard.generate_new_config(new_dashboard_id, new_dashboard_name)
        
        // await dashboard.update_config(new_dashboard_config)
        await dashboard.add_dashboard_config(new_dashboard_config)
        await dashboard.render_with_config(new_dashboard_config)
        dashboard.message.success(t('添加成功'))
        add_close()
    }
    
    
    async function handle_edit () {
        const check_name_message = check_name(edit_dashboard_name)
        if (check_name_message) {
            dashboard.message.error(check_name_message)
            return
        }
        
        // const updated_config = {
        //     ...config,
        //     name: edit_dashboard_name,
        // }
        
        // await dashboard.update_config(updated_config)
        await dashboard.rename_dashboard(config.id, edit_dashboard_name)
        // await dashboard.save_configs_to_local()
        dashboard.message.success(t('修改成功'))
        
        edit_close()
    }
    
    /** 删除和撤销的回调 */
    async function handle_destroy (revoke = false) {
        if (!configs.length) {
            dashboard.message.error(t('当前数据面板列表为空'))
            return
        }
        
        clear_data_sources()
        
        // if (revoke)
        //     await dashboard.revoke(config.id)
        // else
            await dashboard.delete_dashboard_configs([config.id])
        
        const filtered_configs = configs.filter(({ id }) => id !== config.id)
        model.set_query('dashboard', String(filtered_configs[0].id))
        
        // await dashboard.update_config(config, true)
        
        // await dashboard.save_configs_to_local()
        
        dashboard.message.success(revoke ? t('撤销成功') : t('删除成功'))
    }
    
    
    function return_to_overview () {
        clear_data_sources()
        dashboard.set({ config: null, save_confirm: false })
        model.set_query('dashboard', null)
        model.set({ sider: true, header: true })
    }
    
    function on_preview () {
        dashboard.set_editing(false)
        model.set_query('preview', '1')
    }
    
    
    function on_edit () { 
        dashboard.set_editing(true)
        dashboard.set({ save_confirm: true })
        model.set_query('preview', null)
    }
    
    
    return <div className='dashboard-header'>
        {
            config?.permission === DashboardPermission.own
                ? <Select
                        className='switcher'
                        placeholder={t('选择 dashboard')}
                        onChange={async (_, option: DashboardOption) => {
                            const current_dashboard = configs.find(({ id }) => id === option.key)
                            clear_data_sources()
                            // await dashboard.update_config(
                            //     current_dashboard
                            // )
                            dashboard.render_with_config(current_dashboard)
                            if (current_dashboard.permission === DashboardPermission.view)
                                on_preview()
                                
                        }}
                        // defaultValue={ config?.name || new_dashboard_name}
                        value={config?.id}
                        bordered={false}
                        options={configs?.map(({ id, name, permission }) => ({
                            key: id,
                            value: id,
                            label: <div className='dashboard-options-label'>
                                <span className={cn({ 'dashboard-options-label-name': permission })}>{name}</span>
                                {permission !== DashboardPermission.own && <Tag color='processing' className='status-tag' >{permission === DashboardPermission.edit ? t('仅编辑') : t('仅预览')}</Tag> }
                            </div>
                        }))}
                    />
                : <div className='dashboard-share-label'>{config?.name}</div>
        }
        
        <div className='actions'>
            <Tooltip title={t('返回主界面')}>
                <Button className='action' onClick={async () => { 
                    // const latest_config = exact_config(await get_latest_config())
                    // const server_config = exact_config(await dashboard.get_dashboard_config(config.id) as DashBoardConfig)
                    // if (JSON.stringify(latest_config) === JSON.stringify(server_config)) 
                    //     return_to_overview()
                    // else
                    if (config.permission === DashboardPermission.view || !dashboard.save_confirm)
                        return_to_overview()
                    else
                        save_open()
                    
                }}><HomeOutlined /></Button>
            </Tooltip>
            
            
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
                title={t('离开此界面您当前更改会丢失，是否需要保存当前更改')} />
            
            {editing && <>
                <Modal open={add_visible}
                    maskClosable={false}
                    onCancel={add_close}
                    onOk={handle_add}
                    closeIcon={false}
                    title={t('新数据面板')}>
                    <Input 
                        value={new_dashboard_name}
                        placeholder={t('请输入新数据面板的名称')}
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
                
                <Modal
                    open={copy_visible}
                    onCancel={copy_close}
                    onOk={async () => {
                        const check_name_message = check_name(copy_dashboard_name)
                        if (check_name_message) {
                            dashboard.message.error(check_name_message)
                            return
                        }
                        
                        const copy_dashboard = dashboard.generate_new_config(5605049565005838, copy_dashboard_name, config.data)
                        await dashboard.add_dashboard_config(copy_dashboard)
                        dashboard.message.success(t('创建副本成功'))
                        
                        copy_close()
                    }}
                    title={t('请输入 dashboard 副本名称')}
                >
                    <Input
                        value={copy_dashboard_name}
                        onChange={event => {
                            set_copy_dashboard_name(event.target.value)
                        }}
                    />
                </Modal>
                
                <Tooltip title={t('新增')}>
                    <Button
                        className='action'
                        onClick={() => {
                            const new_id = genid()
                            set_new_dashboard_id(new_id)                
                            set_new_dashboard_name('')
                            add_open()
                        }}
                    >
                        <FileAddOutlined />
                    </Button>
                </Tooltip>
            
                <Tooltip title={t('保存')}>
                    <Button className='action' onClick={handle_save}><SaveOutlined /></Button>
                </Tooltip>
            
                {
                    dashboard.config?.permission !== DashboardPermission.view
                        && <>
                            <Tooltip title={t('导出')}>
                                <Button className='action' onClick={async () => {
                                    await get_latest_config()
                                    
                                    let a = document.createElement('a')
                                    a.download = `dashboard.${config.name}.json`
                                    a.href = URL.createObjectURL(
                                        new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' })
                                    )
                                    
                                    document.body.appendChild(a)
                                    a.click()
                                    document.body.removeChild(a)
                                }}><UploadOutlined /></Button>
                            </Tooltip>
                            <Tooltip title={t('创建副本')}>
                                <Button className='action' onClick={() => {
                                    set_copy_dashboard_name(config.name)
                                    copy_open()    
                                }}>
                                    <CopyOutlined />
                                </Button>
                            </Tooltip>
                        </>
                }
            
                <Import type='icon'/>
                {
                    dashboard.config?.permission === DashboardPermission.own 
                        ? <>
                            <Tooltip title={t('修改名称')}>
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
                            <Share dashboard_ids={[dashboard.config?.id]} trigger_type='icon' />
                            <Popconfirm
                                title={t('删除')}
                                description={t('确定当前 dashboard 删除吗？')}
                                onConfirm={async () => { handle_destroy() }}
                                okText={t('确认删除')}
                                cancelText={t('取消')}
                            >
                                <Tooltip title={t('删除')}>
                                    <Button className='action'><DeleteOutlined /></Button>
                                </Tooltip>
                            </Popconfirm>
                        </> 
                        : <Tooltip title={t('撤销')}>
                            <Button className='action' onClick={async () => { handle_destroy(true) }}><RollbackOutlined /></Button>
                        </Tooltip>
                }
                {(model.dev || model.cdn ) && <HostSelect />}
            
                {model.dev && <CompileAndRefresh />}
            </>
            }  
        </div>
        
        {
            config?.permission !== DashboardPermission.view && <div className='modes'>
            <span
                className={`right-editormode-editor ${editing ? 'editormode-selected' : ''}`}
                onClick={on_edit}
            >
                <EditOutlined /> {t('编辑')}
            </span>
            <span className='divider'>|</span>
            <span
                className={`right-editormode-preview ${editing ? '' : 'editormode-selected'} `}
                onClick={on_preview}
            >
                <EyeOutlined /> {t('预览')}
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
