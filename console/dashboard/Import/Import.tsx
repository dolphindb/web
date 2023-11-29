import { Button, Input, Modal, Tooltip, Upload } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { genid } from 'xshell/utils.browser.js'
import { useRef, useState } from 'react'
import { use_modal } from 'react-object-model/modal.js'

import { t } from '../../../i18n/index.js'
import { model } from '../../model.js'
import { dashboard, DashboardPermission, type DashBoardConfig } from '../model.js'
import { check_name } from '../utils.js'

export function Import ({ type }: { type: 'icon' | 'button' }) {
    const [import_config, set_import_config] = useState<DashBoardConfig>(null)
    const [repeat_config_id, set_repeat_config_id] = useState<number>(null)
    const [file_list, set_file_list] = useState([ ])
    
    const lock = useRef<Promise<void>>(null)
    const resolve_lock = useRef(null)
    
    const { visible: import_visible, open: import_open, close: import_close } = use_modal()
    const { visible: rename_visible, open: rename_open, close: rename_close } = use_modal()
    const { visible: confirm_visible, open: confirm_open, close: confirm_close } = use_modal()
    
    const message = type === 'icon' ? dashboard.message : model.message
    const execute = type === 'icon' ? dashboard.execute : model.execute
    
    const triggers = {
        button: <Upload
                    multiple
                    showUploadList={false}
                    beforeUpload={(file, fileList) => { 
                        set_file_list(fileList) 
                        confirm_open()
                    }}
                >
                    <Button icon={<DownloadOutlined />}>{t('批量导入')}</Button>
                </Upload>,
        icon: <Tooltip title={t('导入')}>
                    <Upload
                        showUploadList={false}
                        beforeUpload={(file, fileList) => { 
                            set_file_list(fileList) 
                            confirm_open()
                        }}
                    >
                        <Button className='action'>
                            <DownloadOutlined />
                        </Button>
                    </Upload>
                </Tooltip>
    }
    
    return <>
        {triggers[type]}
        <Modal 
            open={confirm_visible}
            maskClosable={false}
            onCancel={confirm_close}
            onOk={async () => {
                confirm_close()
                for (let i in file_list) {
                    const config = { ...JSON.parse(await file_list[i].text()), id: genid(), owner: model.username } as DashBoardConfig
                    const repeat_config = dashboard.configs.find(({ name, permission }) => name === config.name && permission === DashboardPermission.own)
                    if (repeat_config) {
                        set_import_config(config)
                        set_repeat_config_id(repeat_config.id)
                        import_open()
                        lock.current = new Promise((resolve, reject) => { resolve_lock.current = resolve })
                        await lock.current
                    }  
                    else {
                        await dashboard.add_dashboard_config(config, type === 'icon')
                        message.success(`${config.name} ${t('导入成功！')}`)
                    }
                        
                }
            }}
            closeIcon={false}
            title={t('你确定要导入这 {{length}} 个 dashboard 吗？', { length: file_list.length })}
         />
        <Modal 
            open={import_visible}
            maskClosable={false}
            closeIcon={false}
            title={`${import_config?.name} ${t('已存在')}`} 
            footer={[
                <Button key='close' onClick={() => {
                    import_close()
                    resolve_lock.current()
                }}>
                    {t('取消')}
                </Button>,
                <Button 
                    key='cover'
                    type='primary'
                    onClick={async () => {
                        await execute(async () => {
                            await dashboard.delete_dashboard_configs([repeat_config_id], false)
                            await dashboard.add_dashboard_config(import_config, type === 'icon')
                            import_close()
                            resolve_lock.current()
                            message.success(`${import_config.name} ${t('导入成功！')}`)
                        }, { json_error: true })
                    }}
                >
                    {t('覆盖')}
                </Button>,
                <Button
                    key='import'
                    type='primary'
                    onClick={() => {
                        import_close()
                        rename_open()
                    }}
                >
                    {t('重命名后导入')}
                </Button>
            ]}
        />
        <Modal 
            open={rename_visible}
            maskClosable={false}
            onCancel={() => {
                rename_close()
                resolve_lock.current()
            }}
            onOk={async () => {
                const check_name_message = check_name(import_config.name)
                if (check_name_message) {
                    message.error(check_name_message)
                    resolve_lock.current()
                    return
                }
                else {
                    await dashboard.add_dashboard_config(import_config, type === 'icon')
                    resolve_lock.current()
                    rename_close()
                    message.success(`${import_config.name} ${t('导入成功！')}`)
                }
            }}
            closeIcon={false}
            title={t('请输入新的数据面板名称')}
        >
            <Input value={import_config?.name} onChange={event => { set_import_config({ ...import_config, name: event.target.value }) }}/>
        </Modal>
    </>
}
