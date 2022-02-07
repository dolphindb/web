#!/usr/bin/env node

import { mkdir } from 'fs/promises'

import xsh from 'xshell'

import { webpack } from './webpack.js'
import { fp_root, fpd_out_console, fpd_out_cloud, fpd_src_console, fpd_src_cloud, libs } from './config.js'


const { fcopy, fdelete, request, fwrite } = xsh

const is_cloud = process.argv.includes('cloud')


if (is_cloud) {
    await fdelete(fpd_out_cloud)
    
    await mkdir(fpd_out_cloud, { recursive: true })
    
    await Promise.all([
        get_libs(fpd_out_cloud),
        fcopy(`${fpd_src_cloud}index.html`, `${fpd_out_cloud}index.html`, { overwrite: true }),
        fcopy(`${fpd_src_cloud}cloud.svg`, `${fpd_out_cloud}cloud.svg`, { overwrite: true }),
        fcopy(`${fpd_src_cloud}ddb.png`, `${fpd_out_cloud}ddb.png`, { overwrite: true }),
        fcopy(`${fp_root}fonts/`, `${fpd_out_cloud}fonts/`),
    ])
} else {
    await fdelete(fpd_out_console)
    await fcopy(`${fp_root}src/`, fpd_out_console, { overwrite: true })
    
    await Promise.all([
        get_libs(fpd_out_console),
        fcopy(`${fpd_src_console}index.html`, `${fpd_out_console}index.html`, { overwrite: true }),
        fcopy(`${fpd_src_console}ddb.svg`, `${fpd_out_console}ddb.svg`, { overwrite: true }),
        fcopy(`${fp_root}fonts/`, `${fpd_out_console}fonts/`),
    ])
}

async function get_libs (fpd: string) {
    await Promise.all(
        Object.entries(libs)
            .map(async ([name, fp]) => {
                await fwrite(
                    `${fpd}${name}`,
                    await request(`https://cdn.jsdelivr.net/npm/${fp}`, { retries: 5 })
                )
            }
        )
    )
}

await webpack.build(is_cloud)
