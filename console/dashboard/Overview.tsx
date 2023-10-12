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
    const [selected_users, set_selected_users] = useState([ ])
    const [current_dashboard, set_current_dashboard] = useState(null)
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    const { visible: share_visible, open: share_open, close: share_close } = use_modal()
    
    const params = new URLSearchParams(location.search)
    
    useEffect(() => {
        (async () => {
            try {
                await dashboard.get_configs()
            } catch (error) {
                model.show_error({ error })
            }
        })()
    }, [ ])
    
    useEffect(() => {
        (async () => {
            try {
              await dashboard.get_users()
            } catch (error) {
                model.show_error({ error })
            }
        })()
    }, [ ])
    
    
    useEffect(() => {
        if (params.get('create') === '1') {
            add_open()
            set_new_dashboard_name(String(genid()).slice(0, 4))
        }
    }, [ ])
    
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
            
            const new_dashboard = dashboard.generate_new_config(new_dashboard_name)
            dashboard.set({ configs: configs ? [...configs, new_dashboard] : [new_dashboard], config: new_dashboard })
            model.set_query('dashboard', String(new_dashboard.id))
            model.set({ header: false, sider: false })
            await dashboard.save_configs_to_server()
            
            model.message.success(t('添加成功'))
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
            
            if (configs.find(({ id, name }) => id !== current_dashboard.id && name === edit_dashboard_name)) {
                dashboard.message.error(t('名称重复，请重新输入'))
                return
            }
            const index = configs.findIndex(({ id }) => id === current_dashboard.id)
            
            dashboard.set({ configs: configs.toSpliced(index, 1, { ...current_dashboard, name: edit_dashboard_name }) })
            
            await dashboard.save_configs_to_server()
            model.message.success(t('修改成功'))
            
            edit_close()
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    async function handle_delete (dashboard_id: number) {
        try {
            if (!configs.length) {
                dashboard.message.error(t('当前 dashboard 列表为空'))
                return
            }
            dashboard.set({ configs: configs.filter(({ id }) => id !== dashboard_id) })
            
            await dashboard.save_configs_to_server()
            
            model.message.success(t('删除成功'))
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    async function handle_share () {
        console.log('selected', selected_dashboard_ids, selected_users)
        try {
            dashboard.share(selected_dashboard_ids, selected_users)
        } catch (error) {
            model.show_error({ error })
            throw error
        }
    }
    
    
    return <div className='dashboard-overview'>
            <Modal
                open={add_visible}
                maskClosable={false}
                onCancel={add_close}
                onOk={handle_add}
                closeIcon={false}
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
                open={edit_visible}
                maskClosable={false}
                onCancel={edit_close}
                onOk={handle_edit}
                closeIcon={false}
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
                open={share_visible}
                maskClosable={false}
                onCancel={share_close}
                onOk={handle_share}
                closeIcon={false}
                title={t('请选择需要分享的用户')}
            >
                <Table
                    rowSelection={{
                        onChange: (selectedRowKeys: React.Key[]) => {
                            set_selected_users(selectedRowKeys)
                        }
                    }} 
                    columns={[{ title: t('用户名'), dataIndex: 'user_name', key: 'user_name' }]}
                    dataSource={users_to_share?.map(user => ({
                                        key: user,
                                        user_name: user
                                        }))}
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
                                    dashboard.set({ config })
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
                        key: 'delete',
                        width: '200px',
                        render: ({ key }) => <div className='action'>
                                <a
                                    onClick={() => {
                                        let current_row_config = configs.find(({ id }) => id === key)
                                        set_current_dashboard(current_row_config)
                                        edit_open()
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
                                            a.download = `dashboard.${config.id}.json`
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
                                    title='删除 Dashboard'
                                    description={`确定删除 ${configs.find(({ id }) => id === key).name} 吗`}
                                    onConfirm={async () => handle_delete(key)}
                                    okText='Yes'
                                    cancelText='No'
                                >
                                     <a  className='delete'>
                                        {t('删除')}
                                    </a>
                                </Popconfirm>
                            </div>
                    }
                ]}
                dataSource={configs?.map(({ id, name }) => ({
                    key: id,
                    name
                }))}
                pagination={false}
                title={() => <div className='title'>
                        <h2>{t('数据面板')}</h2>
                        <div className='toolbar'>
                            <Button
                                icon={<PlusCircleOutlined />}
                                onClick={() => {
                                    add_open()
                                    set_new_dashboard_name(String(genid()).slice(0, 4))
                                }}
                            >
                                {t('新建')}
                            </Button>
                            <Upload
                                showUploadList={false}
                                beforeUpload={async file => {
                                    const import_config = JSON.parse(await file.text()) as DashBoardConfig
                                    dashboard.set({ configs: [...configs.filter(({ id }) => id !== import_config.id), import_config ] })
                                    try {
                                        await dashboard.save_configs_to_server()
                                    } catch (error) {
                                        model.show_error({ error })
                                        throw error
                                    }
                                    return false
                                }}
                            >
                                <Button icon={<UploadOutlined />}>{t('导入')}</Button>
                            </Upload>
                            <Button icon={<ShareAltOutlined />} onClick={share_open}>{t('分享')}</Button>
                        </div>
                    </div>}
            />
        </div>
}
