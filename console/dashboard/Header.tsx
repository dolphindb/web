import './Header.sass'

import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Tag, Tooltip, Upload } from 'antd'
import { DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FileOutlined, HomeOutlined, PauseOutlined, PlusCircleOutlined, SaveOutlined, ShareAltOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/modal.js'
import { genid } from 'xshell/utils.browser.js'

import { model } from '../model.js'
import { t } from '../../i18n/index.js'
import { CompileAndRefresh } from '../components/CompileAndRefresh.js'

import { type Widget, dashboard, type DashBoardConfig } from './model.js'
import { DataSourceConfig } from './DataSource/DataSourceConfig.js'
import { export_data_sources } from './DataSource/date-source.js'
import { VariableConfig } from './Variable/VariableConfig.js'
import { export_variables } from './Variable/variable.js'
import cn from 'classnames'


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
    label: string | JSX.Element
}


export function Header () {
    const { editing, widgets, configs, config } = dashboard.use(['editing', 'widgets', 'configs', 'config'])
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    
    useEffect(() => { 
        if (new URLSearchParams(location.search).get('mode') === 'create')
            add_open()
    }, [ ])
    
    async function save_config () {
        await dashboard.update_config({
            ...config,
            data: {
                datasources: await export_data_sources(),
                variables: await export_variables(),
                canvas: {
                    widgets: widgets.map(widget => get_widget_config(widget))
                }
            }
            
        })
    }
    
    
    async function handle_save () {
        try {
            await save_config()
            await dashboard.save_configs_to_server()
            dashboard.message.success(t('dashboard 保存成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    
    async function handle_add () {
        try {
            if (!new_dashboard_name) {
                dashboard.message.error(t('dashboard 名称不允许为空'))
                return 
            }
            
            if (configs?.find(({ name }) => name === new_dashboard_name)) {
                dashboard.message.error(t('名称重复，请重新输入'))
                return 
            }
            
            await dashboard.update_config(dashboard.generate_new_config(new_dashboard_name))
            
            await dashboard.save_configs_to_server()
            
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
                dashboard.message.error(t('dashboard 名称不允许为空'))
                return 
            }
            
            if (configs.find(({ id, name }) => id !== config.id && name === edit_dashboard_name)) {
                dashboard.message.error(t('名称重复，请重新输入'))
                return
            }
            
            await dashboard.update_config({
                ...config,
                name: edit_dashboard_name,
            })
            
            await dashboard.save_configs_to_server()
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
                dashboard.message.error(t('当前 dashboard 列表为空'))
                return
            }
            
            await dashboard.update_config(config, true)
            
            await dashboard.save_configs_to_server()
            
            dashboard.message.success(t('删除成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
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
            onChange={(_, option: DashboardOption) => {
                const current_dashboard = configs.find(({ id }) => id === option.key)
                dashboard.update_config(
                    current_dashboard
                )
                if (current_dashboard.owned)
                    on_edit()
                else
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
        
        { editing && <div className='actions'>
            <Modal open={add_visible}
                   maskClosable={false}
                   onCancel={add_close}
                   onOk={handle_add}
                   closeIcon={false}
                   title={t('请输入 dashboard 的名称')}>
                <Input value={new_dashboard_name}
                       onChange={event => { set_new_dashboard_name(event.target.value) }}
                       />
            </Modal>
            
            <Modal open={edit_visible}
                   maskClosable={false}
                   onCancel={edit_close}
                   onOk={handle_edit}
                   closeIcon={false}
                   title={t('请输入新的 dashboard 名称')}>
                <Input value={edit_dashboard_name} onChange={event => { set_edit_dashboard_name(event.target.value) }}/>
            </Modal>
            
            <Tooltip title='返回 Dashboard 管理界面'>
                <Button className='action' onClick={() => { 
                    dashboard.set({ config: null })
                    model.set_query('dashboard', null)
                    model.set({ sider: true, header: true })
                }}><HomeOutlined /></Button>
            </Tooltip>
            
            <Tooltip title='新增'>
                <Button
                    className='action'
                    onClick={() => {
                        add_open()
                        set_new_dashboard_name(String(genid()).slice(0, 4))
                    }}
                >
                    <FileOutlined />
                </Button>
            </Tooltip>
            
            <Tooltip title='修改'>
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
                        await save_config()
                        
                        let a = document.createElement('a')
                        a.download = `dashboard.${config.id}.json`
                        a.href = URL.createObjectURL(
                            new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' })
                        )
                        
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                    } catch (error) {
                        model.show_error({ error })
                    }
                }}><DownloadOutlined /></Button>
            </Tooltip>
            
            <Tooltip title={t('导入')}>
                <Upload
                    showUploadList={false}
                    beforeUpload={async file => {
                        dashboard.update_config(
                            JSON.parse(await file.text()) as DashBoardConfig
                        )
                        
                        return false
                    }}
                >
                    <Button className='action'>
                        <UploadOutlined />
                    </Button>
                </Upload>
            </Tooltip>
            <Tooltip title={t('分享')}>
                <Button className='action'><ShareAltOutlined/></Button>
            </Tooltip>
            <Tooltip title='删除'>
                <Button className='action' onClick={handle_delete}><DeleteOutlined /></Button>
            </Tooltip>
            
            <Tooltip title='刷新'>
                <Button className='action' onClick={() => { dashboard.message.error(t('功能还未实现')) }}><SyncOutlined /></Button>
            </Tooltip>
            
            <Tooltip title='暂停流数据接收'>
                <Button className='action' onClick={() => { dashboard.message.error(t('功能还未实现')) }}><PauseOutlined /></Button>
            </Tooltip>
            
            { model.dev && <CompileAndRefresh /> }
        </div> }
        
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
