import { Router, type Router as ExpressRouter } from 'express'
import { loadInitScript } from '../ddb_scripts/init-script.js'
import type { DdbAuth } from '../lib/ddb-auth.js'
import { ddbConnectionPool } from '../lib/ddb-connection-pool.js'
import { getRequiredDdbAuth } from '../middleware/ddb-auth.js'

const router: ExpressRouter = Router()

router.get('/', async (req, res) => {
  let auth: DdbAuth
  try {
    auth = getRequiredDdbAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : '缺少 Authorization 上下文。'
    res.status(500).json({ error: message })
    return
  }

  let lease: Awaited<ReturnType<typeof ddbConnectionPool.get>> | null = null

  try {
    lease = await ddbConnectionPool.get(auth)
    const initScript = await loadInitScript()
    const result = await lease.ddb.execute<Record<string, unknown>>(initScript)

    res.json({
      ok: true,
      url: auth.endpoint,
      result,
    })
  } catch (error) {
    console.error('Health check failed:', error)
    const message = error instanceof Error ? error.message : '健康检查失败。'
    res.status(503).json({ error: message })
  } finally {
    if (lease) {
      await lease.release()
    }
  }
})

export default router
