import { useEffect, useState } from 'react'
import { Button, Empty, Modal, Popconfirm, Progress, Space, Table, Tag, Tooltip, Typography, Upload } from 'antd'
import { DeleteOutlined, InboxOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import { model } from '@model'
import type { IKnowledgeBaseInfo, IKnowledgeDocumentInfo } from '@/agent/model/types.ts'
import { chat_model } from '@/agent/model.ts'
import { KNOWLEDGE_UPLOAD_ACCEPT, validate_knowledge_upload_file } from '@/agent/model/knowledge.ts'
import { required_plugins_model } from '@/agent/model/required-plugins.ts'
import { format_browser_time } from '@/agent/dolphinx/common.tsx'
import { format_byte_size, get_kb_status_color, get_kb_status_label } from './types.ts'


const { Text } = Typography
const { Dragger } = Upload


export function DocumentsTab ({ kb }: { kb: IKnowledgeBaseInfo }) {
    const [docs, set_docs] = useState<IKnowledgeDocumentInfo[]>([ ])
    const [page, set_page] = useState(1)
    const [page_size, set_page_size] = useState(10)
    const [total, set_total] = useState(0)
    const [loading, set_loading] = useState(false)
    const [upload_modal_visible, set_upload_modal_visible] = useState(false)
    const [uploading, set_uploading] = useState(false)
    const [upload_progress, set_upload_progress] = useState(0)
    const [upload_file, set_upload_file] = useState<File | null>(null)
    const [upload_error, set_upload_error] = useState('')
    
    async function load (p = page, ps = page_size, silent = false) {
        if (!silent)
            set_loading(true)
        try {
            const offset = (p - 1) * ps
            const result = await chat_model.knowledge.list_documents_page(kb.knowledgeBaseId, {
                offset,
                limit: ps,
            })
            set_docs(result.items)
            set_page(p)
            set_page_size(ps)
            set_total(result.total)
        } catch {
            if (!silent)
                model.message?.error(t('加载文档列表失败'))
        } finally {
            if (!silent)
                set_loading(false)
        }
    }
    
    useEffect(() => {
        load(1, page_size)
    }, [kb.knowledgeBaseId])
    
    async function handle_upload () {
        if (!upload_file) {
            set_upload_error(t('请选择要上传的文档或 ZIP 压缩包'))
            return
        }
        set_upload_error('')
        set_uploading(true)
        set_upload_progress(0)
        
        try {
            await chat_model.knowledge.upload_document(
                kb.knowledgeBaseId,
                upload_file,
                undefined,
                percent => { set_upload_progress(percent) }
            )
            model.message?.success(t('上传完成，文档处理任务已在后台启动'))
            set_upload_modal_visible(false)
            set_upload_file(null)
            set_upload_progress(0)
            await load(1, page_size)
            setTimeout(() => {
                load(1, page_size, true)
            }, 2000)
        } catch (err: any) {
            set_upload_error(err.message || t('上传失败'))
            required_plugins_model.open(err)
        } finally {
            set_uploading(false)
        }
    }
    
    async function delete_doc (doc: IKnowledgeDocumentInfo) {
        try {
            await chat_model.knowledge.delete_document(doc.documentId)
            model.message?.success(t('已提交删除任务'))
            await load(page, page_size)
            setTimeout(() => {
                load(page, page_size, true)
            }, 2000)
        } catch (err: any) {
            model.message?.error(err.message || t('删除失败'))
        }
    }
    
    return <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>
                {t('支持上传单个 PDF、DOCX、TXT、MD 文档，或打包为单层 ZIP 批量导入。')}
            </Text>
            <Space size={8}>
                <Tooltip title={t('刷新')}>
                    <Button size='small' icon={<ReloadOutlined />} onClick={() => { load(page, page_size) }} />
                </Tooltip>
                <Button
                    type='primary'
                    size='small'
                    icon={<PlusOutlined />}
                    disabled={kb.status !== 'ACTIVE'}
                    onClick={() => {
                        set_upload_file(null)
                        set_upload_error('')
                        set_upload_progress(0)
                        set_upload_modal_visible(true)
                    }}
                >
                    {t('上传文档')}
                </Button>
            </Space>
        </div>
        
        <Table
            size='small'
            rowKey='documentId'
            loading={loading}
            dataSource={docs}
            pagination={{
                current: page,
                pageSize: page_size,
                total,
                showSizeChanger: true,
                onChange: (p, ps) => { load(p, ps) },
            }}
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无文档')} /> }}
            columns={[
                {
                    title: t('文件名'),
                    dataIndex: 'fileName',
                    render: (fileName: string, record: IKnowledgeDocumentInfo) => <div style={{ minWidth: 0 }}>
                            <Text strong title={fileName} style={{ display: 'block', maxWidth: '100%' }} ellipsis>
                                {fileName}
                            </Text>
                            {record.sourceRelativePath && <Text type='secondary' style={{ fontSize: 11 }}>
                                {record.sourceRelativePath}
                            </Text>}
                        </div>,
                },
                {
                    title: t('大小'),
                    dataIndex: 'byteSize',
                    width: 100,
                    render: (size: number) => format_byte_size(size),
                },
                {
                    title: t('解析状态'),
                    dataIndex: 'parseStatus',
                    width: 110,
                    render: (status: string, record: IKnowledgeDocumentInfo) => <Tooltip title={record.lastError || undefined}>
                            <Tag color={get_kb_status_color(status)} style={{ cursor: record.lastError ? 'pointer' : 'default' }}>
                                {get_kb_status_label(status)}
                            </Tag>
                        </Tooltip>,
                },
                {
                    title: t('上传时间'),
                    dataIndex: 'createTime',
                    width: 160,
                    render: (time: string) => <Text type='secondary' style={{ fontSize: 12 }}>{format_browser_time(time)}</Text>,
                },
                {
                    title: t('操作'),
                    width: 80,
                    render: (_: unknown, record: IKnowledgeDocumentInfo) => <Popconfirm
                            title={t('确定删除该文档？')}
                            onConfirm={() => { delete_doc(record) }}
                            okButtonProps={{ danger: true }}
                        >
                            <Button size='small' danger type='text' icon={<DeleteOutlined />} />
                        </Popconfirm>,
                },
            ]}
        />
        
        <Modal
            title={t('上传文档或 ZIP 导入')}
            open={upload_modal_visible}
            onCancel={() => {
                if (!uploading)
                    set_upload_modal_visible(false)
            }}
            onOk={handle_upload}
            confirmLoading={uploading}
            okText={t('开始上传')}
            cancelText={t('取消')}
            destroyOnHidden
        >
            <div style={{ marginTop: 12 }}>
                <Dragger
                    accept={KNOWLEDGE_UPLOAD_ACCEPT}
                    maxCount={1}
                    beforeUpload={file => {
                        try {
                            validate_knowledge_upload_file(file)
                        } catch (err: any) {
                            set_upload_file(null)
                            set_upload_error(err.message)
                            return Upload.LIST_IGNORE
                        }
                        set_upload_file(file)
                        set_upload_error('')
                        return false
                    }}
                    onRemove={() => { set_upload_file(null) }}
                    fileList={upload_file ? [{ uid: '-1', name: upload_file.name, size: upload_file.size }] as any : [ ]}
                >
                    <p className='ant-upload-drag-icon'>
                        <InboxOutlined />
                    </p>
                    <p className='ant-upload-text'>{t('点击或将文件拖拽至此处上传')}</p>
                    <p className='ant-upload-hint'>
                        {t('支持单文件上传（PDF、DOCX、TXT、MD，最大 100MB）或 ZIP 压缩包批量导入（ZIP 内所有文件必须在同一层，最大 100MB）。')}
                    </p>
                </Dragger>
                
                {uploading && <div style={{ marginTop: 16 }}>
                    <Progress percent={upload_progress} status='active' />
                    <div style={{ textAlign: 'center', fontSize: 12, marginTop: 4, color: 'var(--ant-color-text-secondary)' }}>
                        {t('分片校验与上传中...')} {upload_progress}%
                    </div>
                </div>}
                
                {upload_error && <div style={{ marginTop: 12 }}><Text type='danger'>{upload_error}</Text></div>}
            </div>
        </Modal>
    </div>
}
