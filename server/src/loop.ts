import * as crypto from 'crypto'
import fetch, { type HeadersInit } from 'node-fetch'
import { ddbConnectionPool } from './lib/ddb-connection-pool.js'
import type { BackgroundAgent } from './BackgroundAgent.js'
import { getMessages, getStepsByChatId } from './db.js'
import type { ChatTask, IMessage } from './types.js'

export type LlmRole = 'system' | 'user' | 'assistant'

export type LlmMessage = {
  role: LlmRole
  content: string
}

type ProviderConfig = {
  baseUrl: string
  apiKey: string
  headers: Record<string, string>
  isEnabled: boolean
}

type ModelConfig = {
  modelId: string
  modelCode: string
  temperature: number | null
  topP: number | null
  maxTokens: number | null
  extraConfig: Record<string, unknown>
  supportTool: boolean
  isEnabled: boolean
}

export type RuntimeConfig = {
  provider: ProviderConfig
  model: ModelConfig
}

export type RuntimeConfigResult = {
  config: RuntimeConfig | null
  error?: string
}

type CompletionMessage = {
  content?: unknown
  reasoning_content?: unknown
  reasoning?: unknown
  reasoningContent?: unknown
  tool_calls?: unknown
  function_call?: unknown
}

type CompletionResult = {
  message: CompletionMessage
  content: string
  reasoningContent: string
}

type LlmChunkUpdate = {
  content: string
  reasoningContent: string
  deltaContent: string
  deltaReasoningContent: string
}

type CallLlmOptions = {
  onChunk?: (chunk: LlmChunkUpdate) => Promise<void> | void
}

type ParsedToolCall = {
  type: string
  payload: unknown
}

type DdbTableResult = {
  data?: Array<Record<string, unknown>>
}

const DB_PATH = 'dfs://chat_dolphindb'
const PROVIDERS_TABLE = 'ai_providers'
const MODELS_TABLE = 'ai_models'

