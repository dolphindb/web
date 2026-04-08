import type { DdbAuth } from '../lib/ddb-auth.js'

declare global {
  namespace Express {
    interface Request {
      ddbAuth?: DdbAuth
    }
  }
}

export {}
