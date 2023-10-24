import './Overview.sass'

import { useEffect, useState } from 'react'

import { Button, Input, Modal, Table, Upload, Popconfirm } from 'antd'
import { PlusCircleOutlined, ShareAltOutlined, UploadOutlined } from '@ant-design/icons'


import { use_modal } from 'react-object-model/modal.js'
import { genid } from 'xshell/utils.browser.js'

import { model } from '../model.js'
import { t } from '../../i18n/index.js'

import { type DashBoardConfig, dashboard } from './model.js'


export function Overview () {
    const { configs, config, users_to_share } = dashboard.use(['configs', 'config', 'users_to_share'])
    const [selected_dashboard_ids, set_selected_dashboard_ids] = useState([ ])
    const [selected_users, set_selected_users] = useState<string[]>([ ])
    const [current_dashboard, set_current_dashboard] = useState(null)
    const [new_dashboard_id, set_new_dashboard_id] = useState<number>()
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    
    let creator = use_modal()
    let editor = use_modal()
    let sharor = use_modal()
    
    const params = new URLSearchParams(location.search)
    
    useEffect(() => {
        (async () => {
            try {
                if (!model.logined) {
                    model.goto_login()
                    return
                }
                await dashboard.get_dashboard_configs()
            } catch (error) {
                dashboard.set({ backend: false })
                await dashboard.get_configs_from_local()
            
            }
        })()
    }, [ ])
    
    
    useEffect(() => {
        if (params.get('create') === '1') {
            const new_id = genid()
            set_new_dashboard_id(new_id)                
            set_new_dashboard_name(String(new_id).slice(0, 4))
            creator.open()
        }
    }, [ ])
    
    
    return <div className='dashboard-overview'>
            <Modal
                open={creator.visible}
                onCancel={creator.close}
                onOk={async () => {
                    try {
                        if (!new_dashboard_name) {
                            dashboard.message.error(t('dashboard 名称不允许为空'))
                            return
                        }
                        
                        if (configs?.find(({ name }) => name === new_dashboard_name)) {
                            dashboard.message.error(t('名称重复，请重新输入'))
                            return
                        }
                        
                        /** 待接口更新后修改 */
                        const new_dashboard = dashboard.generate_new_config(new_dashboard_id, new_dashboard_name)
                        dashboard.set({ configs: configs ? [...configs, new_dashboard] : [new_dashboard] })
                        
                        await dashboard.add_dashboard_config(new_dashboard)
                        
                        model.set_query('dashboard', String(new_dashboard.id))
                        model.set({ header: false, sider: false })
                    } catch (error) {
                        model.show_error({ error })
                        throw error
                    }
                    
                    creator.close()
                }}
                title={t('请输入 dashboard 的名称')}
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
                onOk={async () => {
                    try {
                        if (!edit_dashboard_name) {
                            dashboard.message.error(t('dashboard 名称不允许为空'))
                            return
                        }
                        
                        if (configs.find(({ id, name }) => id !== current_dashboard.id && name === edit_dashboard_name)) {
                            dashboard.message.error(t('名称重复，请重新输入'))
                            return
                        }
                        const index = configs.findIndex(({ id }) => id === current_dashboard.id)
                        const updated_config = { ...current_dashboard, name: edit_dashboard_name }
                        dashboard.set({ configs: configs.toSpliced(index, 1, updated_config) })
                        
                        dashboard.update_dashboard_config(updated_config)
                        model.message.success(t('修改成功'))
                        
                        editor.close()
                    } catch (error) {
                        model.show_error({ error })
                        throw error
                    }
                }}
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
                open={sharor.visible}
                onCancel={sharor.close}
                onOk={async () => {
                    if (!selected_dashboard_ids.length) {
                        model.message.error(t('请选择想要分享的 dashboard'))
                        return
                    }
                    
                    if (!selected_users.length) {
                        model.message.error(t('请选择想要分享的用户'))
                        return
                    }
                    
                    try {
                        await dashboard.share(selected_dashboard_ids, selected_users)
                        model.message.success(t('分享成功'))
                        sharor.close()
                    } catch (error) {
                        model.show_error({ error })
                        throw error
                    }
                }}
                title={t('请选择需要分享的用户')}
            >
                <Table
                    rowSelection={{
                        onChange: (selecteds: React.Key[]) => {
                            set_selected_users(selecteds as string[])
                        }
                    }}
                    columns={[{ title: t('用户名'), dataIndex: 'user_name', key: 'user_name' }]}
                    dataSource={users_to_share?.map(user => ({ key: user, user_name: user }))}
                    pagination={false}
                />
            </Modal>
            
            <Table
                rowSelection={{
                    onChange: (selectedRowKeys: React.Key[]) => {
                        set_selected_dashboard_ids(selectedRowKeys)
                    }
                }}
                columns={[
                    {
                        title: t('名称'),
                        dataIndex: 'name',
                        key: 'name',
                        render: (text, record) => <a
                                onClick={() => {
                                    const config = configs.find(({ id }) => id === record.key)
                                    dashboard.set({ config, editing: false })
                                    model.set_query('dashboard', String(config.id))
                                    model.set({ header: false, sider: false })
                                }}
                            >
                                {text}
                            </a>
                    },
                    {
                        title: t('操作'),
                        dataIndex: '',
                        key: 'actions',
                        width: 240,
                        render: ({ key }) => <div className='action'>
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
                                
                                <a
                                    onClick={async () => {
                                        try {
                                            const config = configs.find(({ id }) => id === key)
                                            let a = document.createElement('a')
                                            a.download = `dashboard.${config.name}.json`
                                            a.href = URL.createObjectURL(new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' }))
                                            
                                            document.body.appendChild(a)
                                            a.click()
                                            document.body.removeChild(a)
                                        } catch (error) {
                                            model.show_error({ error })
                                        }
                                    }}
                                >
                                    {t('导出')}
                                </a>
                                
                                <Popconfirm
                                    title='删除'
                                    description={`确定删除 ${configs.find(({ id }) => id === key).name} 吗？`}
                                    onConfirm={async () => {
                                        try {
                                            if (!configs.length) {
                                                dashboard.message.error(t('当前 dashboard 列表为空'))
                                                return
                                            }
                                            
                                            dashboard.set({ configs: configs.filter(({ id }) => id !== key) })
                                            
                                            await dashboard.delete_dashboard_configs([key])
                                            
                                            model.message.success(t('删除成功'))
                                        } catch (error) {
                                            model.show_error({ error })
                                            throw error
                                        }
                                    }}
                                    okText={t('确认删除')}
                                    cancelText={t('取消')}
                                >
                                     <a  className='delete'>
                                        {t('删除')}
                                    </a>
                                </Popconfirm>
                            </div>
                    }
                ]}
                dataSource={configs?.map(({ id, name }) => ({ key: id, name }))}
                pagination={false}
                title={() => <div className='title'>
                        <h2>{t('数据面板')}</h2>
                        <div className='toolbar'>
                            <Button
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
                                showUploadList={false}
                                beforeUpload={async file => {
                                    try {
                                        const import_config = JSON.parse(await file.text()) as DashBoardConfig
                                        dashboard.set({
                                            configs: [
                                                ...configs.filter(({ id }) => id !== import_config.id), import_config
                                            ]
                                        })
                                        
                                        await dashboard.add_dashboard_config(import_config)
                                    } catch (error) {
                                        model.show_error({ error })
                                        throw error
                                    }
                                    return false
                                }}
                            >
                                <Button icon={<UploadOutlined />}>{t('导入')}</Button>
                            </Upload>
                            
                            <Button
                                icon={<ShareAltOutlined />}
                                onClick={async () => {
                                    try {
                                        await dashboard.get_users_to_share()
                                        sharor.open()
                                    } catch (error) {
                                        model.show_error({ error })
                                        throw error
                                    }
                                }}
                            >
                                {t('分享')}
                            </Button>
                        </div>
                    </div>}
            />
        </div>
}
