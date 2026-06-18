import { useState, useRef } from 'react'

import { Modal, Input, Form, type FormInstance, Tooltip, Upload, Table, Button, Result, Typography, type UploadFile } from 'antd'
import { CloudUploadOutlined, FileOutlined, InboxOutlined } from '@ant-design/icons'

import { noop } from 'xshell/prototype.common.js'

import { decode, required } from 'xshell/utils.browser.js'

import { use_modal, use_rerender } from 'react-object-model/hooks.js'

import { t, language } from '@i18n'

import { model } from '@model'

import { shell } from './model.ts'

const { Link } = Typography


export function UploadFilesAction () {
    interface Fields {
        files: UploadFile[]
        fpd: string
    }
    
    let modal = use_modal()
    
    const rerender = use_rerender()
    
    let rform = useRef<FormInstance<Fields>>(undefined)
    
    const [loading, set_loading] = useState(false)
    
    let rfpd = useRef<string>('')
    
    const title = t('上传本地文本文件到服务器（目前版本暂不支持上传二进制文件，二进制文件会被自动忽略）')
    
    return <>
        <Tooltip title={title}>
            <div
                className='action upload-files'
                onClick={async () => {
                    rfpd.current = `${await shell.get_home_dir()}uploads/`
                    
                    rform.current?.setFieldsValue({
                        fpd: rfpd.current,
                        files: [ ]
                    })
                    
                    modal.open()
                }}
            >
                <CloudUploadOutlined />
                <span className={`text ${language}`}>{t('上传本地文件')}</span>
            </div>
        </Tooltip>
        
        <Modal
            className='upload-files-modal'
            title={title}
            open={modal.visible}
            onCancel={modal.close}
            footer={null}
            width={1200}
        >
            <Form<Fields>
                className='upload-files-form'
                ref={rform}
                initialValues={{
                    files: [ ],
                    fpd: rfpd.current
                } satisfies Partial<Fields>}
                onFinish={async ({ files, fpd }) => {
                    fpd = fpd.fpd
                    
                    set_loading(true)
                    
                    try {
                        const { ddb } = model
                        
                        // 确保远程目录存在
                        if (!await ddb.invoke('exists', [fpd]))
                            await ddb.invoke('mkdir', [fpd])
                        
                        let ntext_files = 0
                        let binary_names: string[] = [ ]
                        
                        // 判断并上传每个文件
                        for (const { originFileObj, name } of files) {
                            const buffer = new Uint8Array(
                                await originFileObj.arrayBuffer())
                            
                            // 检查是否包含 0 字节（二进制文件）
                            if (buffer.includes(0)) {
                                binary_names.push(name)
                                continue
                            }
                            
                            await ddb.invoke('saveTextFile', [decode(buffer), fpd + name])
                            
                            ++ntext_files
                        }
                        
                        model.modal.success({
                            title: t('上传成功'),
                            content: <>
                                {ntext_files > 0 &&
                                    <div>{t('成功上传 {{count}} 个文本文件到 {{fpd}}', { count: ntext_files, fpd })}</div>
                                }
                                {binary_names.length > 0 && <>
                                    <div>{t('跳过 {{count}} 个二进制文件:', { count: binary_names.length })}</div>
                                    {binary_names.map(name => <div key={name}>{name}</div>)}
                                </> }
                            </>
                        })
                        
                        modal.close()
                    } finally {
                        set_loading(false)
                    }
                }}
            >
                <Form.Item<Fields>
                    name='fpd'
                    label={t('远程路径')}
                    extra={t('上传到服务器的目录路径，文件名将保持原名')}
                    {...required}
                >
                    <Input />
                </Form.Item>
                
                <Form.Item<Fields>
                    className='files-item'
                    name='files'
                    label={t('选择文件')}
                    getValueProps={files => ({ fileList: files || [] })}
                    getValueFromEvent={({ fileList }) => fileList}
                    required
                    rules={[
                        { required: true },
                        { validator (_, files: UploadFile[]) {
                            if (files?.some(({ type, size }) => type === '' && size === 0))
                                return Promise.reject(t('不支持上传文件夹'))
                            
                            return Promise.resolve()
                        }}
                    ]}
                >
                    <Upload.Dragger
                        className='files-uploader'
                        showUploadList={false}
                        customRequest={noop}
                        multiple
                        directory={false}
                    >
                        <Result
                            className='result'
                            icon={<InboxOutlined />}
                            title={t('拖拽文件到这里，或点击后弹框选择文件')}
                        />
                    </Upload.Dragger>
                </Form.Item>
                
                <Form.Item<Fields> dependencies={['files']}>
                    {form =>
                        <Table<UploadFile>
                            className='files-table'
                            size='small'
                            sticky
                            pagination={false}
                            dataSource={(form.getFieldValue('files') || []) as UploadFile[]}
                            rowKey='uid'
                            columns={[
                                {
                                    className: 'fp',
                                    key: 'fp',
                                    title: t('待上传的文本文件'),
                                    render: (_, { name: fname }) => <>
                                        <FileOutlined />
                                        <span className='text'>{fname}</span>
                                    </>
                                },
                                {
                                    className: 'size',
                                    key: 'size',
                                    title: t('大小'),
                                    align: 'right',
                                    width: 130,
                                    render: (_, { size }) => size?.to_fsize_str()
                                },
                                {
                                    className: 'actions',
                                    key: 'actions',
                                    title: t('操作'),
                                    width: 80,
                                    render: (_, file) =>
                                        !loading && <Link onClick={() => {
                                            form.setFieldValue(
                                                'files', 
                                                ((form.getFieldValue('files') || [ ]) as UploadFile[])
                                                    .filter(f => f.uid !== file.uid))
                                            
                                            rerender()
                                        }}>{t('删除')}</Link>
                                }
                            ]}
                        />
                    }
                </Form.Item>
                
                <div className='submit-line'>
                    <Button
                        className='upload-button'
                        type='primary'
                        htmlType='submit'
                        loading={loading}
                    >{t('上传')}</Button>
                    
                    <Button disabled={loading} onClick={modal.close}>{t('取消')}</Button>
                </div>
            </Form>
        </Modal>
    </>
}
