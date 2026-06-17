import type { ChatCompletionOptions } from '@/agent/tool_call_adapters.ts'


export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type MessageType = 'system' | 'text' | 'tool_call' | 'tool_result' | 'skill_result' | 'tool_error' | 'agent_error'

export type AgentStatus = 'idle' | 'thinking' | 'tool_running' | 'compacting' | 'error'

export type ScriptExecuteApprovalMode = 'approval' | 'auto'

export type ScriptExecuteApprovalDecision = 'allow' | 'allow_session' | 'deny'


export interface IScriptExecutionApproval {
    id: string
    sessionId: string
    messageId: string
    toolName: string
    script: string
}


export interface IMessage {
    msgId: string
    role: string
    messageType?: string
    content: string
    reasoning_content?: string
    content_object?: unknown
    /** 轻量标记：该消息关联了可展示的 DdbObj 结果 */
    _has_ddb_result?: boolean
    name?: string
    tool_call_id?: string
    tool_calls?: IToolCall[]
}


export interface IToolCall {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}


export interface ISession {
    sessionId: string
    agentId: string
    title: string
    llmConfigId?: string
    workspaceSize?: number
    workspaceFileCount?: number
    createTime?: string
    updateTime?: string
}


export interface IAgentStatusEvent {
    status: AgentStatus
    message?: string
    timestamp?: number
}


export interface IToolLoopControl {
    id: string
    sessionId: string
    requestSeq: number
    toolTurn: number
    message: string
    options?: ChatCompletionOptions
}


/** LLM Provider（共享连接信息：adapterType + baseUrl + apiKey） */
export interface ILlmProvider {
    providerId: string
    name: string
    adapterType: string
    baseUrl: string
    apiKey?: string
    extra?: string
    enabled: boolean
    status: number
    statusName: string
}


/** LLM 配置（模型级）：通过 providerId 引用 provider */
export interface ILlmConfig {
    llmConfigId: string
    name: string
    providerId: string
    /** 便捷字段：由前端合并 provider 信息后填充，用于展示 */
    providerName?: string
    /** 便捷字段：由前端合并 provider 信息后填充，用于展示 */
    adapterType?: string
    model: string
    capability?: 'chat' | 'embedding'
    embeddingDimension?: number
    embeddingMetric?: 'euclidean' | 'cosine'
    embeddingNormalize?: boolean
    requestPath: string
    defaultParams?: Record<string, unknown>
    contextWindow?: number | null
    maxConcurrency?: number | null
    rateLimitRPM?: number | null
    timeoutMs?: number | null
    retryConfig?: Record<string, unknown> | null
    customData?: string
    custom?: Record<string, unknown>
    extra?: string
    enabled: boolean
    status: number
    statusName: string
}


/** Agent-LLM 绑定信息，继承 LlmConfigInfo 并包含绑定级别字段 */
export interface IAgentLlmBinding extends ILlmConfig {
    isDefault: boolean
    priority: number
    accessExtra?: string
}


/** 当前用户在指定 Agent 下可选择的 LLM */
export interface ISelectableLlmInfo extends ILlmConfig {
    source: 'agent' | 'user' | 'both'
    isAgentDefault: boolean
    participatesInFallback: boolean
    fallbackPriority: number | null
}


export interface ISkillInfo {
    skillId: string
    name: string
    description?: string
    status: number
    statusName: string
    category?: string
    displayName?: string
    version?: string
    enabled: boolean
    license?: string
    compatibility?: string
    argumentHint?: string
    disableModelInvocation?: boolean
    userInvocable?: boolean
    hasInstruction?: boolean
    contentRevision?: number
    contentHash?: string
    isCommon?: boolean
    ownerUserId?: string
    metadata?: Record<string, unknown>
    schemaVersion?: number
    extra?: string
    createTime?: string
    updateTime?: string
}


export interface ISkillBinding {
    skillId: string
    agentId: string
    enabled: boolean
    available?: boolean
    source?: string
    subjectType?: string
    subjectId?: string
    descOverride?: string
    createTime?: string
    updateTime?: string
    skill?: ISkillInfo
}


export interface IAgentInfo {
    agentId: string
    agentName: string
    ownerUserId?: string
    description?: string
    systemPrompt?: string
    llmConfigId?: string
    config?: Record<string, any>
    status: number
    statusName: string
    createTime?: string
    updateTime?: string
}


