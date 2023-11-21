import './index.sass'

import { ShareAltOutlined } from '@ant-design/icons'
import { Button, Modal, Radio, Table } from 'antd'
import { useCallback, useState } from 'react'
import { use_modal } from 'react-object-model/modal'

import { dashboard } from '../model.js'
import { t } from '../../../i18n/index.js'
import { model } from '../../model.js'
import { DdbLong, DdbDict } from 'dolphindb/browser'

interface IProps {
    dashboard_ids: number[]
    trigger_type: 'button' | 'text' | 'icon'
}


export function Share ({ dashboard_ids, trigger_type }: IProps) {
    const { visible, open, close } = use_modal()
    const { users } = dashboard.use(['users'])
    
    const [editors, set_editors] = useState(new Set<string>())
    const [viewers, set_viewers] = useState(new Set<string>())
    
    const trigger_click_handler = useCallback(async () => {
        try {
            await dashboard.get_user_list()
            open()
        } catch (error) {
            dashboard.message.error(error.message)
            throw error
        }
    }, [ ])
    
    const triggers = {
        button: <Button
                    icon={<ShareAltOutlined />}
                    onClick={trigger_click_handler}
                >
                    {t('批量分享')}
                </Button>,
        text: <a onClick={trigger_click_handler }>{t('分享')}</a>,
        icon: <Button className='action' onClick={trigger_click_handler }><ShareAltOutlined/></Button>
    }
    
    return <>
        {triggers[trigger_type]}
        <Modal
            className={trigger_type === 'icon' ? 'share dark' : 'share'}
            open={visible}
            onCancel={close}
            maskClosable={false}
            styles={{ mask: { backgroundColor: 'rgba(84,84,84,0.5)' } }}
            afterOpenChange={async () => {
                if (dashboard_ids.length === 1)
                    try {
                        const data = 
                            (
                                await model.ddb.call(
                                    'dashboard_get_shared_users', 
                                    [new DdbDict({ id: new DdbLong(BigInt(dashboard_ids[0])) })], 
                                    { urgent: true }
                                )
                            ).value[1].value
                        set_viewers(new Set(data[0].value))
                        set_editors(new Set(data[1].value))
                    } catch (error) {
                        dashboard.show_error({ error })
                    }
            }}
            onOk={async () => {
                if (!dashboard_ids.length) {
                    model.message.warning(t('请选择想要分享的 dashboard'))
                    return
                }
                
                try {
                    await dashboard.share(dashboard_ids, Array.from(viewers), Array.from(editors))
                    model.message.success(t('分享成功'))
                    close()
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
            }}
            title={t('请选择需要分享的用户')}
        >   
            <Table
                className='main'
                size='middle'
                scroll={{ y: 500 }}
                columns={[
                    { title: t('用户名'), dataIndex: 'key', key: 'key' }, 
                    { 
                        title: t('权限'), 
                        dataIndex: 'permission', 
                        key: 'permission',
                        width: '45%',
                        render: (text, { key })  => {
                            return <Radio.Group 
                                        onChange={event => { 
                                            const value = event.target.value
                                            const new_viewers = new Set(viewers)
                                            const new_editors = new Set(editors)
                                            switch (value) {
                                                case 'view':
                                                    new_viewers.add(key)
                                                    new_editors.delete(key)
                                                    break
                                                case 'editor':
                                                    new_viewers.delete(key)
                                                    new_editors.add(key)
                                                    break
                                                default:
                                                    new_viewers.delete(key)
                                                    new_editors.delete(key)    
                                            }
                                            set_viewers(new_viewers)
                                            set_editors(new_editors)
                                        }}
                                        defaultValue={editors.has(key) ? 'editor' : (viewers.has(key) ? 'view' : 'none')}
                                    >
                                    <Radio value='none'>{t('无')}</Radio>
                                    <Radio value='view'>{t('预览')}</Radio>
                                    <Radio value='editor'>{t('编辑')}</Radio>
                                </Radio.Group>
                        }
                    }
                ]}
                dataSource={users?.filter(user => user !== model.username).map(user => ({ key: user }))}
                pagination={false}
            />
        </Modal>
    </>
}
