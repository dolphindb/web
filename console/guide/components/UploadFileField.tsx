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
    
    
    return <Form.Item
        wrapperCol={{ span: 24 }}
        className='upload-file-form-item'
        name='file'
        rules={[{ required: true, message: '请上传文件' }]}
        valuePropName='file'
        getValueFromEvent={e => Array.isArray(e) ? e[0] : e }
        >
        {
            file ? 
                <div className='preview-file'>
                    <div>
                        <FileOutlined className='file-icon'/>
                        {file.name}
                    </div>
                    <DeleteOutlined onClick={() => { 
                        set_file(null)
                    }} className='delete-icon'/>
                </div>
            : <Upload.Dragger 
                accept={accept} 
                beforeUpload={(file: File) => { 
                    set_file(file)
                    return false
            }}>
                <div>
                    <CloudUploadOutlined className='upload-icon' />
                    <div>点击或将文件拖拽到此区域</div>
                    {tip && <Typography.Text className='upload-tip' type='secondary'>{tip}</Typography.Text> }
                </div>
            </Upload.Dragger> 
        }
    </Form.Item>
}
