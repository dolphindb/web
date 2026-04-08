import { Router, type Router as ExpressRouter, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import type { DdbAuth } from '../lib/ddb-auth.js'
import { ddbConnectionPool } from '../lib/ddb-connection-pool.js'
import { getRequiredDdbAuth } from '../middleware/ddb-auth.js'

type SkillRecord = {
  skillId: string
  skillName: string
  description: string
  script: string
  createTime: string
  updateTime: string
  isEnabled: boolean
}

type SkillTableResult = {
  data?: Array<Record<string, unknown>>
}

type ParsedSkillPayload = {
  skillName: string
  description: string
  script: string
  isEnabled: boolean
}

type DdbExecutor = {
  execute: <TResult = unknown>(script: string, options?: any) => Promise<TResult>
}

const router: ExpressRouter = Router()

const DB_PATH = 'dfs://chat_dolphindb'
const SKILLS_TABLE = 'skills'

const toDosStringLiteral = (value: string): string => {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`
}

const normalizeSkill = (row: Record<string, unknown>): SkillRecord => {
  const toText = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value))
  const toBool = (value: unknown): boolean => {
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'number') {
      return value !== 0
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1'
    }
    return false
  }

  return {
    skillId: toText(row.skillId).trim(),
    skillName: toText(row.skillName),
    description: toText(row.description),
    script: toText(row.script),
    createTime: toText(row.createTime),
    updateTime: toText(row.updateTime),
    isEnabled: toBool(row.isEnabled),
  }
}

const extractSkillRows = (result: unknown): SkillRecord[] => {
  if (!result || typeof result !== 'object' || !Array.isArray((result as SkillTableResult).data)) {
    return []
  }

  return (result as SkillTableResult).data!.map((row) => normalizeSkill(row))
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

const parseIsEnabled = (value: unknown): boolean => {
  if (value == null) {
    return true
  }

  if (typeof value !== 'boolean') {
    throw new Error('启用状态必须是布尔值。')
  }

  return value
}

const parseSkillPayload = (payload: unknown): ParsedSkillPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('请求体不能为空。')
  }

  const body = payload as Record<string, unknown>
  return {
    skillName: parseRequiredString(body.skillName, '技能名称'),
    description: parseOptionalString(body.description, '描述'),
    script: parseOptionalString(body.script, '详细描述'),
    isEnabled: parseIsEnabled(body.isEnabled),
  }
}

const buildSelectSkillsScript = (skillId?: string): string => {
  const whereClause = skillId ? ` where string(skillId) = ${toDosStringLiteral(skillId)}` : ''

  return `
skillsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(SKILLS_TABLE)})
select
  string(skillId) as skillId,
  skillName,
  description,
  string(script) as script,
  string(createTime) as createTime,
  string(updateTime) as updateTime,
  isEnabled
from skillsTable${whereClause}
order by updateTime desc, createTime desc
`
}

const getSkillById = async (ddb: DdbExecutor, skillId: string): Promise<SkillRecord | null> => {
  const result = await ddb.execute(buildSelectSkillsScript(skillId), {
    table: 'full',
    blob: 'string',
  })
  const rows = extractSkillRows(result)
  return rows.length > 0 ? rows[0] : null
}

const getAllSkills = async (ddb: DdbExecutor): Promise<SkillRecord[]> => {
  const result = await ddb.execute(buildSelectSkillsScript(), {
    table: 'full',
    blob: 'string',
  })
  return extractSkillRows(result)
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
    let skills: SkillRecord[] = []
    await executeWithDdb(auth, async (ddb) => {
      skills = await getAllSkills(ddb)
    })

    res.json({
      ok: true,
      skills,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询技能列表失败。'
    res.status(500).json({ error: message })
  }
})

router.get('/:skillId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const skillId = req.params.skillId?.trim() || ''
  if (!skillId) {
    res.status(400).json({ error: '技能标识不能为空。' })
    return
  }

  try {
    let skill: SkillRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      skill = await getSkillById(ddb, skillId)
    })

    if (!skill) {
      res.status(404).json({ error: '技能不存在。' })
      return
    }

    res.json({
      ok: true,
      skill,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询技能详情失败。'
    res.status(500).json({ error: message })
  }
})

router.post('/', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  let payload: ParsedSkillPayload
  const skillId = randomUUID()
  try {
    payload = parseSkillPayload(req.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求参数无效。'
    res.status(400).json({ error: message })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
skillsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(SKILLS_TABLE)})
skillIdText = ${toDosStringLiteral(skillId)}
existingCount = exec count(*) from skillsTable where string(skillId) = skillIdText
if(existingCount > 0){
    throw "技能已存在。"
}
nowTs = now()
newRow = table(
    symbol([skillIdText]) as skillId,
    [${toDosStringLiteral(payload.skillName)}] as skillName,
    [${toDosStringLiteral(payload.description)}] as description,
    [blob(${toDosStringLiteral(payload.script)})] as script,
    [nowTs] as createTime,
    [nowTs] as updateTime,
    [${payload.isEnabled ? 'true' : 'false'}] as isEnabled
)
skillsTable.append!(newRow)
`)
    })

    let skill: SkillRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      skill = await getSkillById(ddb, skillId)
    })

    if (!skill) {
      res.status(500).json({ error: '技能已创建，但获取详情失败。' })
      return
    }

    res.status(201).json({
      ok: true,
      skill,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建技能失败。'
    const statusCode = message.includes('已存在') ? 409 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.put('/:skillId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const skillId = req.params.skillId?.trim() || ''
  if (!skillId) {
    res.status(400).json({ error: '技能标识不能为空。' })
    return
  }

  let payload: ParsedSkillPayload
  try {
    payload = parseSkillPayload(req.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求参数无效。'
    res.status(400).json({ error: message })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
skillsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(SKILLS_TABLE)})
skillIdText = ${toDosStringLiteral(skillId)}
existingCount = exec count(*) from skillsTable where string(skillId) = skillIdText
if(existingCount <= 0){
    throw "技能不存在。"
}
update skillsTable set
    skillName = ${toDosStringLiteral(payload.skillName)},
    description = ${toDosStringLiteral(payload.description)},
    script = blob(${toDosStringLiteral(payload.script)}),
    updateTime = now(),
    isEnabled = ${payload.isEnabled ? 'true' : 'false'}
where string(skillId) = skillIdText
`)
    })

    let skill: SkillRecord | null = null
    await executeWithDdb(auth, async (ddb) => {
      skill = await getSkillById(ddb, skillId)
    })

    if (!skill) {
      res.status(404).json({ error: '技能不存在。' })
      return
    }

    res.json({
      ok: true,
      skill,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新技能失败。'
    const statusCode = message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/:skillId', async (req, res) => {
  const auth = getRequestAuthOrFail(req, res)
  if (!auth) {
    return
  }

  const skillId = req.params.skillId?.trim() || ''
  if (!skillId) {
    res.status(400).json({ error: '技能标识不能为空。' })
    return
  }

  try {
    await executeWithDdb(auth, async (ddb) => {
      await ddb.execute(`
skillsTable = loadTable(${toDosStringLiteral(DB_PATH)}, ${toDosStringLiteral(SKILLS_TABLE)})
skillIdText = ${toDosStringLiteral(skillId)}
existingCount = exec count(*) from skillsTable where string(skillId) = skillIdText
if(existingCount <= 0){
    throw "技能不存在。"
}
delete from skillsTable where string(skillId) = skillIdText
`)
    })

    res.json({
      ok: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除技能失败。'
    const statusCode = message.includes('不存在') ? 404 : 500
    res.status(statusCode).json({ error: message })
  }
})

export default router
