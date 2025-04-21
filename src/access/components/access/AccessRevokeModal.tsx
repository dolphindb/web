import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Tooltip } from 'antd'

import { t } from '@i18n'

import { model } from '@model'

import { access } from '@/access/model.ts'


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
            okButtonProps={{ danger: true }}
            onOk={async () => {
                    await Promise.all(
                        selected_access.map(async ac => {
                            // 对于 shared 和 stream，撤销权限时需要将 TABLE_INSERT 、TABLE_UPDATE 、TABLE_DELETE 转换为 TABLE_WRITE
                            if ((category === 'shared' || category === 'stream') && ac.access !== 'TABLE_READ') 
                                return access.revoke(name, 'TABLE_WRITE', ac.name)
                            else if (category === 'script')
                                return access.revoke(name, ac.access)
                            else
                                return access.revoke(name, ac.access, ac.name)
                        })
                    )
                    
                    model.message.success(t('撤销成功'))
                    reset_selected()
                    modal.hide()
                    await update_accesses()
            }}
            title={<Tooltip>{t('确认撤销选中的 {{num}} 条权限吗？', { num: selected_access.length })}</Tooltip>}
        />
})
