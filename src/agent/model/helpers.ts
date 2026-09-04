import { t } from '@i18n'

import type { AgentAuthSubjectType, IAgentInfo } from './types.ts'
import { ENABLE_AGENT_GROUP_AUTH } from './constants.ts'


/**
 * 将 Agent Bus 后端返回的原始错误信息（特别是 BUS_CONFLICT / 关联引用类报错）转换为用户友好的错误提示。
 * 要求：将 agentId 替换为 Agent 名称，如果找不到名称则不直接暴露 Agent ID。
 */
export function format_agent_bus_error (raw_message: string, agents: IAgentInfo[] = [ ]): string {
    if (!raw_message || typeof raw_message !== 'string')
        return raw_message
    
    // 1. 全局重排 (Rerank) 引用模型
    if (/RERANK_CONFIG_REFERENCED|referenced by knowledge\.globalRerank/i.test(raw_message))
        return t('当前模型已被知识库“全局重排”引用，请先在知识库管理中关闭重排或切换其他模型。')
    
    // 2. 全局向量 (Embedding) / 知识库引用模型
    if (/EMBEDDING_CONFIG_REFERENCED|referenced by knowledge\.globalEmbedding/i.test(raw_message))
        return t('当前模型已被知识库“全局向量”引用，请先在知识库管理中解除关联或切换其他模型。')
    
    // 3. 模型被 Agent 绑定 / 引用：如 "llm config is still bound to 1 agent(s)..." 或 "llm config is still referenced by..."
    if (/llm\s*(?:config\s*)?is\s*still\s*(?:bound|referenced)/i.test(raw_message)) {
        const count_match = raw_message.match(/bound\s*to\s*(\d+)\s*agent/i)
        const count = count_match ? Number(count_match[1]) || 1 : 1
        const agent_id_match = raw_message.match(/agentId=([^\s,;]+)/i) || raw_message.match(/subjectType=AGENT,\s*subjectId=([^\s,;]+)/i)
        const sample_agent_id = agent_id_match ? agent_id_match[1] : ''
        const sample_agent_name = sample_agent_id ? agents.find(a => a.agentId === sample_agent_id)?.agentName : ''
        
        if (count > 1)
            return sample_agent_name
                ? t('当前模型仍被 {{count}} 个 Agent（如“{{name}}”）绑定，请先在 Agent 管理中解绑或切换模型。', { count, name: sample_agent_name })
                : t('当前模型仍被 {{count}} 个 Agent 绑定，请先在 Agent 管理中解绑或切换模型。', { count })
        return sample_agent_name
            ? t('当前模型已被 Agent“{{name}}”绑定，请先在 Agent 管理中解绑或切换模型。', { name: sample_agent_name })
            : t('当前模型已被 Agent 绑定，请先在 Agent 管理中解绑或切换模型。')
    }
    
    // 4. 技能被 Agent 绑定 / 引用：如 "skill is still bound to 1 agent(s)..." 或 "skill is still referenced by skill access: ..."
    if (/skill\s*is\s*still\s*(?:bound|referenced)/i.test(raw_message)) {
        const count_match = raw_message.match(/bound\s*to\s*(\d+)\s*agent/i)
        const count = count_match ? Number(count_match[1]) || 1 : 1
        const agent_id_match = raw_message.match(/agentId=([^\s,;]+)/i) || raw_message.match(/subjectType=AGENT,\s*subjectId=([^\s,;]+)/i)
        const sample_agent_id = agent_id_match ? agent_id_match[1] : ''
        const sample_agent_name = sample_agent_id ? agents.find(a => a.agentId === sample_agent_id)?.agentName : ''
        
        if (count > 1)
            return sample_agent_name
                ? t('当前技能仍被 {{count}} 个 Agent（如“{{name}}”）绑定，请先在 Agent 管理中解绑。', { count, name: sample_agent_name })
                : t('当前技能仍被 {{count}} 个 Agent 绑定，请先在 Agent 管理中解绑。', { count })
        return sample_agent_name
            ? t('当前技能已被 Agent“{{name}}”绑定，请先在 Agent 管理中解绑。', { name: sample_agent_name })
            : t('当前技能已被 Agent 绑定，请先在 Agent 管理中解绑。')
    }
    
    // 5. 记忆配置引用模型：如 "... referenced by memory ... agentId=agent_xxx"
    if (/MEMORY_CONFIG_REFERENCED|referenced by memory/i.test(raw_message)) {
        const agent_id_match = raw_message.match(/agentId=([^\s,;]+)/i)
        const agent_name = agent_id_match ? agents.find(a => a.agentId === agent_id_match[1])?.agentName : ''
        return agent_name
            ? t('当前模型已被 Agent“{{name}}”的记忆配置引用，请先在记忆管理中修改配置。', { name: agent_name })
            : t('当前模型已被 Agent 记忆配置引用，请先在记忆管理中修改配置。')
    }
    
    // 6. 其他 LLM_CONFIG_REFERENCED 或 SKILL_REFERENCED
    if (/LLM_CONFIG_REFERENCED/i.test(raw_message)) {
        const agent_id_match = raw_message.match(/agentId=([^\s,;]+)/i)
        const agent_name = agent_id_match ? agents.find(a => a.agentId === agent_id_match[1])?.agentName : ''
        return agent_name
            ? t('当前模型已被 Agent“{{name}}”引用，请先在 Agent 管理中解绑或切换模型。', { name: agent_name })
            : t('当前模型已被关联的 Agent 引用，请先在 Agent 管理中解绑或切换模型。')
    }
    
    if (/SKILL_REFERENCED/i.test(raw_message)) {
        const agent_id_match = raw_message.match(/agentId=([^\s,;]+)/i)
        const agent_name = agent_id_match ? agents.find(a => a.agentId === agent_id_match[1])?.agentName : ''
        return agent_name
            ? t('当前技能已被 Agent“{{name}}”引用，请先在 Agent 管理中解绑。', { name: agent_name })
            : t('当前技能已被关联的 Agent 引用，请先在 Agent 管理中解绑。')
    }
    
    // 7. 通用降级处理：如果包含 agentId=xxx，将其替换为对应的 Agent 名称，避免暴露 ID
    if (/agentId=[^\s,;]+/i.test(raw_message))
        return raw_message.replace(/agentId=([^\s,;]+)/gi, (_match, id) => {
            const name = agents.find(a => a.agentId === id)?.agentName
            return name ? t('Agent“{{name}}”', { name }) : t('相关 Agent')
        })
    
    return raw_message
}


