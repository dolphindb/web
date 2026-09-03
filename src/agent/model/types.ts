import type { ChatCompletionOptions } from '@/agent/tool_call_adapters.ts'


export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type MessageType = 'system' | 'text' | 'tool_call' | 'tool_result' | 'skill_result' | 'tool_error' | 'agent_error'

export type AgentStatus = 'idle' | 'thinking' | 'tool_running' | 'compacting' | 'error'

export type ScriptExecuteApprovalMode = 'approval' | 'auto'

export type ScriptExecuteApprovalDecision = 'allow' | 'allow_session' | 'deny'


export interface IChatTextContentPart {
    type: 'text'
    text: string
}


export type IChatImageContentPart =
    | { type: 'image_url', image_url: { url: string } }
    | { type: 'image_url', imageUrl: string }
    | { type: 'image_url' | 'image', url: string }


export interface IChatAttachmentContentPart {
    type: 'attachment'
    attachmentId: string
}


export type IChatContentPart = IChatTextContentPart | IChatImageContentPart | IChatAttachmentContentPart


export interface IChatToolResult {
    toolCallId: string
    content?: string
}


export type IChatTurnInput =
    | { message: string, content?: never, toolResults?: IChatToolResult[] }
    | { content: IChatContentPart[], message?: never, toolResults?: IChatToolResult[] }
    | { toolResults: IChatToolResult[], message?: never, content?: never }


export type IChatCompletionRequest = IChatTurnInput & {
    sessionId: string
    stream?: boolean
    contextEvent?: boolean
    includeReasoning?: boolean
    tools?: unknown[]
    activeSkillNames?: string[]
    llmConfigId?: string
    model?: string
    temperature?: number
    maxTokens?: number
    max_tokens?: number
    max_completion_tokens?: number
    topP?: number
    top_p?: number
    stop?: string | string[]
    extensions?: Record<string, unknown>
    assemblyConfig?: Record<string, unknown>
}


export type IContextPreviewRequest = IChatTurnInput & {
    sessionId: string
    tools?: unknown[]
    activeSkillNames?: string[]
    llmConfigId?: string
    assemblyConfig?: Record<string, unknown>
    maxTokens?: number
    max_tokens?: number
    max_completion_tokens?: number
}


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
    attachments?: IMessageAttachment[]
}


