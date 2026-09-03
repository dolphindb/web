import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'
import { prepare_file_upload, upload_file_parts } from './multipart-upload.ts'
import type {
    IKnowledgeAvailableItem,
    IKnowledgeBaseAgentBinding,
    IKnowledgeBaseAgentBindingListResult,
    IKnowledgeBaseConfig,
    IKnowledgeBaseInfo,
    IKnowledgeBaseRegisterPayload,
    IKnowledgeBaseUpdatePayload,
    IKnowledgeDocumentInfo,
    IKnowledgeGenerationInfo,
    IKnowledgeGenerationListResult,
    IKnowledgeJobInfo,
    IKnowledgeReadResult,
    IKnowledgeRetrievalConfig,
    IKnowledgeRetrievalDiagnostic,
    IKnowledgeRetrieveResult,
    IKnowledgeUploadInfo,
} from './types.ts'


export const KNOWLEDGE_UPLOAD_ACCEPT = '.pdf,.docx,.txt,.md,.zip'
const KNOWLEDGE_UPLOAD_EXTENSIONS = new Set(KNOWLEDGE_UPLOAD_ACCEPT.split(','))


export function validate_knowledge_upload_file (file: File) {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!KNOWLEDGE_UPLOAD_EXTENSIONS.has(extension))
        throw new Error(t('仅支持上传 PDF、DOCX、TXT、MD 或 ZIP 格式文件'))
    if (file.size < 1 || file.size > 100 * 1024 * 1024)
        throw new Error(t('文件大小必须在 1 字节到 100 MiB 之间'))
}


export class ChatKnowledgeModel {
    constructor (private chat: ChatModel) { }
    
    private async load_page_items<T> (
        path: string,
        search: URLSearchParams,
        offset?: number,
        limit?: number,
        page_size = 100
    ): Promise<T[]> {
        if (offset !== undefined || limit !== undefined) {
            if (offset !== undefined)
                search.set('offset', String(offset))
            if (limit !== undefined)
                search.set('limit', String(limit))
            const query = search.toString()
            const result: { items?: T[], total?: number } = await this.chat.agent.api_fetch(`${path}${query ? `?${query}` : ''}`)
            return result.items || [ ]
        }
        
        const items: T[] = [ ]
        let page_offset = 0
        while (true) {
            const page_search = new URLSearchParams(search)
            page_search.set('offset', String(page_offset))
            page_search.set('limit', String(page_size))
            const result: { items?: T[], total?: number } = await this.chat.agent.api_fetch(`${path}?${page_search}`)
            const page_items = result.items || [ ]
            items.push(...page_items)
            const total = Number(result.total)
            if (page_items.length < page_size || (Number.isFinite(total) && items.length >= total))
                break
            page_offset += page_items.length
        }
        return items
    }
    
    // --- 知识库 CRUD ---
    
    async list_knowledge_bases (params: { status?: string, offset?: number, limit?: number } = { }): Promise<IKnowledgeBaseInfo[]> {
        const search = new URLSearchParams()
        if (params.status)
            search.set('status', params.status)
        return this.load_page_items<IKnowledgeBaseInfo>('/knowledge/base/list', search, params.offset, params.limit)
    }
    
