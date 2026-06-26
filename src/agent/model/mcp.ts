import type { ChatModel } from '@/agent/model.ts'

import type {
    IMcpBindingInfo,
    IMcpEndpoint,
    IMcpServerInfo,
    IMcpServerListResult,
    IMcpServerTestPayload,
    IMcpServerTestResult,
    IMcpServerUpsertPayload,
    IMcpSharedAuthConfig,
    McpCredentialMode,
    McpServerType
} from './types.ts'
import { get_enabled } from './helpers.ts'

interface IMcpServerListParams {
    enabled?: boolean
    offset?: number
    limit?: number
}

function is_record (value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


function to_string (value: unknown, fallback = ''): string {
    if (typeof value === 'string')
        return value
    if (value === null || value === undefined)
        return fallback
    return String(value)
}


function normalize_server_type (value: unknown): McpServerType {
    const text = to_string(value).toLowerCase()
    if (text === 'third_party' || text === 'thirdparty')
        return 'third_party'
    return 'dolphindb'
}


function normalize_credential_mode (value: unknown): McpCredentialMode {
    const text = to_string(value).toLowerCase()
    if (text === 'shared_token')
        return 'shared_token'
    if (text === 'none')
        return 'none'
    return 'dolphindb_current_user'
}


function map_endpoint (value: unknown): IMcpEndpoint {
    if (typeof value === 'string')
        return { url: value }
    const obj = is_record(value) ? value : { }
    return {
        url: to_string(obj.url).trim()
    }
}


function map_shared_auth_config (value: unknown): IMcpSharedAuthConfig | undefined {
    if (!is_record(value))
        return undefined
    return {
        type: to_string(value.type).trim() || undefined,
        token: to_string(value.token).trim() || undefined
    }
}


export class ChatMcpModel {
    constructor (private chat: ChatModel) { }
    
    
    _map_server (item: any): IMcpServerInfo {
        return {
            mcpServerId: to_string(item?.mcpServerId ?? item?.mcp_server_id ?? item?.id),
            name: to_string(item?.name ?? item?.mcpServerId ?? item?.id),
            serverType: normalize_server_type(item?.serverType ?? item?.server_type),
            endpoint: map_endpoint(item?.endpoint),
            credentialMode: normalize_credential_mode(item?.credentialMode ?? item?.credential_mode),
            sharedAuthConfig: map_shared_auth_config(item?.sharedAuthConfig ?? item?.shared_auth_config),
            enabled: get_enabled(item),
            ownerUserId: item?.ownerUserId,
            schemaVersion: item?.schemaVersion,
            createTime: item?.createTime,
            updateTime: item?.updateTime
        }
    }
    
    
    _map_binding (item: any): IMcpBindingInfo {
        return {
            agentId: to_string(item?.agentId ?? item?.agent_id),
            mcpServerId: to_string(item?.mcpServerId ?? item?.mcp_server_id),
            enabled: get_enabled(item),
            toolNamePrefix: item?.toolNamePrefix,
            createTime: item?.createTime,
            updateTime: item?.updateTime,
            server: item?.server ? this.chat.mcp._map_server(item.server) : undefined
        }
    }
    
    
    _map_test_result (item: any): IMcpServerTestResult {
        const tool_names = Array.isArray(item?.toolNames)
            ? item.toolNames.map((name: unknown) => to_string(name)).filter(Boolean)
            : [ ]
        return {
            ok: item?.ok === true,
            mcpServerId: to_string(item?.mcpServerId),
            message: to_string(item?.message) || undefined,
            error: to_string(item?.error) || undefined,
            toolCount: Number(item?.toolCount ?? tool_names.length) || 0,
            toolNames: tool_names,
            toolNamesTruncated: item?.toolNamesTruncated === true,
            truncated: item?.truncated === true
        }
    }
    
    
    async load_mcp_server_page (params: IMcpServerListParams = { }): Promise<IMcpServerListResult> {
        const search = new URLSearchParams()
        for (const [key, value] of Object.entries(params))
            if (value !== undefined)
                search.set(key, String(value))
        const query = search.toString()
        const result = await this.chat.agent.api_fetch(`/mcp/server/list${query ? `?${query}` : ''}`)
        return {
            items: (result.items || [ ]).map((item: any) => this.chat.mcp._map_server(item)),
            offset: result.offset ?? params.offset ?? 0,
            limit: result.limit ?? params.limit ?? 50,
            size: result.size ?? 0
        }
    }
    
    
    async load_mcp_servers (): Promise<IMcpServerInfo[]> {
        const items: IMcpServerInfo[] = [ ]
        const limit = 100
        for (let offset = 0;  ;  offset += limit) {
            const result = await this.chat.mcp.load_mcp_server_page({ offset, limit })
            items.push(...result.items)
            if (result.items.length < limit)
                break
        }
        return items
    }
    
    
    async get_mcp_server (mcp_server_id: string): Promise<IMcpServerInfo> {
        return this.chat.mcp._map_server(
            await this.chat.agent.api_fetch(`/mcp/server/${encodeURIComponent(mcp_server_id)}`)
        )
    }
    
    
    async register_mcp_server (server: IMcpServerUpsertPayload): Promise<IMcpServerInfo> {
        return this.chat.mcp._map_server(
            await this.chat.agent.api_fetch('/mcp/server/register', {
                method: 'POST',
                body: JSON.stringify(server)
            })
        )
    }
    
    
    async update_mcp_server (
        mcp_server_id: string,
        updates: IMcpServerUpsertPayload
    ): Promise<IMcpServerInfo> {
        return this.chat.mcp._map_server(
            await this.chat.agent.api_fetch(`/mcp/server/${encodeURIComponent(mcp_server_id)}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })
        )
    }
    
    
    async delete_mcp_server (mcp_server_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/mcp/server/${encodeURIComponent(mcp_server_id)}/delete`, {
            method: 'POST'
        })
    }
    
    
    async test_mcp_server (payload: IMcpServerTestPayload): Promise<IMcpServerTestResult> {
        return this.chat.mcp._map_test_result(
            await this.chat.agent.api_fetch('/mcp/server/test', {
                method: 'POST',
                body: JSON.stringify(payload)
            })
        )
    }
    
    
    async load_agent_mcp_bindings (agent_id = this.chat.agent_id): Promise<IMcpBindingInfo[]> {
        if (!agent_id)
            return [ ]
        const result = await this.chat.agent.api_fetch(`/agent/${encodeURIComponent(agent_id)}/mcp/list`)
        const items = Array.isArray(result) ? result : result.items || [ ]
        return items.map((item: any) => this.chat.mcp._map_binding(item))
    }
    
    
    async bind_mcp_server (
        agent_id: string,
        binding: {
            mcpServerId: string
            enabled?: boolean
            toolNamePrefix?: string
        }
    ): Promise<IMcpBindingInfo> {
        return this.chat.mcp._map_binding(
            await this.chat.agent.api_fetch(`/agent/${encodeURIComponent(agent_id)}/mcp/bind`, {
                method: 'POST',
                body: JSON.stringify(binding)
            })
        )
    }
    
    
    async unbind_mcp_server (agent_id: string, mcp_server_id: string): Promise<void> {
        await this.chat.agent.api_fetch(
            `/agent/${encodeURIComponent(agent_id)}/mcp/bind?mcpServerId=${encodeURIComponent(mcp_server_id)}`,
            {
                method: 'DELETE'
            }
        )
    }
}
