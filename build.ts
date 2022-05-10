#!/usr/bin/env node

import { fcopy, fdelete } from 'xshell'

import { fpd_root, fpd_out_console, fpd_out_cloud, fpd_src_console, fpd_src_cloud } from './config.js'
import { get_docs, get_monaco, webpack } from './webpack.js'


if (process.argv.includes('cloud')) {
    await fdelete(fpd_out_cloud)
    
    await Promise.all([
        ... ['index.html', 'cloud.svg', 'ddb.png'].map(async fname => 
            fcopy(fpd_src_cloud + fname, fpd_out_cloud + fname)),
        fcopy(`${fpd_root}fonts/`, `${fpd_out_cloud}fonts/`),
        webpack.build(true)
    ])
} else {
    await fdelete(fpd_out_console)
    
    await Promise.all([
        fcopy(`${fpd_root}src/`, fpd_out_console),
        ... ['index.html', 'window.html', 'ddb.svg'].map(async fname => 
            fcopy(fpd_src_console + fname, fpd_out_console + fname)),
        fcopy(`${fpd_root}fonts/`, `${fpd_out_console}fonts/`),
        get_monaco(),
        (async () => {
            await get_docs()
            return webpack.build(false)
        })()
    ])
}
