import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Tooltip } from 'antd'

import { t } from '@i18n/index.js'

import { access } from '@/access/model.js'
import { model } from '@/model.js'


import type { Access, AccessCategory } from '@/access/types.js'



export const AccessRevokeModal = NiceModal.create(({ 
    category, 
    selected_access, 
    reset_selected,
    name,
    update_accesses
}: 
{ 
    category: AccessCategory
    selected_access: Access[] 
    reset_selected: () => void
    name: string
    update_accesses: () => Promise<void>
}) => {
    
    const modal = useModal()
    
    return <Modal
            className='delete-user-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            onOk={async () => {
                    await Promise.all(
                        selected_access.map(async ac =>
                            category === 'script' ? access.revoke(name, ac.access) : access.revoke(name, ac.access, ac.name)
                        )
                    )
                    
                    model.message.success(t('撤销成功'))
                    reset_selected()
                    modal.hide()
                    await update_accesses()
            }}
            title={<Tooltip>{t('确认撤销选中的 {{num}} 条权限吗？', { num: selected_access.length })}</Tooltip>}
        />
})
