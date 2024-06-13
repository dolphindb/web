import './index.scss'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { Modal } from 'antd'

import { ReadonlyEditor } from '../../../components/ReadonlyEditor/index.js'
import type { IParserTemplate } from '../../type.js'

interface IProps {
    template: IParserTemplate
}

export const TemplateViewModal = NiceModal.create(({ template }: IProps) => {
    
    const modal = useModal()
    
    return <Modal 
        title={template.name}
        open={modal.visible} 
        afterClose={() => { modal.remove() }}
        onCancel={async () => modal.hide()}
        footer={null}
        width={800}
    >
        <ReadonlyEditor code={template.handler} className='template-view-editor'/>
    </Modal>
})
