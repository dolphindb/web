import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { ConfigProvider, Modal, theme, type ModalProps } from 'antd'
import { useCallback } from 'react'

import { t } from '../../../i18n/index.js'

export const SaveConfirmModal = NiceModal.create((props: ModalProps) => { 
    const modal = useModal()
    const { onOk, onCancel } = props
    
    const on_ok = useCallback<ModalProps['onOk']>(async e => { 
        onOk?.(e)
        modal.hide()
    }, [onOk])
    
    const on_cancel = useCallback<ModalProps['onCancel']>(async e => { 
        onCancel?.(e)
        modal.hide()
    }, [onCancel])
    
    
    return <Modal
        open={modal.visible}
        afterClose={() => { modal.remove() }}
        maskClosable={false}
        onCancel={on_cancel}
        onOk={on_ok}
        okText={t('保存')}
        cancelText={t('不保存')}
        closeIcon={false}
        title={t('离开此界面您当前更改会丢失，是否需要保存当前更改')}
    />
})
