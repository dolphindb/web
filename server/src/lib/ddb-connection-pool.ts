import type { DdbAuth } from './ddb-auth.js'
import type { DDB } from 'dolphindb'
import { getDdbCtor } from './ddb-client.js'

type DdbConnection = DDB

type PoolEntry = {
  id: number
  key: string
  connection: DdbConnection
  inUse: boolean
  connected: boolean
  lastUsedAt: number
}

type DdbConnectionPoolStatus = {
  capacity: number
  size: number
  inUse: number
  idle: number
  keys: string[]
}

class AsyncMutex {
  private locked = false
  private waiters: Array<() => void> = []

  async lock(): Promise<() => void> {
    await new Promise<void>((resolve) => {
      if (!this.locked) {
        this.locked = true
        resolve()
        return
      }

      this.waiters.push(resolve)
    })

    let released = false
    return () => {
      if (released) {
        return
      }
      released = true

      const next = this.waiters.shift()
      if (next) {
        next()
        return
      }

      this.locked = false
    }
  }
}

class DdbConnectionLease {
  private released = false

  constructor(
    public readonly ddb: DdbConnection,
    public readonly pooled: boolean,
    private readonly releaseFn: () => Promise<void>,
  ) {}

  async release(): Promise<void> {
    if (this.released) {
      return
    }

    this.released = true
    await this.releaseFn()
  }
}

class DdbConnectionPool {
  private readonly capacity: number
  private readonly entries: PoolEntry[] = []
  private nextEntryId = 1
  private readonly mutex = new AsyncMutex()

  constructor(capacity = 5) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('Connection pool capacity must be a positive integer.')
    }
    this.capacity = capacity
  }

  async get(auth: DdbAuth): Promise<DdbConnectionLease> {
    const key = this.buildKey(auth)
    const now = Date.now()

    let selectedEntry: PoolEntry | null = null
    let evictedEntry: PoolEntry | null = null
    let shouldCreateTransient = false

    const unlock = await this.mutex.lock()
    try {
      const reusable = this.findIdleEntryByKey(key)
      if (reusable) {
        reusable.inUse = true
        reusable.lastUsedAt = now
        selectedEntry = reusable
      } else {
        if (this.entries.length < this.capacity) {
          selectedEntry = {
            id: this.nextEntryId++,
            key,
            connection: await this.createConnection(auth),
            inUse: true,
            connected: false,
            lastUsedAt: now,
          }
          this.entries.push(selectedEntry)
        } else {
          const lruIdleEntry = this.findLeastRecentlyUsedIdleEntry()
          if (!lruIdleEntry) {
            shouldCreateTransient = true
          } else {
            this.removeEntryById(lruIdleEntry.id)
            evictedEntry = lruIdleEntry

            selectedEntry = {
              id: this.nextEntryId++,
              key,
              connection: await this.createConnection(auth),
              inUse: true,
              connected: false,
              lastUsedAt: now,
            }
            this.entries.push(selectedEntry)
          }
        }
      }
    } catch (error) {
      if (evictedEntry) {
        this.safeDisconnect(evictedEntry.connection)
      }
      throw error
    } finally {
      unlock()
    }

    if (evictedEntry) {
      this.safeDisconnect(evictedEntry.connection)
    }

    if (shouldCreateTransient || !selectedEntry) {
      const transient = await this.createConnection(auth)
      try {
        await transient.connect()
      } catch (error) {
        this.safeDisconnect(transient)
        throw error
      }

      return new DdbConnectionLease(transient, false, async () => {
        this.safeDisconnect(transient)
      })
    }

    try {
      if (!selectedEntry.connected) {
        await selectedEntry.connection.connect()
        selectedEntry.connected = true
      }
    } catch (error) {
      await this.removeEntry(selectedEntry)
      throw error
    }

    return new DdbConnectionLease(selectedEntry.connection, true, async () => {
      await this.releaseEntry(selectedEntry!)
    })
  }

  async status(): Promise<DdbConnectionPoolStatus> {
    const unlock = await this.mutex.lock()
    try {
      const values = [...this.entries]
      const inUse = values.filter((entry) => entry.inUse).length
      return {
        capacity: this.capacity,
        size: values.length,
        inUse,
        idle: values.length - inUse,
        keys: values.map((entry) => entry.key),
      }
    } finally {
      unlock()
    }
  }

  async closeAll(): Promise<void> {
    let snapshot: PoolEntry[] = []

    const unlock = await this.mutex.lock()
    try {
      snapshot = [...this.entries]
      this.entries.length = 0
    } finally {
      unlock()
    }

    for (const entry of snapshot) {
      this.safeDisconnect(entry.connection)
    }
  }

  private buildKey(auth: DdbAuth): string {
    return `${auth.wsUrl}@${auth.ticket}`
  }

  private async createConnection(auth: DdbAuth): Promise<DdbConnection> {
    const DDB = await getDdbCtor()
    return new DDB(auth.wsUrl, {
      autologin: true,
      ticket: auth.ticket,
    }) as DdbConnection
  }

  private findIdleEntryByKey(key: string): PoolEntry | null {
    let candidate: PoolEntry | null = null

    for (const entry of this.entries) {
      if (entry.key !== key || entry.inUse) {
        continue
      }

      if (!candidate || entry.lastUsedAt > candidate.lastUsedAt) {
        candidate = entry
      }
    }

    return candidate
  }

  private findLeastRecentlyUsedIdleEntry(): PoolEntry | null {
    let candidate: PoolEntry | null = null

    for (const entry of this.entries) {
      if (entry.inUse) {
        continue
      }

      if (!candidate || entry.lastUsedAt < candidate.lastUsedAt) {
        candidate = entry
      }
    }

    return candidate
  }

  private removeEntryById(id: number): void {
    const index = this.entries.findIndex((entry) => entry.id === id)
    if (index >= 0) {
      this.entries.splice(index, 1)
    }
  }

  private async releaseEntry(entry: PoolEntry): Promise<void> {
    const unlock = await this.mutex.lock()
    try {
      const current = this.entries.find((item) => item.id === entry.id)
      if (!current || current !== entry) {
        this.safeDisconnect(entry.connection)
        return
      }

      current.inUse = false
      current.lastUsedAt = Date.now()
    } finally {
      unlock()
    }
  }

  private async removeEntry(entry: PoolEntry): Promise<void> {
    const unlock = await this.mutex.lock()
    try {
      const current = this.entries.find((item) => item.id === entry.id)
      if (current && current === entry) {
        this.removeEntryById(entry.id)
      }
    } finally {
      unlock()
    }

    this.safeDisconnect(entry.connection)
  }

  private safeDisconnect(connection: DdbConnection): void {
    try {
      connection.disconnect()
    } catch {
      // ignore disconnect errors during cleanup
    }
  }
}

const ddbConnectionPool = new DdbConnectionPool(5)

export type {
  DdbConnection,
  DdbConnectionPoolStatus,
}

export {
  DdbConnectionLease,
  DdbConnectionPool,
  ddbConnectionPool,
}