const toDosStringLiteral = (value: string): string => {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`
}

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8')
  }

  if (value && typeof value === 'object') {
    const maybeBufferLike = value as { type?: unknown; data?: unknown }
    if (
      maybeBufferLike.type === 'Buffer' &&
      Array.isArray(maybeBufferLike.data) &&
      maybeBufferLike.data.every((item) => Number.isInteger(item))
    ) {
      return Buffer.from(maybeBufferLike.data as number[]).toString('utf8')
    }

    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return value == null ? '' : String(value)
}

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1'
  }
  return false
}

const toFiniteNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const extractRows = (result: unknown): Array<Record<string, unknown>> => {
  if (!result) {
    return []
  }

  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>
  }

  if (typeof result === 'object' && Array.isArray((result as DdbTableResult).data)) {
    return (result as DdbTableResult).data ?? []
  }

  return []
}

const parseObjectJson = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

const parseHeaders = (raw: string): Record<string, string> => {
  const text = raw.trim()
  if (!text) {
    return {}
  }

  const parsed = parseObjectJson(text)
  if (!parsed) {
    return {}
  }

  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.trim() || value == null) {
      continue
    }
    headers[key] = toText(value)
  }

  return headers
}

const parseExtraConfig = (raw: string): Record<string, unknown> => {
  const text = raw.trim()
  if (!text) {
    return {}
  }

  const parsed = parseObjectJson(text)
  return parsed ?? {}
}

const hasAuthorizationHeader = (headers: Record<string, string>): boolean => {
  return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization')
}

const buildCompletionUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) {
    return ''
  }
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed
  }
  return `${trimmed}/chat/completions`
}

const normalizeRoleForLlm = (message: IMessage): LlmRole => {
  return message.role
}

const normalizeContentForLlm = (message: IMessage): string => {
  const content = toText(message.content)
  const role = message.role
  if (role === 'system' || role === 'assistant') {
    return content
  }

  const type = message.messageType ?? 'text'
  if (
    type === 'tool_call' ||
    type === 'tool_result' ||
    type === 'skill_result' ||
    type === 'tool_error' ||
    type === 'agent_error'
  ) {
    const toolName = toText(message.name).trim()
    const prefix = toolName ? `[${type}:${toolName}]` : `[${type}]`
    return `${prefix} ${content}`
  }

  return content
}

const toLlmMessages = (messages: IMessage[]): LlmMessage[] => {
  return messages
    .map((message) => ({
      role: normalizeRoleForLlm(message),
      content: normalizeContentForLlm(message),
    }))
    .filter((message) => message.content.trim().length > 0)
}

const extractContentText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object') {
          const text = (item as { text?: unknown }).text
          if (typeof text === 'string') {
            return text
          }
        }
        return toText(item)
      })
      .join('\n')
  }

  return toText(content)
}

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return trimmed
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }

  return value
}

const extractReasoningText = (completionMessage: CompletionMessage): string => {
  const candidates: unknown[] = [
    completionMessage.reasoning_content,
    completionMessage.reasoning,
    completionMessage.reasoningContent,
  ]

  for (const candidate of candidates) {
    const text = extractContentText(candidate)
    if (text.length > 0) {
      return text
    }
  }

  return ''
}

const extractCodeBlockJsonCandidates = (text: string): string[] => {
  const regex = /```(?:json)?\s*([\s\S]*?)```/gi
  const candidates: string[] = []
  let match: RegExpExecArray | null = null

  while ((match = regex.exec(text)) !== null) {
    const candidate = match[1]?.trim()
    if (candidate) {
      candidates.push(candidate)
    }
  }

  return candidates
}

const extractFirstBalancedJsonObject = (text: string): string | null => {
  let start = -1
  let depth = 0
  let inString = false
  let escape = false

  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\') {
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (ch === '{') {
      if (start < 0) {
        start = index
      }
      depth += 1
      continue
    }

    if (ch === '}' && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return null
}

const parseToolCallFromObject = (obj: Record<string, unknown>): ParsedToolCall | null => {
  const toolCall = obj.tool_call
  if (typeof toolCall === 'string' && toolCall.trim()) {
    return {
      type: toolCall.trim(),
      payload: obj.args ?? obj.content ?? [],
    }
  }

  const functionName = obj.function
  if (typeof functionName === 'string' && functionName.trim()) {
    return {
      type: functionName.trim(),
      payload: obj.args ?? obj.arguments ?? [],
    }
  }

  const toolName = obj.tool
  if (typeof toolName === 'string' && toolName.trim()) {
    return {
      type: toolName.trim(),
      payload: obj.args ?? obj.arguments ?? {},
    }
  }

  const functionCall = obj.function_call
  if (functionCall && typeof functionCall === 'object' && !Array.isArray(functionCall)) {
    const name = (functionCall as { name?: unknown }).name
    if (typeof name === 'string' && name.trim()) {
      const args = (functionCall as { arguments?: unknown }).arguments
      return {
        type: name.trim(),
        payload: parseMaybeJson(args ?? []),
      }
    }
  }

  return null
}

const parseToolCallFromText = (text: string): ParsedToolCall | null => {
  const candidates = [
    ...extractCodeBlockJsonCandidates(text),
    text.trim(),
    extractFirstBalancedJsonObject(text) ?? '',
  ].filter(Boolean)

  for (const candidate of candidates) {
    const parsed = parseObjectJson(candidate)
    if (!parsed) {
      continue
    }

    const parsedToolCall = parseToolCallFromObject(parsed)
    if (parsedToolCall) {
      return parsedToolCall
    }
  }

  return null
}

const parseToolCall = (completionMessage: CompletionMessage, content: string): ParsedToolCall | null => {
  if (Array.isArray(completionMessage.tool_calls) && completionMessage.tool_calls.length > 0) {
    const first = completionMessage.tool_calls[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const functionField = (first as { function?: unknown }).function
      if (functionField && typeof functionField === 'object' && !Array.isArray(functionField)) {
        const name = (functionField as { name?: unknown }).name
        if (typeof name === 'string' && name.trim()) {
          const args = (functionField as { arguments?: unknown }).arguments
          return {
            type: name.trim(),
            payload: parseMaybeJson(args ?? []),
          }
        }
      }
    }
  }

  if (
    completionMessage.function_call &&
    typeof completionMessage.function_call === 'object' &&
    !Array.isArray(completionMessage.function_call)
  ) {
    const functionCall = completionMessage.function_call as { name?: unknown; arguments?: unknown }
    if (typeof functionCall.name === 'string' && functionCall.name.trim()) {
      return {
        type: functionCall.name.trim(),
        payload: parseMaybeJson(functionCall.arguments ?? []),
      }
    }
  }

  return parseToolCallFromText(content)
}

const parseCompletionResult = (payload: unknown): CompletionResult => {
  const payloadObj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const choices = Array.isArray(payloadObj.choices) ? payloadObj.choices : []
  const firstChoice = choices[0] && typeof choices[0] === 'object' ? (choices[0] as Record<string, unknown>) : null

  const completionMessage =
    firstChoice?.message && typeof firstChoice.message === 'object' && !Array.isArray(firstChoice.message)
      ? (firstChoice.message as CompletionMessage)
      : {}

  const fallbackText = typeof firstChoice?.text === 'string' ? firstChoice.text : ''
  const content = extractContentText(completionMessage.content ?? fallbackText)
  const fallbackReasoning =
    firstChoice && typeof firstChoice === 'object'
      ? extractContentText(
          (firstChoice as { reasoning_content?: unknown; reasoning?: unknown }).reasoning_content ??
            (firstChoice as { reasoning?: unknown }).reasoning,
        )
      : ''
  const reasoningContent = extractReasoningText(completionMessage) || fallbackReasoning

  return {
    message: completionMessage,
    content,
    reasoningContent,
  }
}

type StreamChoice = {
  text?: unknown
  message?: unknown
  delta?: unknown
}

type StreamState = {
  content: string
  reasoningContent: string
  toolCalls: Array<Record<string, unknown>>
  functionCall: {
    name?: string
    arguments?: string
  } | null
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const toStreamChoice = (payload: unknown): StreamChoice | null => {
  if (!isObjectRecord(payload)) {
    return null
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : []
  if (choices.length === 0 || !isObjectRecord(choices[0])) {
    return null
  }

  return choices[0] as StreamChoice
}

const mergeNamePiece = (previous: string, incoming: string): string => {
  if (!incoming) {
    return previous
  }
  if (!previous || previous === incoming) {
    return incoming
  }
  if (incoming.startsWith(previous)) {
    return incoming
  }
  if (previous.startsWith(incoming)) {
    return previous
  }
  return `${previous}${incoming}`
}

const ensureToolCallAt = (toolCalls: Array<Record<string, unknown>>, index: number): Record<string, unknown> => {
  while (toolCalls.length <= index) {
    toolCalls.push({})
  }
  return toolCalls[index]
}

const mergeToolCallDeltas = (state: StreamState, rawToolCalls: unknown): void => {
  if (!Array.isArray(rawToolCalls)) {
    return
  }

  for (let idx = 0; idx < rawToolCalls.length; idx += 1) {
    const raw = rawToolCalls[idx]
    if (!isObjectRecord(raw)) {
      continue
    }

    const rawIndex = raw.index
    const targetIndex =
      typeof rawIndex === 'number' && Number.isFinite(rawIndex) && rawIndex >= 0 ? Math.trunc(rawIndex) : idx
    const target = ensureToolCallAt(state.toolCalls, targetIndex)

    const id = toText(raw.id)
    if (id.length > 0) {
      target.id = id
    }

    const type = toText(raw.type)
    if (type.length > 0) {
      target.type = type
    }

    const rawFunction = raw.function
    if (!isObjectRecord(rawFunction)) {
      continue
    }

    const existingFunction = isObjectRecord(target.function) ? target.function : {}
    const name = toText(rawFunction.name)
    if (name.length > 0) {
      existingFunction.name = mergeNamePiece(toText(existingFunction.name), name)
    }

    const argumentsPiece = toText(rawFunction.arguments)
    if (argumentsPiece) {
      existingFunction.arguments = `${toText(existingFunction.arguments)}${argumentsPiece}`
    }

    target.function = existingFunction
  }
}

const mergeFunctionCallDelta = (
  state: StreamState,
  rawFunctionCall: unknown,
  isFullMessage: boolean,
): void => {
  if (!isObjectRecord(rawFunctionCall)) {
    return
  }

  if (!state.functionCall) {
    state.functionCall = {}
  }

  const incomingName = toText(rawFunctionCall.name)
  if (incomingName.length > 0) {
    const previousName = state.functionCall.name ?? ''
    state.functionCall.name = isFullMessage ? incomingName : mergeNamePiece(previousName, incomingName)
  }

  const incomingArguments = toText(rawFunctionCall.arguments)
  if (incomingArguments) {
    state.functionCall.arguments = isFullMessage
      ? incomingArguments
      : `${state.functionCall.arguments ?? ''}${incomingArguments}`
  }
}

const mergeStreamChoice = (
  state: StreamState,
  choice: StreamChoice,
): { deltaContent: string; deltaReasoningContent: string } => {
  let deltaContent = ''
  let deltaReasoningContent = ''

  if (isObjectRecord(choice.message)) {
    const message = choice.message as CompletionMessage
    const fullContent = extractContentText(message.content)
    if (fullContent) {
      const previousContent = state.content
      state.content = fullContent
      deltaContent = fullContent.startsWith(previousContent) ? fullContent.slice(previousContent.length) : fullContent
    }

    const fullReasoning = extractReasoningText(message)
    if (fullReasoning) {
      const previousReasoning = state.reasoningContent
      state.reasoningContent = fullReasoning
      deltaReasoningContent = fullReasoning.startsWith(previousReasoning)
        ? fullReasoning.slice(previousReasoning.length)
        : fullReasoning
    }

    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      state.toolCalls = message.tool_calls
        .filter((item): item is Record<string, unknown> => isObjectRecord(item))
        .map((item) => ({ ...item }))
    }

    mergeFunctionCallDelta(state, message.function_call, true)
  }

  if (isObjectRecord(choice.delta)) {
    const delta = choice.delta as CompletionMessage
    const contentPiece = extractContentText(delta.content)
    if (contentPiece) {
      state.content += contentPiece
      deltaContent += contentPiece
    }

    const reasoningPiece = extractReasoningText(delta)
    if (reasoningPiece) {
      state.reasoningContent += reasoningPiece
      deltaReasoningContent += reasoningPiece
    }

    mergeToolCallDeltas(state, delta.tool_calls)
    mergeFunctionCallDelta(state, delta.function_call, false)
  }

  const fallbackTextPiece = toText(choice.text)
  if (fallbackTextPiece) {
    state.content += fallbackTextPiece
    deltaContent += fallbackTextPiece
  }

  return {
    deltaContent,
    deltaReasoningContent,
  }
}

const toCompletionResultFromStreamState = (state: StreamState): CompletionResult => {
  const completionMessage: CompletionMessage = {
    content: state.content,
    reasoning_content: state.reasoningContent,
  }

  if (state.toolCalls.length > 0) {
    completionMessage.tool_calls = state.toolCalls
  }

  if (state.functionCall) {
    completionMessage.function_call = state.functionCall
  }

  return {
    message: completionMessage,
    content: state.content,
    reasoningContent: state.reasoningContent,
  }
}

const parseStreamingCompletion = async (
  response: Awaited<ReturnType<typeof fetch>>,
  options?: CallLlmOptions,
): Promise<CompletionResult> => {
  if (!response.body) {
    return {
      message: {},
      content: '',
      reasoningContent: '',
    }
  }

  const state: StreamState = {
    content: '',
    reasoningContent: '',
    toolCalls: [],
    functionCall: null,
  }

  let buffer = ''
  let dataLines: string[] = []
  let rawText = ''
  let parsedChunkCount = 0

  const processDataLines = async (): Promise<void> => {
    if (dataLines.length === 0) {
      return
    }

    const joined = dataLines.join('\n')
    dataLines = []
    if (joined.length === 0 || joined === '[DONE]') {
      return
    }

    let payload: unknown
    try {
      payload = JSON.parse(joined)
    } catch {
      throw new Error(`LLM stream chunk is not valid JSON: ${joined}`)
    }

    const choice = toStreamChoice(payload)
    if (!choice) {
      return
    }

    parsedChunkCount += 1
    const merged = mergeStreamChoice(state, choice)
    if (options?.onChunk && (merged.deltaContent || merged.deltaReasoningContent)) {
      await options.onChunk({
        content: state.content,
        reasoningContent: state.reasoningContent,
        deltaContent: merged.deltaContent,
        deltaReasoningContent: merged.deltaReasoningContent,
      })
    }
  }

  for await (const chunk of response.body as AsyncIterable<Buffer | string>) {
    const textChunk = toText(chunk)
    rawText += textChunk
    buffer += textChunk

    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex >= 0) {
      let line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }

      if (line.length === 0) {
        await processDataLines()
      } else if (line.startsWith(':')) {
        // Keepalive/comment lines in SSE stream.
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      } else if (/^[a-zA-Z]+:/.test(line)) {
        // Ignore non-data SSE fields such as "event:" or "id:".
      } else {
        // Some providers may stream raw JSON lines without SSE prefix.
        dataLines.push(line)
      }

      newlineIndex = buffer.indexOf('\n')
    }
  }

  if (buffer.length > 0) {
    const remaining = buffer
    if (remaining.startsWith('data:')) {
      dataLines.push(remaining.slice(5).trimStart())
    } else if (/^[a-zA-Z]+:/.test(remaining)) {
      // Ignore trailing non-data SSE fields.
    } else {
      dataLines.push(remaining)
    }
  }

  await processDataLines()
  const streamedResult = toCompletionResultFromStreamState(state)
  if (parsedChunkCount > 0) {
    return streamedResult
  }

  if (rawText.length === 0) {
    return streamedResult
  }

  if (/(^|\n)\s*data:/m.test(rawText)) {
    return streamedResult
  }

  try {
    return parseCompletionResult(JSON.parse(rawText))
  } catch {
    throw new Error(`LLM response is not valid stream JSON: ${rawText}`)
  }
}

const hasTriggerMessage = (messages: IMessage[]): boolean => {
  if (messages.length === 0) {
    return false
  }

  return messages[messages.length - 1]?.role === 'user'
}

export const getRuntimeConfig = async (task: ChatTask): Promise<RuntimeConfigResult> => {
  if (!task.providerId || !task.modelId) {
    return {
      config: null,
      error: '当前会话未配置模型，请先选择可用 provider/model。',
    }
  }

  const lease = await ddbConnectionPool.get(task.auth)
  try {
    const providerScript = `
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
select top 1
  baseUrl,
  apiKey,
  headers,
  isEnabled
from providersTable
where string(providerId) = ${toDosStringLiteral(task.providerId)}
`

    const modelScript = `
modelsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(MODELS_TABLE)})
select top 1
  string(modelId) as modelId,
  modelCode,
  temperature,
  topP,
  maxTokens,
  extraConfig,
  supportTool,
  isEnabled
