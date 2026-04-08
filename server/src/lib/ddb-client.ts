import util from 'node:util'

let patched = false
let ddbModulePromise: Promise<typeof import('dolphindb')> | null = null

const applyNodeStyleTextPatch = () => {
  if (patched) {
    return
  }

  const original = util.styleText as (...args: any[]) => string
  util.styleText = ((format: string | string[], text: unknown, options?: unknown) => {
    const safeText = typeof text === 'string' ? text : String(text)
    return original(format, safeText, options)
  }) as typeof util.styleText

  patched = true
}

const loadDdbModule = async () => {
  applyNodeStyleTextPatch()

  if (!ddbModulePromise) {
    ddbModulePromise = import('dolphindb')
  }

  return ddbModulePromise
}

const getDdbCtor = async () => {
  const mod = await loadDdbModule()
  return mod.DDB
}

export {
  getDdbCtor,
}
