#!/usr/bin/env node

import process from 'process'

import { fcopy, fdelete } from 'xshell'

import { get_monaco, webpack, copy_fonts, fpd_root, fpd_out_console, fpd_out_cloud, fpd_src_console, fpd_src_cloud } from './webpack.js'


if (process.argv.includes('cloud')) {
    await fdelete(fpd_out_cloud)
    
    await Promise.all([
        ... ['index.html', 'cloud.svg', 'ddb.png'].map(async fname => 
            fcopy(fpd_src_cloud + fname, fpd_out_cloud + fname)),
        copy_fonts(true),
        webpack.build(true)
    ])
} else {
    await fdelete(fpd_out_console)
    
    await Promise.all([
        fcopy(`${fpd_root}src/`, fpd_out_console),
        ... ['index.html', 'window.html', 'ddb.svg'].map(async fname => 
            fcopy(fpd_src_console + fname, fpd_out_console + fname)),
        copy_fonts(false),
        get_monaco(),
        webpack.build(false)
    ])
}