export interface IMessageAttachment {
    attachmentId: string
    filename?: string
    mimeType?: string
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


export type SessionAttachmentKind = 'image' | 'pdf' | 'document' | 'presentation' | 'spreadsheet' | 'text'

export type SessionAttachmentUploadStatus = 'UPLOADING' | 'COMMITTED' | 'DELETING' | 'DELETED'

export type SessionAttachmentParseStatus = 'NOT_STARTED' | 'PARSING' | 'PARSED' | 'PARSE_FAILED' | 'NOT_APPLICABLE'

export type SessionAttachmentIndexStatus = 'NOT_STARTED' | 'INDEXING' | 'READY' | 'INDEX_FAILED' | 'NOT_APPLICABLE'


export interface ISessionAttachment {
    attachmentId: string
    sessionId: string
    agentId: string
    userId: string
    assetId: string
    documentId: string
    filename: string
    mimeType: string
    kind: SessionAttachmentKind
    byteSize: number
    sha256: string
    uploadStatus: SessionAttachmentUploadStatus
    parseStatus: SessionAttachmentParseStatus
    indexStatus: SessionAttachmentIndexStatus
    parseError: string
    indexError: string
    indexJobId: string
    schemaVersion: number
    extra: string
    createTime: string
    updateTime: string
}


export interface ISessionAttachmentUpload {
    filename: string
    file: Blob
    mimeType?: string
    extra?: string
}


export interface ISessionAttachmentUploadInit {
    filename: string
    mimeType: string
    byteSize: number
    sha256: string
    extra?: string
}


export interface ISessionAttachmentUploadInfo extends ISessionAttachment {
    partSize: number
    partCount: number
    uploadedPartCount: number
}


export interface ISessionAttachmentListResult {
    sessionId: string
    items: ISessionAttachment[]
    offset: number
    limit: number
    size: number
    total?: number
}


export interface ISessionAttachmentDeleteResult {
    attachmentId: string
    deleted: boolean
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
    supportsImage?: boolean
    maxImageBytes?: number
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


export interface ILlmConfigInput {
    name: string
    providerId: string
    model: string
    capability?: 'chat' | 'embedding'
    embeddingDimension?: number
    embeddingMetric?: 'euclidean' | 'cosine'
    embeddingNormalize?: boolean
    requestPath: string
    defaultParams?: Record<string, unknown> | null
    contextWindow?: number | null
    maxConcurrency?: number | null
    rateLimitRPM?: number | null
    timeoutMs?: number | null
    retryConfig?: Record<string, unknown> | null
    customData?: string
    enabled?: boolean
    extra?: string
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


export type AgentAuthSubjectType = 'USER' | 'GROUP'


export interface IAccessInfo {
    userId?: string
    groupId?: string
    subjectType?: AgentAuthSubjectType
    subjectId?: string
    permission?: string
    grantedBy?: string
    createTime?: string
    updateTime?: string
}


export interface IUserLlmAccessInfo {
    userId?: string
    groupId?: string
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
    scopeType?: 'user_personal'
    memoryKind: 'preference' | 'fact' | 'procedure' | 'failure_shield' | 'default'
    title?: string
    content: string
    shortSummary?: string
    keywords?: string
    tags?: string
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
    expireTime?: string | number | null
    createTime?: string
    updateTime?: string
    schemaVersion?: number
    rankScore?: number
    textScore?: number
    vectorScore?: number
}

export interface IPublicMemory {
    agentId: string
    content: string
    estimatedTokens: number
    tokenLimit: number
    schemaVersion?: number
    updateTime?: string
    updateTimeMs?: number
    updatedBy?: string
}

export interface IMemoryPersonalSettings {
    agentId: string
    userId?: string
    personalMemoryEnabled: boolean
}


export interface IMemoryStats {
    totalCount: number
    agentPublicCount?: number
    userPersonalCount: number
    activeCount?: number
    deletedCount?: number
    avgImportance: number
    scopeDistribution?: Record<string, number>
    statusDistribution?: Record<string, number>
    memoryKindDistribution?: Record<string, number>
    sourceDistribution?: Record<string, number>
    jobKindDistribution?: Record<string, number>
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
    targetUserId?: string
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

export interface IMemoryTriggerResult {
    agentId?: string
    sessionId?: string
    targetUserId?: string
    scheduled: boolean
}


export interface ISkillFileInfo {
    skillId: string
    contentRevision?: number
    filePath: string
    size?: number
    isText?: boolean
    lineCount?: number
}


export interface ISkillInstruction {
    skillId: string
    name: string
    description?: string
    instruction: string
    content?: string
}


export interface ISkillFileContent {
    skillId: string
    filePath: string
    encoding?: string
    content: string
    size?: number
}


export interface ILlmModelUsage {
    llmConfigId?: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    requestCount?: number
}


export interface ILlmUsageStats {
    agentId: string
    userId?: string
    startTime?: string | number
    endTime?: string | number
    totalPromptTokens?: number
    totalCompletionTokens?: number
    totalTokens?: number
    requestCount?: number
    tokensByModel?: Record<string, number>
    models?: ILlmModelUsage[]
}


export interface ILlmBudgetConfig {
    enabled?: boolean
    maxTokens?: number
    models?: Record<string, number | { maxTokens?: number }>
}


export interface ILlmBudgetStatus {
    agentId: string
    userId?: string
    budget?: ILlmBudgetConfig
    usage?: ILlmUsageStats
    remainingTokens?: number
    remainingTokensByModel?: Record<string, number>
}


export interface IBuiltinInitSummary {
    createdAgents?: number
    updatedAgents?: number
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
    appliedManifestVersion?: string
    availableManifestVersion?: string
    upgradeAvailable?: boolean
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


export type McpServerType = 'dolphindb' | 'third_party'

export type McpCredentialMode = 'dolphindb_current_user' | 'shared_token' | 'none'

export interface IMcpEndpoint {
    url: string
}

export interface IMcpSharedAuthConfig {
    type?: string
    token?: string
}

export interface IMcpServerInfo {
    mcpServerId: string
    name: string
    serverType: McpServerType
    endpoint: IMcpEndpoint
    credentialMode: McpCredentialMode
    sharedAuthConfig?: IMcpSharedAuthConfig
    enabled: boolean
    ownerUserId?: string
    schemaVersion?: number
    createTime?: string
    updateTime?: string
}

export interface IMcpBindingInfo {
    agentId: string
    mcpServerId: string
    enabled: boolean
    toolNamePrefix?: string
    createTime?: string
    updateTime?: string
    server?: IMcpServerInfo
}

export interface IMcpServerListResult {
    items: IMcpServerInfo[]
    offset: number
    limit: number
    size: number
    total?: number
}

export interface IMcpServerUpsertPayload {
    name?: string
    serverType?: McpServerType
    endpoint?: IMcpEndpoint
    credentialMode?: McpCredentialMode
    sharedAuthConfig?: IMcpSharedAuthConfig
    enabled?: boolean
}

export interface IMcpServerTestPayload extends IMcpServerUpsertPayload {
    mcpServerId?: string
}

export interface IMcpServerTestResult {
    ok: boolean
    mcpServerId?: string
    message?: string
    error?: string
    toolCount: number
    toolNames: string[]
    toolNamesTruncated?: boolean
    truncated?: boolean
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


export interface IKnowledgeBaseEmbeddingRef {
    source: 'builtin' | 'llmConfig'
    llmConfigId?: string
    resolvedModel?: string
    dimension?: number
    metric?: string
    normalize?: boolean
}

export interface IKnowledgeBaseChunkingConfig {
    maxChunkChars: number
    overlapChars: number
    includeHeading?: boolean
}

export interface IKnowledgeBaseTextIndexConfig {
    parser: 'mixed' | 'chinese' | 'english'
    full?: boolean
    lowercase?: boolean
    stem?: boolean
}

export interface IKnowledgeBaseVectorIndexConfig {
    indexType: 'flat' | 'hnsw'
}

export interface IKnowledgeBaseConfig {
    embeddingRef: IKnowledgeBaseEmbeddingRef
    chunking: IKnowledgeBaseChunkingConfig
    textIndex: IKnowledgeBaseTextIndexConfig
    vectorIndex: IKnowledgeBaseVectorIndexConfig
}

export interface IKnowledgeRetrievalConfig {
    topK: number
    candidateCount: number
    rerankEnabled: boolean
    rerankProviderConfigId?: string
}

export type KnowledgeBaseStatus = 'INITIALIZING' | 'ACTIVE' | 'ERROR' | 'DELETING' | 'DELETED'

export interface IKnowledgeBaseInfo {
    knowledgeBaseId: string
    name: string
    description?: string
    status: KnowledgeBaseStatus
    activeGenerationId?: string
    retrievalConfig?: IKnowledgeRetrievalConfig
    createUserId?: string
    createTime?: string
    updateTime?: string
}

export interface IKnowledgeBaseRegisterPayload {
    name: string
    description: string
    config: IKnowledgeBaseConfig
    retrievalConfig?: IKnowledgeRetrievalConfig
}

export interface IKnowledgeBaseUpdatePayload {
    name?: string
    description?: string
    retrievalConfig?: IKnowledgeRetrievalConfig
}

export interface IKnowledgeBaseListResult {
    items: IKnowledgeBaseInfo[]
}

export interface IKnowledgeBaseAgentBinding {
    agentId: string
    createUserId?: string
    createTime?: string
}

export interface IKnowledgeBaseAgentBindingListResult {
    items: IKnowledgeBaseAgentBinding[]
}

export interface IKnowledgeGenerationInfo {
    generationId: string
    config: IKnowledgeBaseConfig & {
        profileSchemaVersion?: number
        parserSchemaVersion?: string
        normalizationVersion?: string
    }
    profileHash?: string
    triggerType: 'INITIAL_BUILD' | 'CONFIG_CHANGE' | 'MANUAL_REBUILD'
    status: 'PENDING' | 'BUILDING' | 'READY' | 'ACTIVE' | 'FAILED' | 'RETIRED' | 'DELETING' | 'DELETED'
    buildJobId?: string
    documentCount?: number
    chunkCount?: number
    failedDocumentCount?: number
    validation?: Record<string, unknown>
    lastError?: string
    createTime?: string
    readyTime?: string
    activateTime?: string
    updateTime?: string
}

export interface IKnowledgeGenerationListResult {
    items: IKnowledgeGenerationInfo[]
}

export interface IKnowledgeDocumentInfo {
    documentId: string
    knowledgeBaseId?: string
    fileName: string
    contentType: string
    byteSize: number
    sha256?: string
    importJobId?: string
    sourceRelativePath?: string
    status: 'ACTIVE' | 'DELETING' | 'DELETED' | string
    parseStatus: 'OK' | 'PARTIAL' | 'FAILED' | 'PARSING' | string
    parserVersion?: string
    parserSchemaVersion?: string
    lastError?: string
    createTime?: string
    updateTime?: string
    deleteTime?: string | null
}

export interface IKnowledgeDocumentListResult {
    items: IKnowledgeDocumentInfo[]
}

export interface IKnowledgeUploadInitPayload {
    uploadMode: 'DOCUMENT' | 'ZIP_IMPORT'
    fileName: string
    contentType: string
    byteSize: number
    sha256: string
}

export interface IKnowledgeUploadInfo {
    uploadId: string
    knowledgeBaseId: string
    uploadMode: 'DOCUMENT' | 'ZIP_IMPORT'
    fileName: string
    contentType: string
    byteSize: number
    sha256: string
    partSize: number
    partCount: number
    uploadedPartCount: number
    status: 'UPLOADING' | 'VERIFYING' | 'COMMITTED' | 'ABORTED' | 'DELETING' | 'DELETED' | 'ERROR'
    expireTime?: string
    lastError?: string
    limits?: {
        maxArchiveBytes?: number
        maxEntries?: number
        maxExpandedBytes?: number
        maxEntryBytes?: number
        maxCompressionRatio?: number
        maxCentralDirectoryBytes?: number
        maxEntryPathBytes?: number
        maxExtractionTimeMs?: number
    }
}

export type KnowledgeJobType = 'INDEX_BUILD' | 'DOCUMENT_IMPORT' | 'ZIP_IMPORT' | 'DOCUMENT_DELETE' | 'KNOWLEDGE_BASE_DELETE' | 'INDEX_CLEANUP'
export type KnowledgeJobStatus = 'PENDING' | 'RUNNING' | 'RETRY_WAIT' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'SUCCEEDED' | 'FAILED'

export interface IKnowledgeJobFailureItem {
    entryOrdinal?: number
    path?: string
    errorCode?: string
    message?: string
}

export interface IKnowledgeJobProgress {
    entryCount?: number
    importedCount?: number
    skippedCount?: number
    failedCount?: number
    pendingCount?: number
    currentEntryPath?: string
    failureSummary?: IKnowledgeJobFailureItem[]
    successCount?: number
    totalCount?: number
    [key: string]: unknown
}

export interface IKnowledgeJobInfo {
    jobId: string
    jobType: KnowledgeJobType
    knowledgeBaseId?: string
    knowledgeBaseName?: string
    generationId?: string
    documentId?: string
    documentFileName?: string
    uploadId?: string
    status: KnowledgeJobStatus
    stage?: string
    attempt?: number
    maxAttempts?: number
    retryAt?: string | null
    lastError?: string
    progress?: IKnowledgeJobProgress
    allowedActions?: ('CANCEL' | 'RETRY')[]
    createTime?: string
    startTime?: string
    finishTime?: string | null
    updateTime?: string
}

export interface IKnowledgeJobListResult {
    items: IKnowledgeJobInfo[]
}

export interface IKnowledgeRerankConfig {
    enabled: boolean
    providerConfigId?: string
    providerConfigName?: string
    providerName?: string
    model?: string
    candidateCount: number
    updateTime?: string
}

export interface IKnowledgeRerankConfigInput {
    enabled: boolean
    providerConfigId?: string
    candidateCount?: number
}

export interface IKnowledgeAvailableItem {
    knowledgeBaseId: string
    name: string
    description?: string
}

export interface IKnowledgeChunkSource {
    documentId?: string
    fileName?: string
    pageNo?: number | null
}

export interface IKnowledgeChunkItem {
    chunkId: string
    content: string
    source: IKnowledgeChunkSource
}

export interface IKnowledgeRetrieveResult {
    retrievalId?: string
    resultStatus: 'OK' | 'NO_RELEVANT_EVIDENCE' | string
    items: IKnowledgeChunkItem[]
    diagnostics?: IKnowledgeRetrievalDiagnostic
}

export interface IKnowledgeReadResult {
    item?: IKnowledgeChunkItem | null
    before: IKnowledgeChunkItem[]
    after: IKnowledgeChunkItem[]
}

export interface IKnowledgeRetrievalDiagnostic {
    retrievalId?: string
    knowledgeBaseId?: string
    generationId?: string
    agentId?: string
    userId?: string
    queryHash?: string
    queryBytes?: number
    topK?: number
    candidateCount?: number
    textCandidateCount?: number
    vectorCandidateCount?: number
    fusedCandidateCount?: number
    textApplied?: boolean
    vectorApplied?: boolean
    rerankConfigured?: boolean
    rerankApplied?: boolean
    degradationReason?: string
    resultStatus?: string
    rerankLatencyMs?: number
    totalLatencyMs?: number
    rerankJudgments?: unknown[]
    returnedChunkIds?: string[]
    diagnostics?: Record<string, unknown>
    createTime?: string
    finishTime?: string
}