    async get_knowledge_base (knowledge_base_id: string): Promise<IKnowledgeBaseInfo> {
        return this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}`)
    }
    
    async register_knowledge_base (payload: IKnowledgeBaseRegisterPayload): Promise<{ knowledgeBaseId: string, generationId: string, jobId: string }> {
        return this.chat.agent.api_fetch('/knowledge/base/register', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }
    
    async update_knowledge_base (knowledge_base_id: string, payload: IKnowledgeBaseUpdatePayload): Promise<IKnowledgeBaseInfo> {
        return this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        })
    }
    
    async delete_knowledge_base (knowledge_base_id: string): Promise<{ jobId: string }> {
        return this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}/delete`, {
            method: 'POST',
        })
    }
    
    async build_index (knowledge_base_id: string, config?: IKnowledgeBaseConfig): Promise<{ knowledgeBaseId: string, generationId: string, jobId: string }> {
        const body = config ? { config } : { }
        return this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}/index/build`, {
            method: 'POST',
            body: JSON.stringify(body),
        })
    }
    
    // --- 索引 Generation ---
    
    async list_generations (knowledge_base_id: string): Promise<IKnowledgeGenerationInfo[]> {
        const result: IKnowledgeGenerationListResult = await this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}/generation/list`)
        return result.items || [ ]
    }
    
    // --- Agent 绑定 ---
    
    async list_agent_bindings (knowledge_base_id: string): Promise<IKnowledgeBaseAgentBinding[]> {
        const result: IKnowledgeBaseAgentBindingListResult = await this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}/agent/list`)
        return result.items || [ ]
    }
    
    async bind_agent (knowledge_base_id: string, agent_id: string): Promise<IKnowledgeBaseAgentBinding> {
        return this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}/agent/bind`, {
            method: 'POST',
            body: JSON.stringify({ agentId: agent_id }),
        })
    }
    
    async unbind_agent (knowledge_base_id: string, agent_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}/agent/${encodeURIComponent(agent_id)}`, {
            method: 'DELETE',
        })
    }
    
    async load_agent_knowledge_bases (agent_id: string, knowledge_bases?: IKnowledgeBaseInfo[]): Promise<IKnowledgeBaseInfo[]> {
        const visible_kbs = (knowledge_bases || await this.list_knowledge_bases()).filter(kb => kb.status !== 'DELETED')
        const binding_states = await Promise.all(visible_kbs.map(async kb =>
            (await this.list_agent_bindings(kb.knowledgeBaseId)).some(binding => binding.agentId === agent_id)
        ))
        return visible_kbs.filter((_, index) => binding_states[index])
    }
    
    // --- 文档管理 ---
    
    async list_documents_page (
        knowledge_base_id: string,
        params: { status?: string, fileName?: string, importJobId?: string, offset?: number, limit?: number } = { }
    ): Promise<{ items: IKnowledgeDocumentInfo[], total?: number, offset?: number, limit?: number }> {
        const search = new URLSearchParams()
        if (params.status)
            search.set('status', params.status)
        if (params.fileName)
            search.set('fileName', params.fileName)
        if (params.importJobId)
            search.set('importJobId', params.importJobId)
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        const query = search.toString()
        const result = await this.chat.agent.api_fetch(
            `/knowledge/base/${encodeURIComponent(knowledge_base_id)}/document/list${query ? `?${query}` : ''}`
        )
        return {
            items: result.items || [ ],
            total: result.total,
            offset: result.offset ?? params.offset,
            limit: result.limit ?? params.limit,
        }
    }
    
    async list_documents (
        knowledge_base_id: string,
        params: { status?: string, fileName?: string, importJobId?: string, offset?: number, limit?: number } = { }
    ): Promise<IKnowledgeDocumentInfo[]> {
        const search = new URLSearchParams()
        if (params.status)
            search.set('status', params.status)
        if (params.fileName)
            search.set('fileName', params.fileName)
        if (params.importJobId)
            search.set('importJobId', params.importJobId)
        return this.load_page_items<IKnowledgeDocumentInfo>(
            `/knowledge/base/${encodeURIComponent(knowledge_base_id)}/document/list`,
            search,
            params.offset,
            params.limit
        )
    }
    
    async get_document (document_id: string): Promise<IKnowledgeDocumentInfo> {
        return this.chat.agent.api_fetch(`/knowledge/document/${encodeURIComponent(document_id)}`)
    }
    
    async delete_document (document_id: string): Promise<{ jobId: string }> {
        return this.chat.agent.api_fetch(`/knowledge/document/${encodeURIComponent(document_id)}/delete`, {
            method: 'POST',
        })
    }
    
    async upload_document (
        knowledge_base_id: string,
        file: File,
        upload_mode?: 'DOCUMENT' | 'ZIP_IMPORT',
        on_progress?: (percent: number) => void
    ): Promise<{ jobId: string }> {
        validate_knowledge_upload_file(file)
        const is_zip_file = file.name.toLowerCase().endsWith('.zip')
        const mode = upload_mode || (is_zip_file ? 'ZIP_IMPORT' : 'DOCUMENT')
        if (mode === 'ZIP_IMPORT' && !is_zip_file)
            throw new Error(t('ZIP 导入要求文件名以 .zip 结尾'))
            
        const zip_content_types = new Set(['application/zip', 'application/x-zip-compressed'])
        const content_type = mode === 'ZIP_IMPORT'
            ? zip_content_types.has(file.type.toLowerCase()) ? file.type : 'application/zip'
            : file.type || 'application/octet-stream'
        const { buffer, sha256 } = await prepare_file_upload(file)
        
        const init_res: IKnowledgeUploadInfo = await this.chat.agent.api_fetch(
            `/knowledge/base/${encodeURIComponent(knowledge_base_id)}/document/upload/init`,
            {
                method: 'POST',
                body: JSON.stringify({
                    uploadMode: mode,
                    fileName: file.name,
                    contentType: content_type,
                    byteSize: file.size,
                    sha256,
                }),
            }
        )
        
        const { uploadId, partSize, partCount } = init_res
        
        try {
            await upload_file_parts(buffer, partSize, partCount, async (part_no, part, part_sha256) => {
                await this.chat.agent.api_fetch(
                    `/knowledge/upload/${encodeURIComponent(uploadId)}/part/${part_no}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'X-Part-Sha256': part_sha256,
                        },
                        body: part,
                    }
                )
            }, on_progress)
            
            const complete_res = await this.chat.agent.api_fetch(
                `/knowledge/upload/${encodeURIComponent(uploadId)}/complete`,
                { method: 'POST' }
            )
            return { jobId: complete_res.jobId }
        } catch (error) {
            try {
                await this.chat.agent.api_fetch(
                    `/knowledge/upload/${encodeURIComponent(uploadId)}/abort`,
                    { method: 'POST' }
                )
            } catch { }
            throw error
        }
    }
    
    // --- 任务 Job 管理 ---
    
    async list_jobs_page (
        params: { knowledgeBaseId?: string, jobType?: string, status?: string, offset?: number, limit?: number } = { }
    ): Promise<{ items: IKnowledgeJobInfo[], total?: number, offset?: number, limit?: number }> {
        const search = new URLSearchParams()
        if (params.knowledgeBaseId)
            search.set('knowledgeBaseId', params.knowledgeBaseId)
        if (params.jobType)
            search.set('jobType', params.jobType)
        if (params.status)
            search.set('status', params.status)
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        const query = search.toString()
        const result = await this.chat.agent.api_fetch(`/knowledge/job/list${query ? `?${query}` : ''}`)
        return {
            items: result.items || [ ],
            total: result.total,
            offset: result.offset ?? params.offset,
            limit: result.limit ?? params.limit,
        }
    }
    
    async list_jobs (params: { knowledgeBaseId?: string, jobType?: string, status?: string, offset?: number, limit?: number } = { }): Promise<IKnowledgeJobInfo[]> {
        const search = new URLSearchParams()
        if (params.knowledgeBaseId)
            search.set('knowledgeBaseId', params.knowledgeBaseId)
        if (params.jobType)
            search.set('jobType', params.jobType)
        if (params.status)
            search.set('status', params.status)
        return this.load_page_items<IKnowledgeJobInfo>('/knowledge/job/list', search, params.offset, params.limit)
    }
    
    async get_job (job_id: string): Promise<IKnowledgeJobInfo> {
        return this.chat.agent.api_fetch(`/knowledge/job/${encodeURIComponent(job_id)}`)
    }
    
    async retry_job (job_id: string): Promise<IKnowledgeJobInfo> {
        return this.chat.agent.api_fetch(`/knowledge/job/${encodeURIComponent(job_id)}/retry`, {
            method: 'POST',
        })
    }
    
    async cancel_job (job_id: string): Promise<IKnowledgeJobInfo> {
        return this.chat.agent.api_fetch(`/knowledge/job/${encodeURIComponent(job_id)}/cancel`, {
            method: 'POST',
        })
    }
    
    // --- 检索测试与诊断 ---
    
    async test_retrieval (payload: {
        agentId?: string
        sessionId?: string
        knowledgeBaseId: string
        query: string
        retrievalConfig?: Partial<IKnowledgeRetrievalConfig>
    }): Promise<IKnowledgeRetrieveResult> {
        return this.chat.agent.api_fetch('/knowledge/retrieve/test', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }
    
    // --- 运行时接口（面向 Agent Loop / 工具调用） ---
    
    async get_available_knowledge_bases (params: { sessionId?: string, agentId?: string } = { }): Promise<IKnowledgeAvailableItem[]> {
        const body: Record<string, string> = { }
        if (params.sessionId)
            body.sessionId = params.sessionId
        if (params.agentId)
            body.agentId = params.agentId
        const result = await this.chat.agent.api_fetch('/knowledge/available', {
            method: 'POST',
            body: JSON.stringify(body),
        })
        return result?.items || [ ]
    }
    
    async retrieve (params: { sessionId?: string, agentId?: string, knowledgeBaseId: string, query: string }): Promise<IKnowledgeRetrieveResult> {
        return this.chat.agent.api_fetch('/knowledge/retrieve', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    
    async read_chunk (params: { sessionId?: string, agentId?: string, knowledgeBaseId: string, chunkId: string, before?: number, after?: number }): Promise<IKnowledgeReadResult> {
        return this.chat.agent.api_fetch('/knowledge/read', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
}
