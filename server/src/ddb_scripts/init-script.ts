import path from 'path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'url'

let cachedScript: string | null = null

const sourceScriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'ddb_scripts', 'init.dos')

const loadInitScript = async (): Promise<string> => {
  if (cachedScript) {
    return cachedScript
  }

  cachedScript = (await readFile(sourceScriptPath, 'utf8')).replaceAll('\r\n', '\n')
  return cachedScript
}

export {
  loadInitScript,
}
