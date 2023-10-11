import './Overview.sass'

import { useEffect, useState } from 'react'

import { Button, Input, Modal, Table, Upload } from 'antd'
import { PlusCircleOutlined, ShareAltOutlined, UploadOutlined } from '@ant-design/icons'


import { use_modal } from 'react-object-model/modal.js'
import { genid } from 'xshell/utils.browser.js'

import { model } from '../model.js'
import { t } from '../../i18n/index.js'

import { type DashBoardConfig, dashboard } from './model.js'


export function Overview () {
    const { configs, config } = dashboard.use(['configs', 'config'])
    
    const [selected_dashboards, set_selected_dashboards] = useState([ ])
    const [current_dashboard, set_current_dashboard] = useState(null)
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    const { visible: edit_visible, open: edit_open, close: edit_close } = use_modal()
    
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
    
    // useEffect(() => {
    //     (async () => {
    //         try {
    //           await dashboard.get_users()
    //         } catch (error) {
    //             model.show_error({ error })
    //         }
    //     })()
    // }, [ ])
    
    
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
            
            /** 待接口更新后修改 */
            const new_dashboard = dashboard.generate_new_config(new_dashboard_name)
            dashboard.set({ configs: configs ? [...configs, new_dashboard] : [new_dashboard] })
            
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
            <Table
                rowSelection={{
                    onChange: (selectedRowKeys: React.Key[]) => {
                        set_selected_dashboards(selectedRowKeys)
                    }
                }}
                columns={[
                    {
                        title: t('名称'),
                        dataIndex: 'name',
                        key: 'name',
                        width: '70%',
                        render: (text, record) => <a
                                onClick={() => {
                                    const config = configs.find(({ id }) => id === record.key)
                                    dashboard.set({ config })
                                    model.set_query('dashboard', String(config.id))
                                    model.set({ header: false, sider: false })
                                    // if (config.owned)
                                    //     model.set_query('preview', '1')
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
                        render: ({ key }) => <div className='action'>
                                <a
                                    onClick={() => {
                                        handle_delete(key)
                                    }}
                                >
                                    {t('删除')}
                                </a>
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
                                {t('新增')}
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
                            <Button icon={<ShareAltOutlined />}>{t('分享')}</Button>
                        </div>
                    </div>}
            />
        </div>
}
