#!/usr/bin/env node

import process from 'process'

import { fcopy, fdelete, fmkdir } from 'xshell'

import { webpack, fpd_root, fpd_out_console, fpd_out_cloud, fpd_src_console, fpd_src_cloud, fpd_node_modules } from './webpack.js'
import { build_bundle, fpd_pre_bundle_dist } from './pre-bundle/index.js'


const verbose = false

if (process.argv.includes('cloud')) {
    await fdelete(fpd_out_cloud)
    await fmkdir(fpd_out_cloud)
    
    await Promise.all([
        ... ['index.html', 'cloud.svg', 'ddb.png'].map(async fname => 
            fcopy(fpd_src_cloud + fname, fpd_out_cloud + fname)),
        
        ... ['README.md', 'README.zh.md', 'LICENSE.txt'].map(async fname => 
            fcopy(fpd_root + fname, fpd_out_cloud + fname)),
        
        ... ['ddb.svg'].map(async fname =>
            fcopy(fpd_src_console + fname, fpd_out_cloud + fname)),
        
        copy_vendors(fpd_out_cloud, false, true),
        
        webpack.build({ production: true, is_cloud: true })
    ])
} else {
    await fdelete(fpd_out_console)
    await fmkdir(fpd_out_console)
    
    await Promise.all([
        fcopy(`${fpd_root}src/`, fpd_out_console, { print: verbose }),
        
        ... [
            'index.html', 'window.html', 'ddb.svg',
            'overview/online.png', 'overview/offline.png',
            'overview/icons/controller-background.svg',
            'overview/icons/data-background.svg',
            'overview/icons/computing-background.svg',
        ].map(async fname => 
            fcopy(fpd_src_console + fname, fpd_out_console + fname, { print: verbose })),
        
        ... ['README.md', 'README.zh.md', 'LICENSE.txt'].map(async fname => 
            fcopy(fpd_root + fname, fpd_out_console + fname, { print: verbose })),
        
        copy_vendors(fpd_out_console, true, true),
        
        ... ['zh', 'en'].map(async language =>
            fcopy(`${fpd_node_modules}dolphindb/docs.${language}.json`, `${fpd_out_console}docs.${language}.json`, { print: verbose })
        ),
        
        (async () => {
            await build_bundle({ entry: 'formily', production: true })
            
            await copy_pre_bundle(fpd_out_console)
        })(),
        
        webpack.build({ production: true, is_cloud: false })
    ])
}

await webpack.close()


async function copy_vendors (fpd_out: string, monaco: boolean, production: boolean) {
    const fpd_vendors = `${fpd_out}vendors/`
    const fpd_monaco = `${fpd_out}vs/`
    const fpd_monaco_maps = `${fpd_out}min-maps/vs/`
    
    
    await fmkdir(fpd_vendors, { print: verbose })
    
    if (monaco)
        await fmkdir(fpd_monaco, { print: verbose })
    
    await Promise.all([
        ... [
            'vscode-oniguruma/release/onig.wasm',
            
            'react/umd/react.production.min.js',
            
            'react-dom/umd/react-dom.production.min.js',
            
            'dayjs/dayjs.min.js',
            
            'lodash/lodash.min.js',
            
            'xterm/lib/xterm.js',
            'xterm/lib/xterm.js.map',
            
            'antd/dist/antd.min.js',
            'antd/dist/antd.min.js.map',
            
            '@ant-design/icons/dist/index.umd.min.js',
            
            '@ant-design/plots/dist/plots.min.js',
            '@ant-design/plots/dist/plots.min.js.map',
            '@ant-design/pro-components/dist/pro-components.min.js',
            '@ant-design/pro-components/dist/pro-components.min.js.map',
            
            'echarts/dist/echarts.js',
            
            'gridstack/dist/gridstack-all.js',
            'gridstack/dist/gridstack-all.js.map',
            
            'react-quill/dist/react-quill.js',
        ].filter(fp => !production || !fp.endsWith('.map'))
        .map(async fp =>
            fcopy(`${fpd_node_modules}${fp}`, `${fpd_vendors}${fp}`, { print: verbose })
        ),
        
        ... monaco ?
            [
                'loader.js',
                'loader.js.map',
                'editor/editor.main.js',
                'editor/editor.main.js.map',
                'editor/editor.main.css',
                'editor/editor.main.nls.js',
                'editor/editor.main.nls.js.map',
                'editor/editor.main.nls.zh-cn.js',
                'editor/editor.main.nls.zh-cn.js.map',
                'base/common/worker/simpleWorker.nls.js',
                'base/common/worker/simpleWorker.nls.js.map',
                'base/worker/workerMain.js',
                'base/worker/workerMain.js.map',
                'base/browser/ui/codicons/codicon/codicon.ttf',
            ].filter(fp => !production || !fp.endsWith('.map'))
            .map(async fp =>
                fcopy(
                    `${fpd_node_modules}monaco-editor/${ fp.endsWith('.map') ? 'min-maps' : 'min' }/vs/${fp}`,
                    `${ fp.endsWith('.map') ? fpd_monaco_maps : fpd_monaco }${fp}`,
                    { print: verbose }
                )
            )
        :
            [ ]
    ])
}


async function copy_pre_bundle (fpd_out: string) {
    const fpd_pre_bundle_out = `${fpd_out}pre-bundle/`
    if (fpd_pre_bundle_out !== fpd_pre_bundle_dist)
        await fcopy(fpd_pre_bundle_dist, fpd_pre_bundle_out, { print: verbose })
}
