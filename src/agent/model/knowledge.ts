import type { ChatModel } from '@/agent/model.ts'
import type {
    IKnowledgeAvailableItem,
    IKnowledgeBaseAgentBinding,
    IKnowledgeBaseAgentBindingListResult,
    IKnowledgeBaseConfig,
    IKnowledgeBaseInfo,
    IKnowledgeBaseListResult,
    IKnowledgeBaseRegisterPayload,
    IKnowledgeBaseUpdatePayload,
    IKnowledgeDocumentInfo,
    IKnowledgeDocumentListResult,
    IKnowledgeGenerationInfo,
    IKnowledgeGenerationListResult,
    IKnowledgeJobInfo,
    IKnowledgeJobListResult,
    IKnowledgeReadResult,
    IKnowledgeRerankConfig,
    IKnowledgeRerankConfigInput,
    IKnowledgeRetrievalDiagnostic,
    IKnowledgeRetrieveResult,
    IKnowledgeUploadInfo,
} from './types.ts'


async function compute_sha256 (buffer: ArrayBuffer): Promise<string> {
    const hash_buffer = await crypto.subtle.digest('SHA-256', buffer)
    const hash_array = Array.from(new Uint8Array(hash_buffer))
    return hash_array.map(b => b.toString(16).padStart(2, '0')).join('')
}


export class ChatKnowledgeModel {
    constructor (private chat: ChatModel) { }
    
    // --- 知识库 CRUD ---
    
    async list_knowledge_bases (params: { status?: string, offset?: number, limit?: number } = { }): Promise<IKnowledgeBaseInfo[]> {
        const search = new URLSearchParams()
        if (params.status)
            search.set('status', params.status)
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        const query = search.toString()
        const result: IKnowledgeBaseListResult = await this.chat.agent.api_fetch(`/knowledge/base/list${query ? `?${query}` : ''}`)
        return result.items || [ ]
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
    
    async load_agent_knowledge_bases (agent_id: string): Promise<IKnowledgeAvailableItem[]> {
        return this.get_available_knowledge_bases({ agentId: agent_id })
    }
    
    // --- 文档管理 ---
    
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
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        const query = search.toString()
        const result: IKnowledgeDocumentListResult = await this.chat.agent.api_fetch(`/knowledge/base/${encodeURIComponent(knowledge_base_id)}/document/list${query ? `?${query}` : ''}`)
        return result.items || [ ]
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
        const is_zip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')
        const mode = upload_mode || (is_zip ? 'ZIP_IMPORT' : 'DOCUMENT')
        const buffer = await file.arrayBuffer()
        const sha256 = await compute_sha256(buffer)
        
        const init_res: IKnowledgeUploadInfo = await this.chat.agent.api_fetch(
            `/knowledge/base/${encodeURIComponent(knowledge_base_id)}/document/upload/init`,
            {
                method: 'POST',
                body: JSON.stringify({
                    uploadMode: mode,
                    fileName: file.name,
                    contentType: file.type || (is_zip ? 'application/zip' : 'application/octet-stream'),
                    byteSize: file.size,
                    sha256,
                }),
            }
        )
        
        const { uploadId, partSize, partCount } = init_res
        
        try {
            for (let part_no = 0;  part_no < partCount;  part_no++) {
                const start = part_no * partSize
                const end = Math.min(start + partSize, file.size)
                const part_buffer = buffer.slice(start, end)
                const part_sha256 = await compute_sha256(part_buffer)
                
                await this.chat.agent.api_fetch(
                    `/knowledge/upload/${encodeURIComponent(uploadId)}/part/${part_no}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'X-Part-Sha256': part_sha256,
                        },
                        body: part_buffer,
                    }
                )
                on_progress?.(Math.round(((part_no + 1) / partCount) * 100))
            }
            
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
    
    async list_jobs (params: { knowledgeBaseId?: string, jobType?: string, status?: string, offset?: number, limit?: number } = { }): Promise<IKnowledgeJobInfo[]> {
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
        const result: IKnowledgeJobListResult = await this.chat.agent.api_fetch(`/knowledge/job/list${query ? `?${query}` : ''}`)
        return result.items || [ ]
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
    
    // --- 全局 Rerank 配置 ---
    
    async get_rerank_config (): Promise<IKnowledgeRerankConfig> {
        return this.chat.agent.api_fetch('/knowledge/rerank/config')
    }
    
    async update_rerank_config (config: IKnowledgeRerankConfigInput): Promise<IKnowledgeRerankConfig> {
        return this.chat.agent.api_fetch('/knowledge/rerank/config', {
            method: 'PUT',
            body: JSON.stringify(config),
        })
    }
    
    // --- 检索测试与诊断 ---
    
    async test_retrieval (payload: { agentId?: string, sessionId?: string, knowledgeBaseId: string, query: string, topK?: number }): Promise<IKnowledgeRetrieveResult> {
        return this.chat.agent.api_fetch('/knowledge/retrieve/test', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }
    
    async get_retrieval_diagnostic (retrieval_id: string): Promise<IKnowledgeRetrievalDiagnostic> {
        return this.chat.agent.api_fetch(`/knowledge/retrieval/${encodeURIComponent(retrieval_id)}`)
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
    
    async retrieve (params: { sessionId?: string, agentId?: string, knowledgeBaseId: string, query: string, topK?: number }): Promise<IKnowledgeRetrieveResult> {
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
