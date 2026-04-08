import type { Request, Response, NextFunction } from 'express'
import { parseDdbAuthorization, type DdbAuth } from '../lib/ddb-auth.js'

const requireDdbAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.ddbAuth = parseDdbAuthorization(req.header('Authorization') || undefined)
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authorization 无效。'
    res.status(401).json({ error: message })
  }
}

const getRequiredDdbAuth = (req: Request): DdbAuth => {
  if (!req.ddbAuth) {
    throw new Error('缺少 Authorization 解析上下文。')
  }
  return req.ddbAuth
}

export {
  requireDdbAuth,
  getRequiredDdbAuth,
}