export function get_auth_subject_parameter (subject_type: AgentAuthSubjectType, subject_id: string) {
    if (subject_type === 'GROUP' && !ENABLE_AGENT_GROUP_AUTH)
        throw new Error(t('用户组级别赋权功能暂未开启'))
    if (!subject_id.trim())
        throw new Error(t('授权对象不能为空'))
    return [subject_type === 'USER' ? 'userId' : 'groupId', subject_id] as const
}


export function parse_json_string (value: string): unknown {
    const trimmed = value.trim()
    if (!trimmed)
        return value
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )
        try { return JSON.parse(trimmed) } catch { }
    return value
}


export function normalize_json_object (value: unknown): Record<string, unknown> | undefined {
    const parsed = typeof value === 'string' ? parse_json_string(value) : value
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return undefined
    return parsed as Record<string, unknown>
}


export function normalize_json_object_string (value: unknown): string | undefined {
    if (typeof value === 'string')
        return value
    if (!normalize_json_object(value))
        return undefined
    try { return JSON.stringify(value) } catch { }
    return undefined
}


export function optional_positive_number (value: unknown) {
    const num = Number(value)
    return Number.isFinite(num) && num > 0 ? num : undefined
}


export function get_stored_boolean (key: string, fallback: boolean) {
    const value = localStorage.getItem(key)
    if (value === null)
        return fallback
    return value !== 'false'
}


export function get_enabled (item: any): boolean {
    if (typeof item?.enabled === 'boolean')
        return item.enabled
    if (item?.statusName)
        return item.statusName === 'ACTIVE'
    return true
}


export function get_status_name (item: any): string {
    if (item?.statusName)
        return item.statusName
    return get_enabled(item) ? 'ACTIVE' : 'DISABLED'
}


export function get_status (item: any): number {
    return item?.status ?? (get_enabled(item) ? 1 : 0)
}


export function stable_json_value (value: unknown): unknown {
    if (Array.isArray(value))
        return value.map(stable_json_value)
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        return Object.fromEntries(
            Object.keys(obj)
                .sort()
                .map(key => [key, stable_json_value(obj[key])])
        )
    }
    return value
}


export function stable_json_stringify (value: unknown): string {
    try {
        return JSON.stringify(stable_json_value(value))
    } catch {
        return String(value)
    }
}


export function to_stream_text (value: unknown): string {
    if (typeof value === 'string')
        return value
    if (value === null || value === undefined)
        return ''
    return String(value)
}


export function get_reasoning_text (data: any): string {
    return to_stream_text(data?.reasoning ?? data?.reasoning_content ?? data?.reasoningContent)
}


export function parse_sse_event (raw_event: string): { event: string, data: string } | null {
    const lines = raw_event.split('\n')
    let event = ''
    const data_lines: string[] = [ ]
    
    for (const raw_line of lines) {
        const line = raw_line.trimEnd()
        if (!line || line.startsWith(':'))
            continue
        if (line.startsWith('event:'))
            event = line.slice('event:'.length).trim()
        else if (line.startsWith('data:'))
            data_lines.push(line.slice('data:'.length).trimStart())
    }
    
    if (data_lines.length === 0)
        return null
    
    return { event, data: data_lines.join('\n') }
}


/**
 * 格式化提供商与模型名称为“提供商/模型”，如 openrouter/deepseek-v4-pro
 */
export function format_provider_model (provider?: string, model?: string): string {
    const p = provider?.trim() || ''
    const m = model?.trim() || ''
    if (!p)
        return m
    if (!m)
        return p
    // 若模型名本身已以 provider/ 开头，避免重复前缀
    if (m.toLowerCase().startsWith(`${p.toLowerCase()}/`))
        return m
    return `${p}/${m}`
}


/**
 * 统一格式化模型展示标签为“提供商/模型”，如 openrouter/deepseek-v4-pro
 */
export function format_model_label (item?: {
    providerName?: string
    providerId?: string
    adapterType?: string
    model?: string
    name?: string
    llmConfigId?: string
} | null, fallback_model?: string): string {
    if (!item)
        return fallback_model || ''
    const provider = item.providerName || item.adapterType || ''
    const model = item.model || fallback_model || item.name || item.llmConfigId || ''
    return format_provider_model(provider, model)
}

