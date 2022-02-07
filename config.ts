import { fileURLToPath } from 'url'
import path from 'upath'

export const fp_root = `${path.dirname(fileURLToPath(import.meta.url))}/`

export const fpd_src_console = `${fp_root}console/`
export const fpd_src_cloud = `${fp_root}cloud/`

export const fpd_out_console = `${fp_root}web/`
export const fpd_out_cloud = `${fp_root}web.cloud/`

export const libs = {
    'react.production.min.js': 'react/umd/react.production.min.js',
    'react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js',
    'antd.css': 'antd/dist/antd.css',
    'antd.js': 'antd/dist/antd.js',
} as const
