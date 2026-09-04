import { t } from '@i18n'
import type { IKnowledgeBaseConfig, IKnowledgeRetrievalConfig, ILlmConfig } from '@/agent/model/types.ts'



export const DEFAULT_RETRIEVAL_CONFIG: IKnowledgeRetrievalConfig = {
    topK: 8,
    candidateCount: 30,
    rerankEnabled: false,
    rerankProviderConfigId: '',
}

export const DEFAULT_KB_CONFIG: IKnowledgeBaseConfig = {
    embeddingRef: {
        source: 'builtin',
    },
    chunking: {
        maxChunkChars: 1000,
        overlapChars: 100,
        includeHeading: true,
    },
    textIndex: {
        parser: 'mixed',
        full: false,
        lowercase: true,
        stem: false,
    },
    vectorIndex: {
        indexType: 'flat',
    },
}


export interface KnowledgeCreateFormState {
    name: string
    description: string
    topK: number
    candidateCount: number
    rerankEnabled: boolean
    rerankProviderConfigId: string
    embeddingSource: 'builtin' | 'llmConfig'
    llmConfigId: string
    maxChunkChars: number
    overlapChars: number
    includeHeading: boolean
    parser: 'mixed' | 'chinese' | 'english'
    full: boolean
    lowercase: boolean
    stem: boolean
    indexType: 'flat' | 'hnsw'
}


export const DEFAULT_KB_FORM: KnowledgeCreateFormState = {
    name: '',
    description: '',
    topK: 8,
    candidateCount: 30,
    rerankEnabled: false,
    rerankProviderConfigId: '',
    embeddingSource: 'builtin',
    llmConfigId: '',
    maxChunkChars: 1000,
    overlapChars: 100,
    includeHeading: true,
    parser: 'mixed',
    full: false,
    lowercase: true,
    stem: false,
    indexType: 'flat',
}


export const VECTOR_INDEX_TYPE_OPTIONS = [
    { value: 'flat', label: t('Flat (精确搜索)') },
    { value: 'hnsw', label: t('HNSW (近似图索引)') },
]


export function format_byte_size (bytes?: number): string {
    if (bytes === undefined || bytes === null || !Number.isFinite(bytes))
        return '-'
    if (bytes < 1024)
        return `${bytes} B`
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}


export function get_job_type_label (type?: string): string {
    switch (type) {
        case 'INDEX_BUILD':
            return t('索引构建')
        case 'DOCUMENT_IMPORT':
            return t('文档导入')
        case 'ZIP_IMPORT':
            return t('ZIP 批量导入')
        case 'DOCUMENT_DELETE':
            return t('文档删除')
        case 'KNOWLEDGE_BASE_DELETE':
            return t('知识库删除')
        case 'INDEX_CLEANUP':
            return t('索引清理')
        default:
            return type || '-'
    }
}


export function get_kb_status_label (status?: string): string {
    switch (status) {
        case 'ACTIVE':
            return t('活跃')
        case 'INITIALIZING':
            return t('初始化中')
        case 'READY':
            return t('就绪')
        case 'BUILDING':
            return t('构建中')
        case 'PENDING':
            return t('等待中')
        case 'RUNNING':
            return t('运行中')
        case 'PARSING':
            return t('解析中')
        case 'SUCCEEDED':
        case 'PARTIAL':
        case 'OK':
            return t('成功')
        case 'ERROR':
        case 'FAILED':
            return t('失败')
        case 'RETIRED':
            return t('已归档')
        case 'DELETING':
            return t('删除中')
        case 'DELETED':
            return t('已删除')
        case 'RETRY_WAIT':
            return t('等待重试')
        case 'CANCEL_REQUESTED':
            return t('取消中')
        case 'CANCELLED':
            return t('已取消')
        default:
            return status || '-'
    }
}


export function get_kb_status_color (status?: string): string {
    switch (status) {
        case 'ACTIVE':
        case 'SUCCEEDED':
        case 'PARTIAL':
        case 'OK':
        case 'READY':
            return 'green'
        case 'INITIALIZING':
        case 'PENDING':
        case 'RUNNING':
        case 'BUILDING':
        case 'PARSING':
        case 'IMPORTING':
            return 'processing'
        case 'ERROR':
        case 'FAILED':
            return 'red'
        case 'DELETING':
        case 'DELETED':
        case 'CANCELLED':
        case 'RETIRED':
            return 'default'
        case 'RETRY_WAIT':
        case 'CANCEL_REQUESTED':
            return 'warning'
        default:
            return 'default'
    }
}


export { format_model_label, format_model_label as format_chat_config_label } from '@/agent/model/helpers.ts'

