import type { ToolContext } from './types.ts'


export interface NetworkFetchResponse {
    url: string
    method: string
    statusCode: number
    statusText: string
    headers: Record<string, string>
    contentType: string
    contentEncoding: string
    body: string
    truncated: boolean
    bodyOmitted: boolean
    bodyUtf8Sanitized: boolean
    latencyMs: number
}


export interface NetworkFetchRequest {
    method: 'GET' | 'POST'
    url: string
    headers?: Record<string, string>
    body?: string
    timeoutMs?: number
    maxBodyBytes?: number
}


export async function network_fetch (context: ToolContext, request: NetworkFetchRequest): Promise<NetworkFetchResponse> {
    return context.api_fetch('/network/fetch', {
        method: 'POST',
        body: JSON.stringify({ agentId: context.agent_id, ...request }),
    })
}