export interface IAccessInfo {
    userId: string
    subjectId?: string
    permission?: string
    grantedBy?: string
    createTime?: string
    updateTime?: string
}


export interface IUserLlmAccessInfo {
    userId: string
    llmConfigId: string
    grantedBy?: string
    createTime?: string
    updateTime?: string
    llmConfig?: ILlmConfig
}


export interface IMemoryEntry {
    memoryId: string
    agentId: string
    userId?: string
    scopeType?: 'agent_public' | 'user_personal'
    category: string
    memoryType?: string
    canonicalKey?: string
    title?: string
    content: string
    shortSummary?: string
    keywords?: string
    importance: number
    confidence?: number
    status?: string
    accessCount?: number
    lastAccessTime?: string
    usageCount?: number
    lastUsageTime?: string
    metadata?: Record<string, unknown>
    source?: string
    sourceRefs?: string
    expireTime?: number
    createTime?: string
    updateTime?: string
    schemaVersion?: number
    rankScore?: number
}

export interface IMemoryPersonalSettings {
    agentId: string
    userId?: string
    personalMemoryEnabled: boolean
}


export interface IMemoryStats {
    totalCount: number
    agentPublicCount: number
    userPersonalCount: number
    activeCount?: number
    deletedCount?: number
    avgImportance: number
    scopeDistribution?: Record<string, number>
    statusDistribution?: Record<string, number>
    categoryDistribution?: Record<string, number>
    typeDistribution?: Record<string, number>
    sourceDistribution?: Record<string, number>
    jobStatusDistribution?: Record<string, number>
}

export interface IMemoryConfigResult {
    agentId: string
    memoryConfig: Record<string, unknown>
}

export interface IMemoryJob {
    jobShardKey?: string
    kind: string
    jobKey: string
    scopeShardKey?: string
    scopeKey?: string
    status?: string
    workerId?: string
    startedTime?: string
    finishedTime?: string
    retryAt?: string
    retryRemaining?: number
    lastError?: string
    inputWatermark?: string
    lastSuccessWatermark?: string
    extra?: string
}

export interface IMemoryResetResult {
    agentId: string
    targetUserId: string
    includeMemories: boolean
    includeStage1: boolean
    ignoredStage1Count?: number
    removedMemoryCount?: number
    reset: boolean
}


export interface ISkillFileInfo {
    skillId: string
    contentRevision?: number
    filePath: string
    size?: number
    isText?: boolean
    lineCount?: number
}


export interface ISkillFileContent {
    skillId: string
    filePath: string
    encoding?: string
    content: string
    size?: number
}


export interface ILlmUsageStats {
    agentId: string
    userId?: string
    startTime?: number
    endTime?: number
    totalPromptTokens?: number
    totalCompletionTokens?: number
    totalTokens?: number
    requestCount?: number
}


export interface IBuiltinInitSummary {
    createdAgents?: number
    createdSkills?: number
    updatedSkills?: number
    createdBindings?: number
    skippedExisting?: number
    skippedUnchanged?: number
    skippedUserModified?: number
    failed?: number
}


export interface IBuiltinInitItem {
    resourceType?: string
    resourceKey?: string
    resourceId?: string
    action?: string
    status?: string
    errorCode?: string
    message?: string
}


export interface IBuiltinStateRecord {
    manifestId?: string
    targetType?: string
    targetKey?: string
    payloadSchemaVersion?: number
    payload?: Record<string, unknown>
    createTime?: string
    updateTime?: string
}


export interface IBuiltinInitResult {
    initialized?: boolean
    state?: string
    runId?: string
    manifestId?: string
    manifestVersion?: string
    manifestHash?: string
    lastRunId?: string
    lastRunTime?: string
    dryRun?: boolean
    summary?: IBuiltinInitSummary
    items?: IBuiltinInitItem[]
    lastFailures?: IBuiltinInitItem[]
    states?: IBuiltinStateRecord[]
    errorCode?: string
    message?: string
}


export interface ChatCompletionStreamResult {
    content: string
    reasoning_content: string
    tool_calls?: any[]
    final_data?: any
}


export interface ToolExecutionResult {
    tool_result_content: string
    next_loop: boolean
    stopped?: boolean
}
