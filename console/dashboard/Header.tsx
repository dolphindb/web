import './Header.sass'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input, Modal, Popconfirm, Select, Tag, Tooltip, Segmented, Switch } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FileAddOutlined, HomeOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/hooks.js'
import { genid } from 'xshell/utils.browser.js'

import cn from 'classnames'

import NiceModal from '@ebay/nice-modal-react'

import type { SwitchProps } from 'antd/lib/index.js'

import { model, storage_keys } from '../model.js'
import { t } from '../../i18n/index.js'
import { CompileAndRefresh } from '../components/CompileAndRefresh.js'

import { HostSelect } from '../components/HostSelect.js'

import { type Widget, dashboard, DashboardPermission } from './model.js'
import { DataSourceConfig } from './DataSource/DataSourceConfig.js'
import { clear_data_sources, export_data_sources } from './DataSource/date-source.js'
import { VariableConfig } from './Variable/VariableConfig.js'
import { export_variables } from './Variable/variable.js'

import { check_name } from './utils.js'
import { Import } from './Import/Import.js'
import { Share } from './Share/Share.js'
import { DashboardMode } from './type.js'
import { SaveConfirmModal } from './components/SaveComfirmModal.js'


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
    const { editing, widgets, configs, config, auto_save } = dashboard.use(['editing', 'widgets', 'configs', 'config', 'auto_save'])
    const [new_dashboard_id, set_new_dashboard_id] = useState<number>()
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    const [copy_dashboard_name, set_copy_dashboard_name] = useState('')
    
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    const { visible: copy_visible, open: copy_open, close: copy_close } = use_modal()
    
    const timer = useRef<NodeJS.Timeout>()
    
    const get_latest_config = useCallback(async () => {
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
    }, [widgets]) 
    
    
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
    
    
    const handle_save = useCallback(async () => {
        const updated_config = await get_latest_config()
        console.log(updated_config, 'updated_config')
        await dashboard.update_dashboard_config(updated_config)
        dashboard.set({ save_confirm: false })
        dashboard.message.success(t('数据面板保存成功'))
    }, [get_latest_config]) 
    
    
    useEffect(() => { 
        if (auto_save && editing) { 
            if (timer.current)
                clearInterval(timer.current)
            timer.current = setInterval(handle_save, 60 * 1000)
        } else
            clearInterval(timer.current)
        
        return () => { clearInterval(timer.current) }
    }, [auto_save, handle_save, editing])
    
    
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
    async function handle_destroy () {
        if (!configs.length) {
            dashboard.message.error(t('当前数据面板列表为空'))
            return
        }
        
        clear_data_sources()
        
        await dashboard.delete_dashboard_configs([config.id])
        
        const filtered_configs = configs.filter(({ id }) => id !== config.id)
        if (filtered_configs.length)
            model.set_query('dashboard', String(filtered_configs[0].id))
        else 
            dashboard.return_to_overview()
        
        dashboard.message.success(t('删除成功'))
    }
    
    /** 切换预览与编辑模式 */
    function on_change_mode (value: DashboardMode) {
        if (value === DashboardMode.editing) { 
            dashboard.set_editing(true)
            model.set_query('preview', null)
        } else
            dashboard.on_preview()
    }
    
    
    /** 切换 dashboard */
    async function on_change_dashboard (_, option: DashboardOption) { 
        async function handle_change () { 
            const current_dashboard = configs.find(({ id }) => id === option.key)
            clear_data_sources()
            await dashboard.render_with_config(current_dashboard)
            if (current_dashboard.permission === DashboardPermission.view)
                dashboard.on_preview()
        }
        if (config.permission === DashboardPermission.view || !dashboard.save_confirm) 
            await handle_change()
         else  
            /** 未保存提示 */
            await NiceModal.show('dashboard-save-confirm-modal', {
                onCancel: async () => { 
                    dashboard.set({ save_confirm: false })
                    await handle_change()
                },
                onOk: async () => { 
                    dashboard.set({ save_confirm: false })
                    await handle_save()
                    await handle_change()
                }
            })
            
          
    }
    
    const on_auto_save = useCallback<SwitchProps['onChange']>(value => {
        dashboard.set({ auto_save: value })
        localStorage.setItem(storage_keys.dashboard_autosave, value ? '1' : '0')
    }, [ ])
    
    return <div className='dashboard-header'>
        {
            config?.permission === DashboardPermission.own
                ? <Select
                        className='switcher'
                        placeholder={t('选择 dashboard')}
                        onChange={on_change_dashboard}
                        value={config?.id}
                        variant='borderless'
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
                    if (config.permission === DashboardPermission.view || !dashboard.save_confirm)
                        dashboard.return_to_overview()
                    else
                        NiceModal.show('dashboard-save-confirm-modal', {
                            onCancel: dashboard.return_to_overview,
                            onOk: async () => { 
                                await handle_save()
                                dashboard.return_to_overview()                                    
                            }
                        })
                    
                }}><HomeOutlined /></Button>
            </Tooltip>
            
            <SaveConfirmModal id='dashboard-save-confirm-modal' />
            
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
                        
                        const copy_dashboard = dashboard.generate_new_config(genid(), copy_dashboard_name, config.data)
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
            
                <Import type='icon'/>
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
                
                <Tooltip title='开启自动保存后，将每隔 1 分钟保存一次配置'>
                    <div className='auto-save-wrapper'>
                        <span className='auto-save-label'>自动保存</span>
                        <Switch size='small' defaultChecked={auto_save} onChange={on_auto_save} />
                    </div>
                </Tooltip>
            </>}
            
            {(model.dev || model.test ) && <HostSelect />}
        
            {model.dev && <CompileAndRefresh />}
        </div>
        
        {
            config?.permission !== DashboardPermission.view && <Segmented
                options={[
                    { label: <><EditOutlined /> {t('编辑')}</>, value: DashboardMode.editing },
                    { label: <><EyeOutlined /> {t('预览')}</>, value: DashboardMode.preview }
                ]}
                onChange={on_change_mode}
                className='dashboard-modes'
                defaultValue={editing ? DashboardMode.editing : DashboardMode.preview}
            />
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
