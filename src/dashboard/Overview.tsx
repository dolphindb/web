import './Overview.sass'

import { useEffect, useState } from 'react'
import { Button, Input, Modal, Table, Popconfirm, Spin, Tag, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { downloadZip } from 'client-zip'
import cn from 'classnames'


import { use_modal } from 'react-object-model/hooks.js'
import { genid, vercmp } from 'xshell/utils.browser.js'

import { model } from '../model.js'
import { t } from '@i18n'

import { DDBTable } from '@/components/DDBTable/index.tsx'

import { TableOperations } from '@/components/TableOperations/index.tsx'

import { dashboard, DashboardPermission } from './model.js'
import { check_name } from './utils.ts'
import { Import } from './Import/Import.js'
import { Share } from './Share/Share.js'
import { Doc } from './components/Doc.js'



export function Overview () {
    const { configs, show_config_modal } = dashboard.use(['configs', 'show_config_modal'])
    const [selected_dashboard_ids, set_selected_dashboard_ids] = useState([ ])
    const [current_dashboard, set_current_dashboard] = useState(null)
    const [new_dashboard_id, set_new_dashboard_id] = useState<number>()
    const [new_dashboard_name, set_new_dashboard_name] = useState('')
    const [edit_dashboard_name, set_edit_dashboard_name] = useState('')
    const [copy_dashboard_name, set_copy_dashboard_name] = useState('')
    const [config_infos, set_config_infos] = useState([ ])
    
    let creator = use_modal()
    let editor = use_modal()
    let copyor = use_modal()
    let configer = use_modal()
    
    const params = new URLSearchParams(location.search)
    
    useEffect(() => {
        (async () => {
            if (model.admin && show_config_modal) {
                let { version } = model
                version += (version.split('.').length < 4) ? '.0' : ''
                if (vercmp(version, '2.00.11.0') >= 0) {
                    for (let i of ['Create', 'Delete']) 
                        if (!await model.ddb.execute(`rpc(getControllerAlias(), getConfig, \`thirdParty${i}UserCallback)`))
                            config_infos.push(i === 'Create' ? 'thirdPartyCreateUserCallback=dashboard_grant_functionviews' : 'thirdPartyDeleteUserCallback=dashboard_delete_user')  
                    if (config_infos.length) {
                        set_config_infos(config_infos)
                        dashboard.set({ show_config_modal: false })
                        configer.open()
                    }   
                }
            }    
        })()
    }, [ ])
    
    
    useEffect(() => {
        if (params.get('create') === '1') {
            set_new_dashboard_id(Math.trunc(genid() / 4))                
            set_new_dashboard_name('')
            creator.open()
        }
    }, [ ])
    
    
    if (!configs)
        return <div className='spin-container'>
            <Spin size='large' delay={300}/>
        </div>
    
    async function single_file_export (config_id: number) {
        const config = configs.find(({ id }) => id === config_id)
        let a = document.createElement('a')
        a.download = `dashboard.${config.name}.json`
        a.href = URL.createObjectURL(new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' }))
        
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }
    
    
    async function  on_batch_delete () {
        model.modal.confirm({
            title: t('确认删除选中的 {{length}} 个数据面板吗？', { length: selected_dashboard_ids.length }),
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    selected_dashboard_ids.forEach(dashboard_id => {
                        const config = dashboard.configs.find(config => config.id === dashboard_id)
                        if (config?.permission !== DashboardPermission.own)
                            throw new Error(t('您没有删除 {{name}} 的权限', { name: config.name })) 
                    })
                    
                    await dashboard.delete_dashboard_configs(selected_dashboard_ids, false)
                    set_selected_dashboard_ids([ ])
                    model.message.success(t('删除成功'))
                } catch (error) {
                    model.show_error({ error })
                }
            }
        })
    }
    
    return <div className='dashboard-overview'>
            <Modal
                className='user-config'
                open={configer.visible}
                closeIcon={null}
                footer={[
                    <Button onClick={configer.close} type='primary' key='confirm'>{t('确定')}</Button>
                ]}
            >
                <div>
                    <p>
                        {t('检测到以下配置不存在，请及时配置并重启数据库，避免影响数据面板功能使用，详见')}
                        &nbsp;
                        <Doc/>
                    </p>
                    <p>
                        {t('待配置项：')}
                        {
                            config_infos.map(config_info => <span key={config_info}>
                                <br />
                                <span className='user-config-info'>{config_info}</span>
                            </span>)
                        }
                    </p>
                </div>
            </Modal>
            
            <Modal
                open={creator.visible}
                onCancel={creator.close}
                onOk={async () => {
                    const check_name_message = check_name(new_dashboard_name)
                    if (check_name_message) {
                        model.message.error(check_name_message)
                        return
                    }
                    
                    /** 待接口更新后修改 */
                    const new_dashboard = dashboard.generate_new_config(new_dashboard_id, new_dashboard_name)
                    
                    await dashboard.add_dashboard_config(new_dashboard, false)
                    
                    model.goto(`/dashboard/${new_dashboard.id}`)
                    creator.close()
                }}
                title={t('新数据面板')}
            >
                <Input
                    value={new_dashboard_name}
                    placeholder={t('请输入新数据面板的名称')}
                    onChange={event => {
                        set_new_dashboard_name(event.target.value)
                    }}
                />
            </Modal>
            
            <Modal
                open={editor.visible}
                onCancel={editor.close}
                onOk={async () => {
                    const check_name_message = check_name(edit_dashboard_name)
                    if (check_name_message) {
                        model.message.error(check_name_message)
                        return
                    }
                    
                    await dashboard.rename_dashboard(current_dashboard.id, edit_dashboard_name)
                    model.message.success(t('修改成功'))
                    
                    editor.close()
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
                open={copyor.visible}
                onCancel={copyor.close}
                onOk={async () => {
                    const check_name_message = check_name(copy_dashboard_name)
                    if (check_name_message) {
                        model.message.error(check_name_message)
                        return
                    }
                    
                    const copy_dashboard = dashboard.generate_new_config(Math.trunc(genid() / 4), copy_dashboard_name, current_dashboard.data)
                    await dashboard.add_dashboard_config(copy_dashboard, false)
                    model.message.success(t('创建副本成功'))
                    
                    copyor.close()
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
            
            <DDBTable
                title={t('数据面板')}
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
                        onFilter: (value, { permission }) => permission === value,
                        render: (text, { key, name, permission, owner }) => <a
                                onClick={() => {
                                    const config = configs.find(({ id }) => id === key)
                                    dashboard.set({ config, editing: false })
                                    model.goto( `/dashboard/${config.id}`, { queries: { preview: '1' } })
                                }}
                            >
                                <div className='dashboard-cell-tag'>
                                    <span className={cn({ 'dashboard-cell-tag-name': permission })}>{name}</span>
                                    {permission !== DashboardPermission.own 
                                        && <>
                                            <Tag color='processing' className='status-tag' >
                                                {permission === DashboardPermission.edit ? t('仅编辑') : t('仅预览')}
                                            </Tag> 
                                            <Tag color='processing' className='status-tag' >
                                                {`${t('来源于 ')}${owner}`}
                                            </Tag> 
                                        </>
                                    }
                                </div>
                            </a>
                    },
                    {
                        title: t('创建人'),
                        dataIndex: 'owner',
                        width: 400,
                    },
                    {
                        title: t('操作'),
                        dataIndex: '',
                        key: 'actions',
                        width: 450,
                        render: ({ key }) => <TableOperations>
                            <Typography.Link
                                onClick={() => {
                                    let config = configs.find(({ id }) => id === key)
                                    dashboard.set({ config, editing: true, save_confirm: true })
                                    model.goto(`/dashboard/${config.id}`)
                                }}
                            >
                                {t('编辑')}
                            </Typography.Link>
                            
                            <Typography.Link onClick={async () => single_file_export(key)}>
                                {t('导出')}
                            </Typography.Link>
                            
                            <Typography.Link
                                onClick={() => {
                                    let config = configs.find(({ id }) => id === key)
                                    set_current_dashboard(config)
                                    set_copy_dashboard_name(config.name)
                                    copyor.open()
                                }}
                            >
                                {t('创建副本')}
                            </Typography.Link>
                            <Typography.Link
                                onClick={() => {
                                    let current_row_config = configs.find(({ id }) => id === key)
                                    set_current_dashboard(current_row_config)
                                    editor.open()
                                    set_edit_dashboard_name(current_row_config?.name)
                                }}
                            >
                                {t('修改名称')}
                            </Typography.Link>
                            <Share dashboard_ids={[key]} trigger_type='text'/>
                            <Popconfirm
                                title={t('删除')}
                                okButtonProps={{ danger: true }}
                                description={t('确定删除 {{name}} 吗？', { name: configs.find(({ id }) => id === key).name })}
                                onConfirm={async () => {
                                    if (!configs.length) {
                                        dashboard.message.error(t('当前 dashboard 列表为空'))
                                        return
                                    }
                                    
                                    dashboard.set({ configs: configs.filter(({ id }) => id !== key) })
                                    
                                    await dashboard.delete_dashboard_configs([key], false)
                                    set_selected_dashboard_ids(selected_dashboard_ids.filter(id => id !== key))
                                    model.message.success(t('删除成功'))
                                }}
                            >
                                <Typography.Link type='danger'>
                                    {t('删除')}
                                </Typography.Link>
                            </Popconfirm>
                        </TableOperations>
                    }
                ]}
                buttons={<>
                    <Button
                        type='primary'
                        icon={<PlusOutlined />}
                        onClick={() => {
                            set_new_dashboard_id(Math.trunc(genid() / 4))                
                            set_new_dashboard_name('')
                            creator.open()
                        }}
                    >
                        {t('新建')}
                    </Button>
                    
                    <Import type='button'/>
                    
                    <Button
                        icon={<UploadOutlined />}
                        onClick={async () => {
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
                        }}
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
                        disabled={!selected_dashboard_ids?.length}
                        onClick={on_batch_delete}
                    >
                        {t('批量删除')}
                    </Button>   
                </>}
                dataSource={configs?.map(({ id, ...others }) => ({ key: id, id, ...others }))}
                pagination={false}
            />
        </div>
}
