import { fileURLToPath } from 'url'
import path from 'upath'

export const fp_root = `${path.dirname(fileURLToPath(import.meta.url))}/`

export const fpd_src_console = `${fp_root}console/`
export const fpd_src_cloud = `${fp_root}cloud/`

export const fpd_out_console = `${fp_root}web/`
export const fpd_out_cloud = `${fp_root}web.cloud/`
