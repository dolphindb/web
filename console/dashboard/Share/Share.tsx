import './index.sass'

import { ShareAltOutlined } from '@ant-design/icons'
import { Button, Modal, Table, Tooltip } from 'antd'
import { useCallback } from 'react'
import { use_modal } from 'react-object-model/modal'

import { dashboard } from '../model.js'
import { t } from '../../../i18n/index.js'
import { model } from '../../model.js'

interface IProps {
    dashboard_ids: string[]
    trigger_type: 'button' | 'text' | 'icon'
}


export function Share ({ dashboard_ids, trigger_type }: IProps) {
    const { visible, open, close } = use_modal()
    const { users } = dashboard.use(['users'])
    
    const trigger_click_handler = useCallback(async () => {
        try {
            await dashboard.get_users_to_share()
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
            open={visible}
            onCancel={close}
            onOk={async () => {
                if (!dashboard_ids.length) {
                    model.message.warning(t('请选择想要分享的 dashboard'))
                    return
                }
                
                console.log('share')
                // try {
                //     await dashboard.share(selected_dashboard_ids, selected_users)
                //     model.message.success(t('分享成功'))
                //     close()
                // } catch (error) {
                //     model.show_error({ error })
                //     throw error
                // }
            }}
            title={t('请选择需要分享的用户')}
        >
            <Table
                columns={[{ title: t('用户名'), dataIndex: 'user_name', key: 'user_name' }]}
                dataSource={users?.map(user => ({ key: user, user_name: user }))}
                pagination={false}
            />
        </Modal>
    </>
}
