import { fileURLToPath } from 'url'
import path from 'upath'

export const fp_root = `${path.dirname(fileURLToPath(import.meta.url))}/`

export const fpd_out = `${fp_root}web/`
