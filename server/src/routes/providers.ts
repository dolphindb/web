import { Router, type Router as ExpressRouter, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import type { DdbAuth } from '../lib/ddb-auth.js'
import { ddbConnectionPool } from '../lib/ddb-connection-pool.js'
import { getRequiredDdbAuth } from '../middleware/ddb-auth.js'

type ProviderRecord = {
  providerId: string
  providerName: string
  baseUrl: string
  apiKey: string
  description: string
  headers: string
  defaultModelId: string
  createTime: string
  updateTime: string
  isEnabled: boolean
}

type ModelRecord = {
  modelId: string
  providerId: string
  modelName: string
  modelCode: string
  contextWindow: number
  supportTool: boolean
  temperature: number
  topP: number
  maxTokens: number
  extraConfig: string
  isDefault: boolean
  createTime: string
  updateTime: string
  isEnabled: boolean
}

type TableResult = {
  data?: Array<Record<string, unknown>>
}

type ParsedProviderPayload = {
  providerName: string
  baseUrl: string
  apiKey: string
  description: string
  headers: string
  isEnabled: boolean
}

type ParsedModelPayload = {
  modelName: string
  contextWindow: number
  supportTool: boolean
  temperature: number
  topP: number
  maxTokens: number
  extraConfig: string
  isEnabled: boolean
}

type ParsedCreateModelPayload = ParsedModelPayload & {
  modelId: string
  modelCode: string
}

type DdbExecutor = {
  execute: <TResult = unknown>(script: string, options?: any) => Promise<TResult>
}

const router: ExpressRouter = Router()

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

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase()
    return normalized === 'true' || normalized === '1'
  }
  return false
}

const toText = (value: unknown): string => {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const toInteger = (value: unknown, fallback = 0): number => {
  const parsed = toNumber(value, fallback)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const normalizeProvider = (row: Record<string, unknown>): ProviderRecord => {
  return {
    providerId: toText(row.providerId).trim(),
    providerName: toText(row.providerName),
    baseUrl: toText(row.baseUrl),
    apiKey: toText(row.apiKey),
    description: toText(row.description),
    headers: toText(row.headers),
    defaultModelId: toText(row.defaultModelId).trim(),
    createTime: toText(row.createTime),
    updateTime: toText(row.updateTime),
    isEnabled: toBool(row.isEnabled),
  }
}

const normalizeModel = (row: Record<string, unknown>): ModelRecord => {
  const modelId = toText(row.modelId).trim()
  const modelCode = toText(row.modelCode).trim()

  return {
    modelId,
    providerId: toText(row.providerId).trim(),
    modelName: toText(row.modelName),
    modelCode: modelCode || modelId,
    contextWindow: toInteger(row.contextWindow, 0),
    supportTool: toBool(row.supportTool),
    temperature: toNumber(row.temperature, 1),
    topP: toNumber(row.topP, 1),
    maxTokens: toInteger(row.maxTokens, 0),
    extraConfig: toText(row.extraConfig),
    isDefault: toBool(row.isDefault),
    createTime: toText(row.createTime),
    updateTime: toText(row.updateTime),
    isEnabled: toBool(row.isEnabled),
  }
}

const extractRows = <TRecord>(
  result: unknown,
  normalize: (row: Record<string, unknown>) => TRecord,
): TRecord[] => {
  if (!result || typeof result !== 'object' || !Array.isArray((result as TableResult).data)) {
    return []
  }

  return (result as TableResult).data!.map((row) => normalize(row))
}

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName}不能为空。`)
  }
  return value.trim()
}

const parseOptionalString = (value: unknown, fieldName: string): string => {
  if (value == null) {
    return ''
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName}必须是字符串。`)
  }
  return value
}

const parseOptionalBool = (value: unknown, fieldName: string, fallback: boolean): boolean => {
  if (value == null) {
    return fallback
  }
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName}必须是布尔值。`)
  }
  return value
}

const parseOptionalNumber = (value: unknown, fieldName: string, fallback: number): number => {
  if (value == null || value === '') {
    return fallback
  }

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName}必须是数字。`)
  }

  return parsed
}

