import './Overview.sass'

import { useEffect, useState } from 'react'
import { Button, Input, Modal, Table, Upload, Popconfirm, Spin, Tag } from 'antd'
import { DeleteOutlined, DownloadOutlined, PlusCircleOutlined, UploadOutlined } from '@ant-design/icons'
import { downloadZip } from 'client-zip'
import cn from 'classnames'


import { use_modal } from 'react-object-model/modal.js'
import { genid } from 'xshell/utils.browser.js'

import { model } from '../model.js'
import { t } from '../../i18n/index.js'

import { type DashBoardConfig, dashboard, DashboardPermission } from './model.js'
import { Share } from './Share/Share.js'
import backend from './backend.dos'


export function Overview () {
    const { configs } = dashboard.use(['configs'])
    const [selected_dashboard_ids, set_selected_dashboard_ids] = useState([ ])
    const [current_dashboard, set_current_dashboard] = useState(null)
    const [new_dashboard_id, set_new_dashboard_id] = useState<number>()
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    
    let creator = use_modal()
    let editor = use_modal()
    let deletor = use_modal()
    
    const params = new URLSearchParams(location.search)
    
    useEffect(() => {
        model.execute(async () => {
            if (!model.logined) {
                model.goto_login()
                return
            }
            await dashboard.get_dashboard_configs()
        })
    }, [ ])
    
    
    useEffect(() => {
        if (params.get('create') === '1') {
            const new_id = genid()
            set_new_dashboard_id(new_id)                
            set_new_dashboard_name(String(new_id).slice(0, 4))
            creator.open()
        }
    }, [ ])
    
    
    if (!configs)
        return <div className='spin-container'>
            <Spin size='large' delay={300}/>
        </div>
    
    async function single_file_export (config_id: number) {
        await model.execute(() => {
            const config = configs.find(({ id }) => id === config_id)
            let a = document.createElement('a')
            a.download = `dashboard.${config.name}.json`
            a.href = URL.createObjectURL(new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' }))
            
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        })
    }
    
    
    return <div className='dashboard-overview'>
            <Modal
                open={creator.visible}
                onCancel={creator.close}
                onOk={async () => 
                    model.execute(async () => {
                        if (!new_dashboard_name.trim()) {
                            model.message.error(t('dashboard 名称不允许为空'))
                            return
                        }
                        if (new_dashboard_name.includes('/') || new_dashboard_name.includes('\\')) {
                            model.message.error(t('dashboard 名称中不允许包含 "/" 或 "\\" '))
                            return
                        }
                        
                        if (configs?.find(({ name }) => name === new_dashboard_name)) {
                            model.message.error(t('名称重复，请重新输入'))
                            return
                        }
                        
                        /** 待接口更新后修改 */
                        const new_dashboard = dashboard.generate_new_config(new_dashboard_id, new_dashboard_name)
                        
                        await dashboard.add_dashboard_config(new_dashboard, false)
                        
                        model.set_query('dashboard', String(new_dashboard.id))
                        model.set({ header: false, sider: false })
                        creator.close()
                    })
                }
                title={t('请输入新数据面板的名称')}
            >
                <Input
                    value={new_dashboard_name}
                    onChange={event => {
                        set_new_dashboard_name(event.target.value)
                    }}
                />
            </Modal>
            
            <Modal
                open={editor.visible}
                onCancel={editor.close}
                onOk={async () => 
                    model.execute(async () => {
                        if (!edit_dashboard_name) {
                            model.message.error(t('dashboard 名称不允许为空'))
                            return
                        }
                        if (edit_dashboard_name.includes('/') || edit_dashboard_name.includes('\\')) {
                            model.message.error(t('dashboard 名称中不允许包含 "/" 或 "\\" '))
                            return
                        }
                        
                        if (configs.find(({ id, name, permission }) => id !== current_dashboard.id && name === edit_dashboard_name && permission === DashboardPermission.own)) {
                            model.message.error(t('名称重复，请重新输入'))
                            return
                        }
                        
                        await dashboard.rename_dashboard(current_dashboard.id, edit_dashboard_name)
                        model.message.success(t('修改成功'))
                        
                        editor.close()
                })}
                title={t('请输入新的 dashboard 名称')}
            >
                <Input
                    value={edit_dashboard_name}
                    onChange={event => {
                        set_edit_dashboard_name(event.target.value)
                    }}
                />
            </Modal>
            
            <Modal
                open={deletor.visible}
                onCancel={deletor.close}
                onOk={async () => {
                        try {
                            selected_dashboard_ids.forEach(dashboard_id => {
                                const config = dashboard.configs.find(config => config.id = dashboard_id)
                                if (config?.permission !== DashboardPermission.own)
                                    throw new Error(t('您没有删除 {{name}} 的权限', { name: config.name })) 
                            })
                            
                            await dashboard.delete_dashboard_configs(selected_dashboard_ids, false)
                            set_selected_dashboard_ids([ ])
                            model.message.success(t('删除成功'))
                        } catch (error) {
                            model.show_error({ error })
                        } finally {
                            deletor.close()
                        }
                    }
                }
                title={t(`确认删除选中的 ${selected_dashboard_ids.length} 个数据面板吗？`)}
             />
            
            <Table
                rowSelection={{
                    selectedRowKeys: selected_dashboard_ids,
                    onChange: (selectedRowKeys: React.Key[]) => {
                        set_selected_dashboard_ids(selectedRowKeys)
                    }
                }}
                columns={[
                    {
                        title: t('名称'),
                        dataIndex: 'name',
                        key: 'name',
                        filters: [
                            {
                                text: t('拥有'),
                                value: DashboardPermission.own
                            },
                            {
                                text: t('仅编辑'),
                                value: DashboardPermission.edit
                            },
                            {
                                text: t('仅预览'),
                                value: DashboardPermission.view
                            }
                        ],
                        onFilter: (value, { permission }) => permission === value,
                        render: (text, { key, name, permission }) => <a
                                onClick={() => {
                                    const config = configs.find(({ id }) => id === key)
                                    dashboard.set({ config, editing: false })
                                    model.set_query('dashboard', String(config.id))
                                    model.set({ header: false, sider: false })
                                }}
                            >
                                <div className='dashboard-cell-tag'>
                                    <span className={cn({ 'dashboard-cell-tag-name': permission })}>{name}</span>
                                    {permission !== DashboardPermission.own && <Tag color='processing' className='status-tag' >{permission === DashboardPermission.edit ? t('仅编辑') : t('仅预览')}</Tag> }
                                </div>
                            </a>
                    },
                    {
                        title: t('操作'),
                        dataIndex: '',
                        key: 'actions',
                        width: 350,
                        render: ({ key, permission }) => <div className='action'>
                            {
                                permission !== DashboardPermission.view
                                    ? <>
                                        <a
                                            onClick={() => {
                                                let config = configs.find(({ id }) => id === key)
                                                dashboard.set({ config, editing: true })
                                                model.set_query('dashboard', String(config.id))
                                                model.set({ header: false, sider: false })
                                            }}
                                        >
                                            {t('编辑')}
                                        </a>
                                        
                                        <a
                                            onClick={async () => single_file_export(key)}
                                        >
                                            {t('导出')}
                                        </a>
                                    </>
                                    : <></>
                            }
                            {
                                permission === DashboardPermission.own
                                    ? <>
                                        <a
                                            onClick={() => {
                                                let current_row_config = configs.find(({ id }) => id === key)
                                                set_current_dashboard(current_row_config)
                                                editor.open()
                                                set_edit_dashboard_name(current_row_config?.name)
                                            }}
                                        >
                                            {t('修改名称')}
                                        </a>
                                        <Share dashboard_ids={[key]} trigger_type='text'/>
                                        <Popconfirm
                                            title='删除'
                                            description={`确定删除 ${configs.find(({ id }) => id === key).name} 吗？`}
                                            onConfirm={async () =>
                                                model.execute(async () => {
                                                    if (!configs.length) {
                                                        dashboard.message.error(t('当前 dashboard 列表为空'))
                                                        return
                                                    }
                                                    
                                                    dashboard.set({ configs: configs.filter(({ id }) => id !== key) })
                                                    
                                                    await dashboard.delete_dashboard_configs([key], false)
                                                    set_selected_dashboard_ids(selected_dashboard_ids.filter(id => id !== key))
                                                    model.message.success(t('删除成功'))
                                                })
                                            }
                                            okText={t('确认删除')}
                                            cancelText={t('取消')}
                                        >
                                            <a  className='delete'>
                                                {t('删除')}
                                            </a>
                                        </Popconfirm>
                                    </>
                                    : <>
                                        <Popconfirm
                                            title='撤销'
                                            description={`确定撤销 ${configs.find(({ id }) => id === key).name} 的权限吗？`}
                                            onConfirm={async () => 
                                                model.execute(async () => {
                                                    if (!configs.length) {
                                                        dashboard.message.error(t('当前 dashboard 列表为空'))
                                                        return
                                                    }
                                                    
                                                    dashboard.set({ configs: configs.filter(({ id }) => id !== key) })
                                                    
                                                    await dashboard.revoke(key)
                                                    set_selected_dashboard_ids(selected_dashboard_ids.filter(id => id !== key))
                                                    model.message.success(t('撤销成功'))
                                                })
                                            }
                                            okText={t('确认撤销')}
                                            cancelText={t('取消')}
                                        >
                                            <a  className='delete'>
                                                {t('撤销')}
                                            </a>
                                        </Popconfirm>
                                    </> 
                            }
                        </div>
                    }
                ]}
                dataSource={configs?.map(({ id, name, permission }) => ({ key: id, name, permission }))}
                pagination={false}
                title={() => <div className='title'>
                        <h2>{t('数据面板')}</h2>
                        <div className='toolbar'>
                        <Button
                                type='primary'
                                icon={<PlusCircleOutlined />}
                                onClick={() => {
                                    const new_id = genid()
                                    set_new_dashboard_id(new_id)                
                                    set_new_dashboard_name(String(new_id).slice(0, 4))
                                    creator.open()
                                }}
                            >
                                {t('新建')}
                            </Button>
                            
                            <Upload
                                multiple
                                showUploadList={false}
                                beforeUpload={async file => {
                                    await model.execute(async () => {
                                        const import_config = JSON.parse(await file.text()) as DashBoardConfig
                                        
                                        if (configs.findIndex(c => c.id === import_config.id) !== -1)
                                            await dashboard.update_dashboard_config(import_config, false)
                                        else
                                            await dashboard.add_dashboard_config(import_config, false)
                                        model.message.success(`${import_config.name}导入成功`)
                                    })
                                    return false
                                }}
                            >
                                <Button icon={<DownloadOutlined />}>{t('批量导入')}</Button>
                            </Upload>
                            
                            <Button
                                icon={<UploadOutlined />}
                                onClick={async () => 
                                    model.execute(async () => {
                                        if (selected_dashboard_ids && !selected_dashboard_ids.length) {
                                            model.message.error(t('请选择至少一个面板进行导出'))
                                            return
                                        }
                                            
                                        if (selected_dashboard_ids.length === 1) {
                                            single_file_export(selected_dashboard_ids[0])
                                            return
                                        }
                                        const files = [ ]
                                        for (let config_id of selected_dashboard_ids) {
                                            const config = configs.find(({ id }) => id === config_id)
                                            
                                            if (config.permission === DashboardPermission.view)
                                                throw new Error(t('您没有导出 {{name}} 的权限', { name: config.name }))
                                            
                                            files.push({ name: `dashboard.${config.name}.json`, lastModified: new Date(), input: new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' }) })
                                        }
                                        const zip = await downloadZip(files).blob()
                                        let a = document.createElement('a')
                                        a.download = `${model.username}.dashboards.zip`
                                        a.href =  URL.createObjectURL(zip)
                                        document.body.appendChild(a)
                                        a.click()
                                        document.body.removeChild(a)
                                    })
                                }
                            >
                                {t('批量导出')}
                            </Button>
                            
                            <Share
                                dashboard_ids={selected_dashboard_ids}
                                trigger_type='button'
                             />
                        
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    if (!selected_dashboard_ids || !selected_dashboard_ids.length) {
                                        model.message.error(t('请至少选中一个数据面板后再删除'))
                                        return
                                    } 
                                    deletor.open()
                                }}
                            >
                                {t('批量删除')}
                            </Button>
                            
                            
                        </div>
                    </div>}
            />
        </div>
}
