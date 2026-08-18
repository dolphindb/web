import { Input, Modal, Space, Table } from 'antd'

import { t } from '@i18n'
import type { IMemoryEntry } from '@/agent/model.ts'
import { ellipsis_text, format_browser_time } from '@/agent/dolphinx/common.tsx'


export function MemoryDetailModal ({
    memory,
    on_close,
}: {
    memory: IMemoryEntry | null
    on_close: () => void
}) {
    return <Modal
        title={t('记忆详情')}
        open={Boolean(memory)}
        onCancel={on_close}
        footer={null}
        width={760}
    >
        {memory && <Space direction='vertical' style={{ width: '100%' }}>
            <Table
                size='small'
                pagination={false}
                showHeader={false}
                rowKey='key'
                tableLayout='fixed'
                dataSource={[
                    { key: 'id', label: 'ID', value: memory.memoryId },
                    { key: 'memoryKind', label: t('主分类'), value: memory.memoryKind || '-' },
                    { key: 'title', label: t('标题'), value: memory.title || '-' },
                    { key: 'importance', label: t('重要度'), value: memory.importance ?? '-' },
                    { key: 'confidence', label: t('置信度'), value: memory.confidence ?? '-' },
                    { key: 'summary', label: t('摘要'), value: memory.shortSummary || '-' },
                    { key: 'keywords', label: t('关键词'), value: memory.keywords || '-' },
                    { key: 'tags', label: t('标签'), value: memory.tags || '-' },
                    { key: 'source', label: t('来源'), value: memory.source || '-' },
                    { key: 'sourceRefs', label: t('来源引用'), value: memory.sourceRefs || '-' },
                    { key: 'rankScore', label: t('综合分'), value: memory.rankScore ?? '-' },
                    { key: 'textScore', label: t('文本分'), value: memory.textScore ?? '-' },
                    { key: 'vectorScore', label: t('向量分'), value: memory.vectorScore ?? '-' },
                    { key: 'updateTime', label: t('更新时间'), value: format_browser_time(memory.updateTime) },
                ]}
                columns={[
                    { dataIndex: 'label', width: 120 },
                    { dataIndex: 'value', render: ellipsis_text },
                ]}
            />
            <Input.TextArea value={memory.content} rows={6} readOnly />
        </Space>}
    </Modal>
}
