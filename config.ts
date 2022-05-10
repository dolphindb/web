import { fileURLToPath } from 'url'
import path from 'upath'

export const fpd_root = `${path.dirname(fileURLToPath(import.meta.url))}/`

export const fpd_src_console = `${fpd_root}console/`
export const fpd_src_cloud = `${fpd_root}cloud/`

export const fpd_out_console = `${fpd_root}web/`
export const fpd_out_cloud = `${fpd_root}web.cloud/`
