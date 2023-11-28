import { ShareAltOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useCallback } from 'react'

import { dashboard } from '../model.js'
import { t } from '../../../i18n/index.js'
import { model } from '../../model.js'
import copy from 'copy-to-clipboard'

interface IProps {
    dashboard_ids: number[]
    trigger_type: 'button' | 'text' | 'icon'
}


export function Share ({ dashboard_ids, trigger_type }: IProps) {
    const message = trigger_type === 'icon' ? dashboard.message : model.message
    
    const trigger_click_handler = useCallback(async () => {
        if (!dashboard_ids.length) {
            model.message.error(t('请至少选中一个数据面板后再分享'))
            return
        }
        
        let copy_text = ''
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('preview', '1')
        
        dashboard_ids.forEach(dashboard_id => {
            currentUrl.searchParams.set('dashboard', String(dashboard_id))
            copy_text += `${dashboard.configs.find(({ id }) => id === dashboard_id).name}：${currentUrl.href}\n`
        })
        try {
            copy(copy_text)
            message.success('复制成功')
         } catch (e) {
            message.error('复制失败')
        }
    }, [dashboard_ids])
    
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
    
    return triggers[trigger_type]
}
