import { Router, type Router as ExpressRouter } from 'express'
import { normalizeEndpoint, type EndpointInfo } from '../lib/ddb-auth.js'
import { getDdbCtor } from '../lib/ddb-client.js'

const router: ExpressRouter = Router()

router.post('/', async (req, res) => {
  const { username, password, url } = req.body ?? {}

  if (typeof username !== 'string' || !username.trim()) {
    res.status(400).json({ error: '用户名不能为空。' })
    return
  }

  if (typeof password !== 'string' || !password.trim()) {
    res.status(400).json({ error: '密码不能为空。' })
    return
  }

  if (typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: '地址不能为空。' })
    return
  }

  let endpointInfo: EndpointInfo
  try {
    endpointInfo = normalizeEndpoint(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : '地址无效。'
    res.status(400).json({ error: message })
    return
  }

  const DDB = await getDdbCtor()
  const ddb = new DDB(endpointInfo.wsUrl, {
    autologin: true,
    username: username.trim(),
    password: password.trim(),
  })

  try {
    await ddb.connect()

    const getTicket = async () => {
      try {
        return String(
          await ddb.invoke('getAuthenticatedUserTicket', undefined, { urgent: true }),
        ).trim()
      } catch {
        const controllerAlias = String(
          await ddb.invoke('getControllerAlias', undefined, { urgent: true }),
        ).trim()

        return String(
          await ddb.invoke('getAuthenticatedUserTicket', undefined, {
            urgent: true,
            node: controllerAlias,
          }),
        ).trim()
      }
    }

    const ticket = await getTicket()

    if (!ticket) {
      res.status(500).json({ error: '生成用户票据失败。' })
      return
    }

    res.json({
      auth: `${ticket}@${endpointInfo.endpoint}`,
      ticket,
      url: endpointInfo.endpoint,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败。'
    res.status(401).json({ error: message })
  } finally {
    ddb.disconnect()
  }
})

export default router
