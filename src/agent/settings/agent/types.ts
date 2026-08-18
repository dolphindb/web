import type { IAgentInfo, ILlmConfig, IMcpServerInfo } from '@/agent/model.ts'


export const DEFAULT_AGENT_FORM = {
    agentName: '',
    description: '',
    systemPrompt: '',
    allowLlmFallback: false,
    docSearchEnabled: true,
}


export type AgentFormData = typeof DEFAULT_AGENT_FORM


export function get_llm_config_display_name (llm: ILlmConfig) {
    const provider_name = llm.providerName || llm.providerId || llm.adapterType || '-'
    return `${provider_name} / ${llm.name}`
}


export function get_mcp_server_display_name (server: IMcpServerInfo | undefined, fallback_id: string) {
    return server?.name || fallback_id || '-'
}


export function agent_create_time (agent: IAgentInfo) {
    return Date.parse(agent.createTime || '') || 0
}
