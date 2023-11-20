import './index.scss'
import { CloudUploadOutlined, DeleteOutlined, FileOutlined } from '@ant-design/icons'
import { Form, Typography, Upload } from 'antd'
import { useCallback, useEffect, useState } from 'react'

interface IProps { 
    onChange?: (file: File) => void
    tip?: string
    accept?: string
}

export function UploadFileField (props: IProps) {
    const { onChange, tip, accept } = props
    const [file, set_file] = useState<File>()
    
    useEffect(() => { 
        onChange?.(file)
    }, [file])
    
    const before_upload = useCallback((file: File) => { 
        set_file(file)
        return false
    }, [ ])
    
    const on_delete = useCallback(() => { 
        set_file(null)
    }, [ ])
    
    return <Form.Item wrapperCol={{ span: 24 }} className='upload-file-form-item' name='file' rules={[{ required: true, message: '请上传文件' }]}>
        {
            file ? 
                <div className='preview-file'>
                    <div>
                        <FileOutlined className='file-icon'/>
                        {file.name}
                    </div>
                    <DeleteOutlined onClick={on_delete} className='delete-icon'/>
                </div>
            : <Upload.Dragger accept={accept} beforeUpload={before_upload}>
                <div>
                    <CloudUploadOutlined className='upload-icon' />
                    <div>点击或将文件拖拽到此区域</div>
                    {tip && <Typography.Text className='upload-tip' type='secondary'>{tip}</Typography.Text> }
                </div>
            </Upload.Dragger> 
        }
    </Form.Item>
}