const parseOptionalInteger = (value: unknown, fieldName: string, fallback: number): number => {
  const parsed = parseOptionalNumber(value, fieldName, fallback)
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName}必须是整数。`)
  }
  return parsed
}

const parseProviderPayload = (payload: unknown): ParsedProviderPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('请求体不能为空。')
  }

  const body = payload as Record<string, unknown>
  return {
    providerName: parseRequiredString(body.providerName, '提供商名称'),
    baseUrl: parseRequiredString(body.baseUrl, 'AI Endpoint'),
    apiKey: parseOptionalString(body.apiKey, 'API Key'),
    description: parseOptionalString(body.description, '描述'),
    headers: parseOptionalString(body.headers, '自定义请求头'),
    isEnabled: parseOptionalBool(body.isEnabled, '启用状态', true),
  }
}

const parseModelPayloadBase = (payload: unknown): ParsedModelPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('请求体不能为空。')
  }

  const body = payload as Record<string, unknown>
  return {
    modelName: parseRequiredString(body.modelName, '模型名称'),
    contextWindow: parseOptionalInteger(body.contextWindow, '上下文窗口', 0),
    supportTool: parseOptionalBool(body.supportTool, '工具调用开关', false),
    temperature: parseOptionalNumber(body.temperature, 'Temperature', 1),
    topP: parseOptionalNumber(body.topP, 'Top P', 1),
    maxTokens: parseOptionalInteger(body.maxTokens, '最大输出 Token', 0),
    extraConfig: parseOptionalString(body.extraConfig, '额外配置'),
    isEnabled: parseOptionalBool(body.isEnabled, '启用状态', true),
  }
}

const parseCreateModelPayload = (payload: unknown): ParsedCreateModelPayload => {
  const base = parseModelPayloadBase(payload)
  const body = payload as Record<string, unknown>
  const modelCode = typeof body.modelCode === 'string' && body.modelCode.trim()
    ? body.modelCode.trim()
    : ''

  return {
    ...base,
    modelId: typeof body.modelId === 'string' && body.modelId.trim()
      ? body.modelId.trim()
      : randomUUID(),
    modelCode,
  }
}

const buildSelectProvidersScript = (providerId?: string): string => {
  const whereClause = providerId ? ` where string(providerId) = ${toDosStringLiteral(providerId)}` : ''

  return `
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
select
  string(providerId) as providerId,
  providerName,
  baseUrl,
  apiKey,
  description,
  headers,
  defaultModelId,
  string(createTime) as createTime,
  string(updateTime) as updateTime,
  isEnabled
from providersTable${whereClause}
order by updateTime desc, createTime desc
`
}

const buildSelectModelsScript = (providerId: string, modelId?: string): string => {
  const modelWhere = modelId ? ` and string(modelId) = ${toDosStringLiteral(modelId)}` : ''

  return `
modelsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(MODELS_TABLE)})
select
  string(modelId) as modelId,
  string(providerId) as providerId,
  modelName,
  modelCode,
  contextWindow,
  supportTool,
  temperature,
  topP,
  maxTokens,
  extraConfig,
  isDefault,
  string(createTime) as createTime,
  string(updateTime) as updateTime,
  isEnabled
