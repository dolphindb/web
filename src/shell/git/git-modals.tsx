import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Modal } from 'antd'

export const GitLabOauthModal = NiceModal.create(() => {
    const modal = useModal()
    
    return <Modal
        open={modal.visible}
        onCancel={modal.hide}
        title={t('使用 Oauth 登录到 GitLab')}
        onOk={modal.hide}
    >
        121121
    </Modal>
})
