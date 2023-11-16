import { CloudUploadOutlined } from '@ant-design/icons'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Typography, Upload } from 'antd'

interface IProps { 
    apply: () => void
}

export const UploadConfigModal = NiceModal.create((props: IProps) => { 
    const { apply } = props
    
    const modal = useModal()
    
    return <Modal
        title='应用配置'
        open={modal.visible}
        onCancel={async () => modal.hide()}
        afterClose={() => { modal.remove() }}
    >
        <Upload.Dragger
            accept='application/json'
            maxCount={1}
            listType='picture-card'
            className='json-upload'
        >
            <div>
                <CloudUploadOutlined className='upload-icon' />
                <div>点击或将文件拖拽到此区域</div>
                <Typography.Text className='upload-tip' type='secondary'>仅支持导入JSON文件</Typography.Text>
            </div>
        </Upload.Dragger>
    </Modal>
})
