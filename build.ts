#!/usr/bin/env node

import xsh from 'xshell'

import { webpack } from './webpack.js'
import { fp_root, fpd_out_console, fpd_out_cloud, fpd_src_console, fpd_src_cloud } from './config.js'

const { fcopy, fdelete } = xsh

const is_cloud = process.argv.includes('cloud')

if (is_cloud) {
    await fdelete(fpd_out_cloud)
    await fcopy(`${fp_root}src/third-party/react/`, fpd_out_cloud, { overwrite: true })
    await fcopy(`${fpd_src_cloud}index.html`, `${fpd_out_cloud}index.html`, { overwrite: true })
} else {
    await fdelete(fpd_out_console)
    await fcopy(`${fp_root}src/`, fpd_out_console, { overwrite: true })
    await fcopy(`${fpd_src_console}index.html`, `${fpd_out_console}index.html`, { overwrite: true })
}

await webpack.build(is_cloud)
