import { t } from '@i18n'
import type {
    IMcpServerInfo,
    IMcpServerTestPayload,
    IMcpServerTestResult,
    IMcpServerUpsertPayload,
    McpCredentialMode,
    McpServerType,
} from '@/agent/model/types.ts'


export interface ServerFormState {
    name: string
    serverType: McpServerType
    url: string
    credentialMode: McpCredentialMode
    token: string
}


export const empty_server_form: ServerFormState = {
    name: '',
    serverType: 'dolphindb',
    url: '',
    credentialMode: 'dolphindb_current_user',
    token: '',
}


export function validate_server_form (form_values: ServerFormState, editing_server: IMcpServerInfo | null): string {
    if (!form_values.name.trim())
        return t('请输入 MCP Server 名称')
    
    const credential_mode = form_values.serverType === 'dolphindb'
        ? 'dolphindb_current_user'
        : form_values.credentialMode
    if (credential_mode === 'shared_token') {
        const changing_to_shared_token = !editing_server || editing_server.credentialMode !== 'shared_token'
        if (changing_to_shared_token && !form_values.token.trim())
            return t('固定 Token 认证方式需要填写 Token')
    }
    return ''
}


export function build_server_payload (form_values: ServerFormState, editing_server: IMcpServerInfo | null): IMcpServerUpsertPayload {
    const endpoint = {
        url: form_values.url.trim(),
    }
    const credential_mode: McpCredentialMode = form_values.serverType === 'dolphindb'
        ? 'dolphindb_current_user'
        : form_values.credentialMode
    const payload: IMcpServerUpsertPayload = {
        name: form_values.name.trim(),
        endpoint,
    }
    if (!editing_server)
        payload.serverType = form_values.serverType
    if (form_values.serverType !== 'dolphindb') {
        const credential_changed = !editing_server || editing_server.credentialMode !== credential_mode
        if (!editing_server || credential_changed || credential_mode !== 'shared_token' || form_values.token.trim())
            payload.credentialMode = credential_mode
        if (credential_mode === 'shared_token' && form_values.token.trim())
            payload.sharedAuthConfig = { type: 'bearer', token: form_values.token.trim() }
    }
    return payload
}


export function build_test_payload (form_values: ServerFormState, editing_server: IMcpServerInfo | null): IMcpServerTestPayload {
    return {
        ...(editing_server ? { mcpServerId: editing_server.mcpServerId } : { }),
        ...build_server_payload(form_values, editing_server),
    }
}


export function test_result_text (result: IMcpServerTestResult, has_mcp_exec: boolean): string {
    if (result.ok) {
        if (result.toolCount === 0 && !has_mcp_exec)
            return t('连接成功，但缺少 MCP_EXEC 权限查看工具列表')
        
        return t('连接成功，发现 {{count}} 个工具: {{names}}', { count: result.toolCount, names: result.toolNames.join(', ') })
    }
    return result.message || result.error || t('连接失败')
}
