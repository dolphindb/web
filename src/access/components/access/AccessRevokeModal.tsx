import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Tooltip } from 'antd'

import { access } from '../../model.js'
import { model } from '../../../model.js'

import { t } from '../../../../i18n/index.js'
import type { Access, AccessCategory } from '../../types.js'



export const AccessRevokeModal = NiceModal.create(({ 
    category, 
    selected_access, 
    reset_selected 
}: 
{ 
    category: AccessCategory
    selected_access: Access[] 
    reset_selected: () => void 
}) => {

    const { current } = access.use(['current'])
    
    const modal = useModal()
    
    return <Modal
            className='delete-user-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            onOk={async () => {
                    await Promise.all(
                        selected_access.map(async ac =>
                            category === 'script' ? access.revoke(current.name, ac.access) : access.revoke(current.name, ac.access, ac.name)
                        )
                    )
                    
                    model.message.success(t('撤销成功'))
                    reset_selected()
                    modal.hide()
                    await access.update_current_access()
            }}
            title={<Tooltip>{t('确认撤销选中的 {{num}} 条权限吗？', { num: selected_access.length })}</Tooltip>}
        />
})
