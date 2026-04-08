import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { WebSocketServer, WebSocket } from 'ws'
import loginRouter from './routes/login.js'
import healthzRouter from './routes/healthz.js'
import skillsRouter from './routes/skills.js'
import providersRouter from './routes/providers.js'
import chatsRouter from './routes/chats.js'
import workspacesRouter from './routes/workspaces.js'
import stepsRouter from './routes/steps.js'
import vfsRouter from './routes/vfs.js'
import { requireDdbAuth } from './middleware/ddb-auth.js'
import { ddbConnectionPool } from './lib/ddb-connection-pool.js'
import { BackgroundAgent } from './BackgroundAgent.js'
import { parseDdbAuthorization } from './lib/ddb-auth.js'
import { getChatTaskSeedById } from './db.js'
import type { DdbAuth } from './lib/ddb-auth.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3012
const host = process.env.HOST || '0.0.0.0'

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(process.cwd(), 'dist')))

app.use('/api/login', loginRouter)
app.use('/api/healthz', requireDdbAuth, healthzRouter)
app.use('/api/skills', requireDdbAuth, skillsRouter)
app.use('/api/providers', requireDdbAuth, providersRouter)
app.use('/api/chats', requireDdbAuth, chatsRouter)
app.use('/api/workspaces', requireDdbAuth, workspacesRouter)
app.use('/api/steps', requireDdbAuth, stepsRouter)
app.use('/api/vfs', requireDdbAuth, vfsRouter)

const server = app.listen(Number(port), host, () => {
  console.log(`Express server listening at http://${host}:${port}`)
})

// Initialize WebSocket server
const wss = new WebSocketServer({ server })
const agent = BackgroundAgent.getInstance()
const wsSubscriptions = new WeakMap<WebSocket, string>()

type SubmitPayload = {
  type: 'submit'
  chatId: string
  content: string
  authorization?: string
}

type SubscribePayload = {
  type: 'subscribe'
  chatId: string
  authorization?: string
}

type WsInboundPayload = SubmitPayload | SubscribePayload

const sendJson = (ws: WebSocket, payload: unknown): void => {
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(JSON.stringify(payload))
}

const ensureTaskInitialized = async (chatId: string, authorization?: string): Promise<boolean> => {
  if (agent.getTask(chatId)) {
    return true
  }

  if (!authorization?.trim()) {
    return false
  }

  let auth: DdbAuth
  try {
    auth = parseDdbAuthorization(authorization)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Invalid WS authorization for chat ${chatId}: ${message}`)
    return false
  }

  try {
    const taskSeed = await getChatTaskSeedById(auth, chatId)
    if (!taskSeed) {
      return false
    }

    if (agent.getTask(chatId)) {
      return true
    }

    agent.startTask({
      ...taskSeed,
      authHeader: authorization || taskSeed.authHeader || '',
      auth,
    }, {
      runImmediately: false,
    })
    return true
  } catch (error) {
    console.error(`Failed to restore chat task for ${chatId}:`, error)
    return false
  }
}

const subscribeChat = async (ws: WebSocket, chatId: string, authorization?: string): Promise<void> => {
  wsSubscriptions.set(ws, chatId)
  await ensureTaskInitialized(chatId, authorization)
  const snapshot = agent.getRuntimeSnapshot(chatId)
  sendJson(ws, { type: 'state_snapshot', chatId, snapshot })
}

const broadcastToChatSubscribers = (chatId: string, payload: unknown): void => {
  wss.clients.forEach(client => {
    if (wsSubscriptions.get(client) !== chatId) {
      return
    }
    sendJson(client, payload)
  })
}

const broadcastToAllClients = (payload: unknown): void => {
  wss.clients.forEach(client => {
    sendJson(client, payload)
  })
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected via WebSocket')

  ws.on('message', async (message: import('ws').RawData) => {
    try {
      const data = JSON.parse(message.toString('utf8')) as Partial<WsInboundPayload>
      if (data.type === 'subscribe' && typeof data.chatId === 'string' && data.chatId.trim()) {
        await subscribeChat(ws, data.chatId, data.authorization)
        return
      }

      if (data.type === 'submit' && typeof data.chatId === 'string' && typeof data.content === 'string' && data.content.trim()) {
        if (wsSubscriptions.get(ws) !== data.chatId) {
          await subscribeChat(ws, data.chatId, data.authorization)
        }

        const taskReady = await ensureTaskInitialized(data.chatId, data.authorization)
        if (!taskReady) {
          sendJson(ws, { type: 'buffer_updated', chatId: data.chatId, buffer: [] })
          sendJson(ws, {
            type: 'status',
            chatId: data.chatId,
            status: {
              status: 'error',
              message: '会话任务恢复失败，请刷新页面后重试。',
              timestamp: Date.now(),
            },
          })
          return
        }

        agent.submitInput(data.chatId, data.content)
        agent.run(data.chatId).catch(err => console.error(err))
      }
    } catch (e) {
      console.error('Failed to parse WS message:', e)
    }
  })

  ws.on('close', () => {
    wsSubscriptions.delete(ws)
  })
})

// Listen to agent events and broadcast to subscribers of the specific chat
agent.events.on('message', (chatId, message) => {
  broadcastToChatSubscribers(chatId, { type: 'message', chatId, message })
})

agent.events.on('message_stream', (chatId, message) => {
  broadcastToChatSubscribers(chatId, { type: 'message_stream', chatId, message })
})

agent.events.on('message_stream_end', (chatId, payload) => {
  broadcastToChatSubscribers(chatId, { type: 'message_stream_end', chatId, ...payload })
})

agent.events.on('buffer_updated', (chatId, buffer) => {
  broadcastToChatSubscribers(chatId, { type: 'buffer_updated', chatId, buffer })
})

agent.events.on('status', (chatId, status) => {
  broadcastToChatSubscribers(chatId, { type: 'status', chatId, status })
})

agent.events.on('chat_updated', (chat) => {
  broadcastToAllClients({ type: 'chat_updated', chat })
})

agent.events.on('steps_updated', (chatId) => {
  broadcastToChatSubscribers(chatId, { type: 'steps_updated', chatId })
})

let shuttingDown = false
const shutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true

  console.log(`Received ${signal}. Closing server...`)
  wss.close()
  server.close(async () => {
    await ddbConnectionPool.closeAll()
    process.exit(0)
  })
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
