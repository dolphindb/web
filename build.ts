#!/usr/bin/env node

import process from 'process'

import { fcopy, fdelete, fmkdir } from 'xshell'

import { get_monaco, webpack, copy_fonts, fpd_root, fpd_out_console, fpd_out_cloud, fpd_src_console, fpd_src_cloud } from './webpack.js'


if (process.argv.includes('cloud')) {
    await fdelete(fpd_out_cloud)
    await fmkdir(fpd_out_cloud)
    
    await Promise.all([
        ... ['index.html', 'cloud.svg', 'ddb.png'].map(async fname => 
            fcopy(fpd_src_cloud + fname, fpd_out_cloud + fname)),
        
        fcopy(`${fpd_root}README.md`, `${fpd_out_cloud}README.md`),
        fcopy(`${fpd_root}README.zh.md`, `${fpd_out_cloud}README.zh.md`),
        
        copy_fonts(true),
        webpack.build(true)
    ])
} else {
    await fdelete(fpd_out_console)
    await fmkdir(fpd_out_console)
    
    await Promise.all([
        fcopy(`${fpd_root}src/`, fpd_out_console),
        
        ... ['index.html', 'window.html', 'ddb.svg'].map(async fname => 
            fcopy(fpd_src_console + fname, fpd_out_console + fname)),
        
        fcopy(`${fpd_root}README.md`, `${fpd_out_console}README.md`),
        fcopy(`${fpd_root}README.zh.md`, `${fpd_out_console}README.zh.md`),
        
        fcopy(`${fpd_root}node_modules/vscode-oniguruma/release/onig.wasm`, `${fpd_out_console}onig.wasm`),
        
        copy_fonts(false),
        get_monaco(),
        webpack.build(false)
    ])
}
