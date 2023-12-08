import { ShareAltOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
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
            message.success(t('复制成功'))
         } catch (e) {
            message.error(t('复制失败'))
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
        icon: <Tooltip title={t('分享')}>
            <Button className='action' onClick={trigger_click_handler }><ShareAltOutlined/></Button>
        </Tooltip>
        
    }
    
    return triggers[trigger_type]
}



// import './index.sass'

// import { ShareAltOutlined } from '@ant-design/icons'
// import { Button, Modal, Radio, Table } from 'antd'
// import { useCallback, useState } from 'react'
// import { use_modal } from 'react-object-model/hooks.js'

// import { DashboardPermission, dashboard } from '../model.js'
// import { t } from '../../../i18n/index.js'
// import { model } from '../../model.js'
// import { DdbLong, DdbDict } from 'dolphindb/browser'
// import { parse_error } from '../utils.js'

// interface IProps {
//     dashboard_ids: number[]
//     trigger_type: 'button' | 'text' | 'icon'
// }


// export function Share ({ dashboard_ids, trigger_type }: IProps) {
//     const { visible, open, close } = use_modal()
//     const { users } = dashboard.use(['users'])
    
//     const [editors, set_editors] = useState(new Set<string>())
//     const [viewers, set_viewers] = useState(new Set<string>())
    
//     const trigger_click_handler = useCallback(async () => {
//         try {
//             if (!dashboard_ids.length) {
//                 model.message.error(t('请至少选中一个数据面板后再分享'))
//                 return
//             }
//             await dashboard.get_user_list()
//             open()
//         } catch (error) {
//             dashboard.message.error(error.message)
//             throw error
//         }
//     }, [dashboard_ids])
    
//     const triggers = {
//         button: <Button
//                     icon={<ShareAltOutlined />}
//                     onClick={trigger_click_handler}
//                 >
//                     {t('批量分享')}
//                 </Button>,
//         text: <a onClick={trigger_click_handler }>{t('分享')}</a>,
//         icon: <Button className='action' onClick={trigger_click_handler }><ShareAltOutlined/></Button>
//     }
    
//     return <>
//         {triggers[trigger_type]}
//         <Modal
//             className={trigger_type === 'icon' ? 'share dark' : 'share'}
//             open={visible}
//             onCancel={close}
//             maskClosable={false}
//             styles={{ mask: { backgroundColor: 'rgba(84,84,84,0.5)' } }}
//             afterOpenChange={async () => {
//                 if (dashboard_ids.length === 1)
//                     try {
//                         const data = 
//                             (
//                                 await model.ddb.call(
//                                     'dashboard_get_shared_users', 
//                                     [new DdbDict({ id: new DdbLong(BigInt(dashboard_ids[0])) })], 
//                                     { urgent: true }
//                                 )
//                             ).value[1].value
//                         set_viewers(new Set(data[0].value))
//                         set_editors(new Set(data[1].value))
//                     } catch (error) {
//                         model.show_error({ error: parse_error(error) })
//                     }
//                 else {
//                     set_viewers(new Set())
//                     set_editors(new Set())
//                 }
                
//             }}
//             title={t('请选择需要分享的用户')}
//             footer={[
//                 <Button key='edit' onClick={() => {
//                     set_editors(new Set(users?.filter(user => user !== model.username)))
//                     set_viewers(new Set())
//                 }}>
//                     {t('全部编辑')}
//                 </Button>,
//                 <Button key='view' onClick={() => {
//                     set_editors(new Set())
//                     set_viewers(new Set(users?.filter(user => user !== model.username)))
//                 }}>
//                     {t('全部仅预览')}
//                 </Button>,
//                 <Button key='none' onClick={() => {
//                     set_editors(new Set())
//                     set_viewers(new Set())
//                 }}>
//                     {t('全部无')}
//                 </Button>,
//                 <Button key='close' onClick={close}>
//                     {t('关闭')}
//                 </Button>,
//                 <Button key='ok' type='primary' onClick={async () => {
//                     try {
//                         if (!dashboard_ids.length) {
//                             model.message.warning(t('请选择想要分享的 dashboard'))
//                             return
//                         }
                        
//                         dashboard_ids.forEach(dashboard_id => {
//                             const config = dashboard.configs.find(config => config.id = dashboard_id)
//                             if (config?.permission !== DashboardPermission.own)
//                                 throw new Error(t('您没有分享 {{name}} 的权限', { name: config.name })) 
//                         })
                        
                        
//                         await dashboard.share(dashboard_ids, Array.from(viewers), Array.from(editors))
//                         model.message.success(t('分享成功'))
//                         close()
//                     } catch (error) {
//                         model.show_error({ error: parse_error(error) })
//                     }
//                 }}>
//                     {t('确认')}
//                 </Button>
//             ]}
//         >   
//             <Table
//                 className='main'
//                 size='middle'
//                 scroll={{ y: 500 }}
//                 columns={[
//                     { title: t('用户名'), dataIndex: 'key', key: 'key' }, 
//                     { 
//                         title: t('权限'), 
//                         dataIndex: 'permission', 
//                         key: 'permission',
//                         width: '50%',
//                         render: (text, { key })  => {
//                             return <Radio.Group 
//                                         onChange={event => { 
//                                             const value = event.target.value
//                                             const new_viewers = new Set(viewers)
//                                             const new_editors = new Set(editors)
//                                             switch (value) {
//                                                 case 'view':
//                                                     new_viewers.add(key)
//                                                     new_editors.delete(key)
//                                                     break
//                                                 case 'editor':
//                                                     new_viewers.delete(key)
//                                                     new_editors.add(key)
//                                                     break
//                                                 default:
//                                                     new_viewers.delete(key)
//                                                     new_editors.delete(key)    
//                                             }
//                                             set_viewers(new_viewers)
//                                             set_editors(new_editors)
//                                         }}
//                                         value={editors.has(key) ? 'editor' : (viewers.has(key) ? 'view' : 'none')}
//                                     >
//                                     <Radio value='none'>{t('无')}</Radio>
//                                     <Radio value='view'>{t('仅预览')}</Radio>
//                                     <Radio value='editor'>{t('编辑')}</Radio>
//                                 </Radio.Group>
//                         }
//                     }
//                 ]}
//                 dataSource={users?.filter(user => user !== model.username).map(user => ({ key: user }))}
//                 pagination={false}
//             />
//         </Modal>
//     </>
// }