from modelsTable
where string(providerId) = ${toDosStringLiteral(providerId)}${modelWhere}
order by isDefault desc, updateTime desc, createTime desc
`
}

const getProviderById = async (ddb: DdbExecutor, providerId: string): Promise<ProviderRecord | null> => {
  const result = await ddb.execute(buildSelectProvidersScript(providerId), {
    table: 'full',
  })
  const rows = extractRows(result, normalizeProvider)
  return rows.length > 0 ? rows[0] : null
}

const getAllProviders = async (ddb: DdbExecutor): Promise<ProviderRecord[]> => {
  const result = await ddb.execute(buildSelectProvidersScript(), {
    table: 'full',
  })
  return extractRows(result, normalizeProvider)
}

const getModelsByProviderId = async (ddb: DdbExecutor, providerId: string): Promise<ModelRecord[]> => {
  const result = await ddb.execute(buildSelectModelsScript(providerId), {
    table: 'full',
  })
  return extractRows(result, normalizeModel)
}

const getModelById = async (
  ddb: DdbExecutor,
  providerId: string,
  modelId: string,
): Promise<ModelRecord | null> => {
  const result = await ddb.execute(buildSelectModelsScript(providerId, modelId), {
    table: 'full',
  })
  const rows = extractRows(result, normalizeModel)
  return rows.length > 0 ? rows[0] : null
}

const executeWithDdb = async (
  auth: DdbAuth,
  handler: (ddb: DdbExecutor) => Promise<void>,
): Promise<void> => {
  const lease = await ddbConnectionPool.get(auth)

  try {
    await handler(lease.ddb)
  } finally {
    await lease.release()
  }
}

const getRequestAuthOrFail = (req: Request, res: Response): DdbAuth | null => {
  try {
    return getRequiredDdbAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : '缺少 Authorization 上下文。'
    res.status(500).json({ error: message })
    return null
  }
}

router.get('/', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  try {
    let providers: ProviderRecord[] = []

    await executeWithDdb(auth, async (ddb) => {
      providers = await getAllProviders(ddb)
    })

    res.json({
      ok: true,
      providers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询提供商列表失败。'
    res.status(500).json({ error: message })
  }
})

router.get('/:providerId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  if (!providerId) {
    res.status(400).json({ error: '提供商标识不能为空。' })
    return
  }

  try {
    let provider: ProviderRecord | null = null
    let models: ModelRecord[] = []

    await executeWithDdb(auth, async (ddb) => {
      provider = await getProviderById(ddb, providerId)
      if (provider) {
        models = await getModelsByProviderId(ddb, providerId)
      }
    })

    if (!provider) {
      res.status(404).json({ error: '提供商不存在。' })
      return
    }

    res.json({
      ok: true,
      provider,
      models,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询提供商详情失败。'
    res.status(500).json({ error: message })
  }
})

router.get('/:providerId/models', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  if (!providerId) {
    res.status(400).json({ error: '提供商标识不能为空。' })
    return
  }

  try {
    let provider: ProviderRecord | null = null
    let models: ModelRecord[] = []

    await executeWithDdb(auth, async (ddb) => {
      provider = await getProviderById(ddb, providerId)
      if (provider) {
        models = await getModelsByProviderId(ddb, providerId)
      }
    })

    if (!provider) {
      res.status(404).json({ error: '提供商不存在。' })
      return
    }

    res.json({
      ok: true,
      models,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询模型列表失败。'
    res.status(500).json({ error: message })
  }
})

router.post('/', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  let payload: ParsedProviderPayload
  const providerId = randomUUID()

  try {
    payload = parseProviderPayload(req.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求参数无效。'
    res.status(400).json({ error: message })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
providerIdText = ${toDosStringLiteral(providerId)}
existingCount = exec count(*) from providersTable where string(providerId) = providerIdText
if(existingCount > 0){
    throw "提供商已存在。"
}
nowTs = now()
newRow = table(
    symbol([providerIdText]) as providerId,
    [${toDosStringLiteral(payload.providerName)}] as providerName,
    [${toDosStringLiteral(payload.baseUrl)}] as baseUrl,
    [${toDosStringLiteral(payload.apiKey)}] as apiKey,
    [${toDosStringLiteral(payload.description)}] as description,
    [${toDosStringLiteral(payload.headers)}] as headers,
    [""] as defaultModelId,
    [nowTs] as createTime,
    [nowTs] as updateTime,
    [${payload.isEnabled ? 'true' : 'false'}] as isEnabled
)
providersTable.append!(newRow)
`)
    })

    let provider: ProviderRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      provider = await getProviderById(ddb, providerId)
    })

    if (!provider) {
      res.status(500).json({ error: '提供商已创建，但获取详情失败。' })
      return
    }

    res.status(201).json({
      ok: true,
      provider,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建提供商失败。'
    const statusCode = message.includes('已存在') ? 409 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.put('/:providerId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  if (!providerId) {
    res.status(400).json({ error: '提供商标识不能为空。' })
    return
  }

  let payload: ParsedProviderPayload
  try {
    payload = parseProviderPayload(req.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求参数无效。'
    res.status(400).json({ error: message })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
providerIdText = ${toDosStringLiteral(providerId)}
existingCount = exec count(*) from providersTable where string(providerId) = providerIdText
if(existingCount <= 0){
    throw "提供商不存在。"
}
update providersTable set
    providerName = ${toDosStringLiteral(payload.providerName)},
    baseUrl = ${toDosStringLiteral(payload.baseUrl)},
    apiKey = ${toDosStringLiteral(payload.apiKey)},
    description = ${toDosStringLiteral(payload.description)},
    headers = ${toDosStringLiteral(payload.headers)},
    updateTime = now(),
    isEnabled = ${payload.isEnabled ? 'true' : 'false'}
where string(providerId) = providerIdText
`)
    })

    let provider: ProviderRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      provider = await getProviderById(ddb, providerId)
    })

    if (!provider) {
      res.status(404).json({ error: '提供商不存在。' })
      return
    }

    res.json({
      ok: true,
      provider,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新提供商失败。'
    const statusCode = message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/:providerId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  if (!providerId) {
    res.status(400).json({ error: '提供商标识不能为空。' })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
modelsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(MODELS_TABLE)})
providerIdText = ${toDosStringLiteral(providerId)}
existingCount = exec count(*) from providersTable where string(providerId) = providerIdText
if(existingCount <= 0){
    throw "提供商不存在。"
}
delete from modelsTable where string(providerId) = providerIdText
delete from providersTable where string(providerId) = providerIdText
`)
    })

    res.json({
      ok: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除提供商失败。'
    const statusCode = message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.post('/:providerId/models', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  if (!providerId) {
    res.status(400).json({ error: '提供商标识不能为空。' })
    return
  }

  let payload: ParsedCreateModelPayload
  try {
    payload = parseCreateModelPayload(req.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求参数无效。'
    res.status(400).json({ error: message })
    return
  }

  const modelId = payload.modelId

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
modelsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(MODELS_TABLE)})
providerIdText = ${toDosStringLiteral(providerId)}
modelIdText = ${toDosStringLiteral(modelId)}
providerCount = exec count(*) from providersTable where string(providerId) = providerIdText
if(providerCount <= 0){
    throw "提供商不存在。"
}
existingCount = exec count(*) from modelsTable where string(providerId) = providerIdText and string(modelId) = modelIdText
if(existingCount > 0){
    throw "模型已存在。"
}
nowTs = now()
newRow = table(
    symbol([modelIdText]) as modelId,
    symbol([providerIdText]) as providerId,
    [${toDosStringLiteral(payload.modelName)}] as modelName,
    [${toDosStringLiteral(payload.modelCode || payload.modelId)}] as modelCode,
    [${payload.contextWindow}] as contextWindow,
    [${payload.supportTool ? 'true' : 'false'}] as supportTool,
    [${payload.temperature}] as temperature,
    [${payload.topP}] as topP,
    [${payload.maxTokens}] as maxTokens,
    [${toDosStringLiteral(payload.extraConfig)}] as extraConfig,
    [false] as isDefault,
    [nowTs] as createTime,
    [nowTs] as updateTime,
    [${payload.isEnabled ? 'true' : 'false'}] as isEnabled
)
modelsTable.append!(newRow)
defaultCount = exec count(*) from modelsTable where string(providerId) = providerIdText and isDefault = true
if(defaultCount <= 0){
    update modelsTable set isDefault = false where string(providerId) = providerIdText
    update modelsTable set isDefault = true where string(providerId) = providerIdText and string(modelId) = modelIdText
    update providersTable set defaultModelId = modelIdText, updateTime = nowTs where string(providerId) = providerIdText
}
`)
    })

    let model: ModelRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      model = await getModelById(ddb, providerId, modelId)
    })

    if (!model) {
      res.status(500).json({ error: '模型已创建，但获取详情失败。' })
      return
    }

    res.status(201).json({
      ok: true,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建模型失败。'
    const statusCode = message.includes('已存在') ? 409 : message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.put('/:providerId/models/:modelId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  const modelId = req.params.modelId?.trim() || ''
  if (!providerId || !modelId) {
    res.status(400).json({ error: '提供商标识和模型标识不能为空。' })
    return
  }

  let payload: ParsedModelPayload
  try {
    payload = parseModelPayloadBase(req.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求参数无效。'
    res.status(400).json({ error: message })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
modelsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(MODELS_TABLE)})
providerIdText = ${toDosStringLiteral(providerId)}
modelIdText = ${toDosStringLiteral(modelId)}
providerCount = exec count(*) from providersTable where string(providerId) = providerIdText
if(providerCount <= 0){
    throw "提供商不存在。"
}
existingCount = exec count(*) from modelsTable where string(providerId) = providerIdText and string(modelId) = modelIdText
if(existingCount <= 0){
    throw "模型不存在。"
}
update modelsTable set
    modelName = ${toDosStringLiteral(payload.modelName)},
    modelCode = ${toDosStringLiteral(modelId)},
    contextWindow = ${payload.contextWindow},
    supportTool = ${payload.supportTool ? 'true' : 'false'},
    temperature = ${payload.temperature},
    topP = ${payload.topP},
    maxTokens = ${payload.maxTokens},
    extraConfig = ${toDosStringLiteral(payload.extraConfig)},
    isEnabled = ${payload.isEnabled ? 'true' : 'false'},
    updateTime = now()
where string(providerId) = providerIdText and string(modelId) = modelIdText
`)
    })

    let model: ModelRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      model = await getModelById(ddb, providerId, modelId)
    })

    if (!model) {
      res.status(404).json({ error: '模型不存在。' })
      return
    }

    res.json({
      ok: true,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新模型失败。'
    const statusCode = message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/:providerId/models/:modelId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  const modelId = req.params.modelId?.trim() || ''
  if (!providerId || !modelId) {
    res.status(400).json({ error: '提供商标识和模型标识不能为空。' })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
modelsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(MODELS_TABLE)})
providerIdText = ${toDosStringLiteral(providerId)}
modelIdText = ${toDosStringLiteral(modelId)}
providerCount = exec count(*) from providersTable where string(providerId) = providerIdText
if(providerCount <= 0){
    throw "提供商不存在。"
}
existingCount = exec count(*) from modelsTable where string(providerId) = providerIdText and string(modelId) = modelIdText
if(existingCount <= 0){
    throw "模型不存在。"
}
deletedDefaultCount = exec count(*) from modelsTable where string(providerId) = providerIdText and string(modelId) = modelIdText and isDefault = true
delete from modelsTable where string(providerId) = providerIdText and string(modelId) = modelIdText
if(deletedDefaultCount > 0){
    remainingCount = exec count(*) from modelsTable where string(providerId) = providerIdText
    if(remainingCount <= 0){
        update providersTable set defaultModelId = "", updateTime = now() where string(providerId) = providerIdText
    } else {
        nextModel = select top 1 string(modelId) as modelId from modelsTable where string(providerId) = providerIdText order by updateTime desc, createTime desc
        nextModelId = nextModel.modelId[0]
        update modelsTable set isDefault = false where string(providerId) = providerIdText
        update modelsTable set isDefault = true where string(providerId) = providerIdText and string(modelId) = nextModelId
        update providersTable set defaultModelId = nextModelId, updateTime = now() where string(providerId) = providerIdText
    }
}
`)
    })

    res.json({
      ok: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除模型失败。'
    const statusCode = message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.post('/:providerId/models/:modelId/default', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const providerId = req.params.providerId?.trim() || ''
  const modelId = req.params.modelId?.trim() || ''
  if (!providerId || !modelId) {
    res.status(400).json({ error: '提供商标识和模型标识不能为空。' })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
providersTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(PROVIDERS_TABLE)})
modelsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(MODELS_TABLE)})
providerIdText = ${toDosStringLiteral(providerId)}
modelIdText = ${toDosStringLiteral(modelId)}
providerCount = exec count(*) from providersTable where string(providerId) = providerIdText
if(providerCount <= 0){
    throw "提供商不存在。"
}
existingCount = exec count(*) from modelsTable where string(providerId) = providerIdText and string(modelId) = modelIdText
if(existingCount <= 0){
    throw "模型不存在。"
}
update modelsTable set isDefault = false where string(providerId) = providerIdText
update modelsTable set isDefault = true where string(providerId) = providerIdText and string(modelId) = modelIdText
update providersTable set defaultModelId = modelIdText, updateTime = now() where string(providerId) = providerIdText
`)
    })

    let model: ModelRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      model = await getModelById(ddb, providerId, modelId)
    })

    if (!model) {
      res.status(404).json({ error: '模型不存在。' })
      return
    }

    res.json({
      ok: true,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '设置默认模型失败。'
    const statusCode = message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

export default router