from modelsTable
where string(providerId) = ${toDosStringLiteral(task.providerId)}
  and string(modelId) = ${toDosStringLiteral(task.modelId)}
`

    const [providerResult, modelResult] = await Promise.all([
      lease.ddb.execute(providerScript, { table: 'full' }),
      lease.ddb.execute(modelScript, { table: 'full' }),
    ])

    const providerRows = extractRows(providerResult)
    const modelRows = extractRows(modelResult)

    if (providerRows.length === 0) {
      return {
        config: null,
        error: `找不到 provider: ${task.providerId}`,
      }
    }
    if (modelRows.length === 0) {
      return {
        config: null,
        error: `找不到 model: ${task.modelId}`,
      }
    }

    const providerRow = providerRows[0]
    const modelRow = modelRows[0]

    const provider: ProviderConfig = {
      baseUrl: toText(providerRow.baseUrl).trim(),
      apiKey: toText(providerRow.apiKey),
      headers: parseHeaders(toText(providerRow.headers)),
      isEnabled: toBool(providerRow.isEnabled),
    }

    const model: ModelConfig = {
      modelId: toText(modelRow.modelId).trim(),
      modelCode: toText(modelRow.modelCode).trim(),
      temperature: toFiniteNumberOrNull(modelRow.temperature),
      topP: toFiniteNumberOrNull(modelRow.topP),
      maxTokens: toFiniteNumberOrNull(modelRow.maxTokens),
      extraConfig: parseExtraConfig(toText(modelRow.extraConfig)),
      supportTool: toBool(modelRow.supportTool),
      isEnabled: toBool(modelRow.isEnabled),
    }

    if (!provider.isEnabled) {
      return {
        config: null,
        error: '当前 provider 已禁用，请切换到启用状态的 provider。',
      }
    }
    if (!model.isEnabled) {
      return {
        config: null,
        error: '当前 model 已禁用，请切换到启用状态的 model。',
      }
    }
    if (!provider.baseUrl) {
      return {
        config: null,
        error: '当前 provider 未配置 baseUrl。',
      }
    }

    return {
      config: {
        provider,
        model,
      },
    }
  } catch (error) {
    return {
      config: null,
      error: `读取 provider/model 配置失败: ${error instanceof Error ? error.message : String(error)}`,
    }
  } finally {
    await lease.release()
  }
}

export const callLlm = async (
  config: RuntimeConfig,
  messages: LlmMessage[],
  options?: CallLlmOptions,
): Promise<CompletionResult> => {
  const completionUrl = buildCompletionUrl(config.provider.baseUrl)
  if (!completionUrl) {
    throw new Error('Provider baseUrl is empty.')
  }

  const requestBody: Record<string, unknown> = {
    ...(config.model.extraConfig ?? {}),
    model: config.model.modelCode || config.model.modelId,
    messages,
    stream: true,
  }

  if (config.model.temperature != null) {
    requestBody.temperature = config.model.temperature
  }
  if (config.model.topP != null) {
    requestBody.top_p = config.model.topP
  }
  if (config.model.maxTokens != null && config.model.maxTokens > 0) {
    requestBody.max_tokens = Math.trunc(config.model.maxTokens)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.provider.headers,
  }

  if (config.provider.apiKey && !hasAuthorizationHeader(headers)) {
    headers.Authorization = `Bearer ${config.provider.apiKey}`
  }

  const response = await fetch(completionUrl, {
    method: 'POST',
    headers: headers as HeadersInit,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120000) as any,
  })

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(`LLM request failed (${response.status}): ${raw || response.statusText}`)
  }

  return parseStreamingCompletion(response, options)
}

/**
 * A single agent loop iteration.
 * Do one LLM turn; if tool call is produced, dispatch to script handlers.
 */
export async function do_loop(agent: BackgroundAgent, chatId: string): Promise<boolean> {
  const task = agent.getTask(chatId)
  if (!task) {
    return false
  }

  try {
    const messages = await getMessages(task.auth, chatId)
    if (!hasTriggerMessage(messages)) {
      return false
    }

    const runtimeConfigResult = await getRuntimeConfig(task)
    if (!runtimeConfigResult.config) {
      if (runtimeConfigResult.error) {
        await agent.saveMessageAndEmit(chatId, {
          role: 'user',
          messageType: 'agent_error',
          content: runtimeConfigResult.error,
          createTime: Date.now(),
        })
      }
      return false
    }

    const llmMessages = toLlmMessages(messages)
    if (llmMessages.length === 0) {
      return false
    }

    const steps = await getStepsByChatId(task.auth, chatId)
    const activeSteps = steps.filter((s: any) => s.active)
    if (activeSteps.length > 0) {
      const stepsContent = [
        '【当前任务清单 (Steps)】',
        ...activeSteps.map((s: any) => `${s.stepIndex}. [${s.checked ? 'x' : ' '}] ${s.content}`)
      ].join('\n')
      
      // 注入到倒数第一条消息之前（如果总共只有1条，则变成第1条）
      llmMessages.splice(llmMessages.length - 1, 0, {
        role: 'system',
        content: stepsContent
      })
    }

    agent.emitStatus(chatId, 'thinking', 'Agent 正在思考...')
    try {
      const streamMessageId = crypto.randomUUID()
      let hasStreamedChunk = false

      const completion = await callLlm(runtimeConfigResult.config, llmMessages, {
        onChunk: (chunk) => {
          if (!chunk.content && !chunk.reasoningContent) {
            return
          }

          hasStreamedChunk = true
          agent.emitMessageStream(chatId, {
            msgId: streamMessageId,
            chatId,
            role: 'assistant',
            messageType: 'text',
            content: chunk.content,
            reasoning_content: chunk.reasoningContent || undefined,
            createTime: Date.now(),
          })
        },
      })
      const content = completion.content
      const reasoningContent = completion.reasoningContent
      const parsedToolCall = parseToolCall(completion.message, content)

      if (!parsedToolCall) {
        if (!content.trim() && !reasoningContent.trim()) {
          if (hasStreamedChunk) {
            agent.emitMessageStreamEnd(chatId, streamMessageId, true)
          }

          await agent.saveMessageAndEmit(chatId, {
            role: 'assistant',
            messageType: 'agent_error',
            content: '模型返回了空响应。',
            createTime: Date.now(),
          })
          return false
        }

        await agent.saveMessageAndEmit(chatId, {
          msgId: streamMessageId,
          role: 'assistant',
          messageType: 'text',
          content,
          reasoning_content: reasoningContent || undefined,
          createTime: Date.now(),
        })
        return false
      }

      if (hasStreamedChunk) {
        agent.emitMessageStreamEnd(chatId, streamMessageId, true)
      }

      const toolCallPayload = {
        tool_call: parsedToolCall.type,
        args: parsedToolCall.payload,
      }

      await agent.saveMessageAndEmit(chatId, {
        role: 'assistant',
        messageType: 'tool_call',
        name: parsedToolCall.type,
        content: JSON.stringify(toolCallPayload),
        content_object: JSON.stringify(toolCallPayload),
        reasoning_content: reasoningContent || undefined,
        createTime: Date.now(),
      })

      agent.emitStatus(chatId, 'tool_running', `Agent 正在执行工具: ${parsedToolCall.type}`)
      const scriptResult = await agent.dispatchScript(chatId, parsedToolCall.type, parsedToolCall.payload)

      if (scriptResult.save_message) {
        await agent.saveMessageAndEmit(chatId, {
          ...scriptResult.save_message,
          createTime: Date.now(),
        })
      }

      if (scriptResult.next_loop && !scriptResult.save_message) {
        await agent.saveMessageAndEmit(chatId, {
          role: 'user',
          messageType: 'agent_error',
          content: `Tool ${parsedToolCall.type} requested next_loop=true but did not provide save_message.`,
          createTime: Date.now(),
        })
        return true
      }

      return scriptResult.next_loop
    } finally {
      agent.emitStatus(chatId, 'idle')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Error in do_loop for ${chatId}:`, err)
    agent.emitStatus(chatId, 'error', message)
    await agent.saveMessageAndEmit(chatId, {
      role: 'user',
      messageType: 'agent_error',
      content: `Agent loop failed: ${message}`,
      createTime: Date.now(),
    })
    return false
  }
}
