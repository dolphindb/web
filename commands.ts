// 用法: node.exe commands.ts dev 或 build 或 test

import type { Context } from 'koa'

import {
    ramdisk, noprint, fdclear, Remote, set_inspect_options, fdelete, fread, crc32, fexists, fwrite,
    fappend
} from 'xshell'
import { Git, type GitVersionInfo } from 'xshell/git.js'
import { Server } from 'xshell/server.js'
import { setup_vscode_settings, process_stdin } from 'xshell/development.js'
import { build_htmls, copy_assets, rolldown, type HtmlConfig, type HtmlsConfig } from 'xshell/builder.js'


set_inspect_options()

/** LOCAL: 启用后在项目中使用本地 javascript-api 中的 browser.ts，修改后刷新 web 自动生效，调试非常方便
    (仅这个文件，不包括 browser.ts 中用相对路径导入的间接依赖，间接依赖需要手动编译为 .js 才生效)   
    修改 fp_api 的值后需要重启 devserver */
// const fp_api = ''
// const fp_api = 'D:/2/ddb/api/js/browser.ts'


const fpd_root = import.meta.dirname.fpd

const fpd_out = `${fpd_root}out/`

const fpdt_cache = `${fpd_root}node_modules/.cache/`

const prefix_version = '--version='

const analyze = process.argv.includes('--analyze')
// const analyze = true


async function main () {
    await fdelete(`${fpd_root}web/`, noprint)
    
    switch (process.argv[2]) {
        case 'build':
            await build_web(
                true,
                true,
                process.argv
                    .find(arg => arg.startsWith(prefix_version))
                    ?.strip_start(prefix_version))
            
            break
        
        case 'dev':
            await dev()
            
            break
            
        case 'preview':
            await dev(true)
            
            break
    }
}


async function dev (preview = false) {
    console.log('项目根目录:', fpd_root)
    
    await setup_vscode_settings(fpd_root)
    
    
    async function stop () {
        if (preview)
            return
        
        remote?.disconnect()
    }
    
    
    async function recompile () {
        if (preview) {
            console.log('预览模式跳过编译，仅刷新')
            return
        }
        
        await build_web(false, false)
        console.log(info)
    }
    
    
    class DevServer extends Server {
        override async router (ctx: Context) {
            let { request, response } = ctx
            
            const { path } = request
            
            if (path === '/favicon.ico' || path === '/vendors/monaco-editor/min-maps/vs/loader.js.map') {
                response.status = 404
                return true
            }
            
            if (path === '/api/recompile') {
                response.status = 200
                
                await recompile()
                
                return true
            }
            
            if (path === '/api/exit') {
                response.status = 200
                
                setTimeout(async () => {
                    await stop()
                    
                    process.exit()
                }, 200)
                
                return true
            }
            
            return this.try_send(
                ctx, 
                path.fext ? path.slice(1) : 'index.html', 
                { fpd_root: fpd_out })
        }
    }
    
    
    let server = new DevServer({
        name: 'web 开发服务器',
        http: true,
        http_port: 8432
    })
    
    
    await Promise.all([
        server.start(),
        !preview && build_web(false, true)
    ])
    
    
    process_stdin(
        async key => {
            switch (key) {
                case 'r':
                    try {
                        await recompile()
                    } catch (error) {
                        console.log(error)
                        console.log('重新编译失败，请尝试按 x 退出后再启动')
                    }
                    break
                    
                case 'x':
                    await stop()
                    process.exit()
                    
                case 'i':
                    console.log(info)
                    break
            }
        },
        stop)
    
    const url = 'http://localhost:8432/'
    
    const info = `${url}\n`.blue.underline
    
    const name = `${preview ? '预览' : '开发'}服务器`
    
    console.log(
        '\n' +
        `${name}启动成功，请使用浏览器打开:\n`.green +
        info +
        '终端快捷键:\n' +
        (preview ? '' : 'r: 重新编译\n') +
        'i: 打印地址信息\n' +
        `x: 退出${name}\n`)
    
    
    let remote: Remote
    
    if (ramdisk) {
        if (preview)
            return
        
        remote = new Remote({
            url: 'ws://localhost',
            
            args: ['ddb.web'],
            
            funcs: {
                async recompile () {
                    await recompile()
                },
                
                async exit () {
                    await stop()
                    process.exit()
                }
            }
        })
        
        await remote.connect()
    } else
        await (await import('open'))
            .default(url)
}


let git: Git

let info: GitVersionInfo


async function build_web (production: boolean, full: boolean, version_name?: string) {
    if (full) {
        console.log(`开始构建${production ? '生产' : '开发'}模式的 web`)
        await fdclear(fpd_out)
        
        git = new Git(fpd_root)
        
        info = await git.get_version_info(version_name)
    }
    
    const dependencies: HtmlConfig['dependencies'] =
        ['antd', 'lodash', 'xterm', 'gridstack', 'echarts', 'quill', 'vscode-oniguruma', 'monaco', 'plotly']
    
    
    // --- 根据 {production}, package.json, deps.ts 缓存 deps.{hash[8]}.js
    const hash = crc32(
        (production ? 'production' : 'dev') + '\n' +
        (await Promise.all(
            ['package.json', 'src/deps.ts'].map(fp =>
                fread(fpd_root + fp, noprint)))
        ).join(''))
    
    const deps = `deps.${hash}.js`
    const fpt_deps = fpdt_cache + deps
    
    if (fexists(fpt_deps, noprint))
        console.log(`deps.js 使用已有缓存 ${deps}`)
    else
        await rolldown(
            'web',
            fpd_root,
            fpdt_cache,
            { [deps]: 'src/deps.ts' },
            {
                production,
                analyze,
                globals: {
                    react: 'React',
                    'react/jsx-runtime': 'ReactJSX',
                    'react-dom': 'ReactDOM',
                    'react-dom/client': 'ReactDOMClient',
                    
                    antd: 'antd',
                    lodash: '_',
                    'lodash-es': '_'
                }
            })
    
    const htmls: HtmlsConfig = {
        'index.html': {
            title: 'DolphinDB',
            dependencies: ['antd', 'xterm', 'lodash', 'echarts', 'gridstack'],
            scripts: {
                before: [{
                    // 前面构建出来的 deps.js 缓存
                    src: fpt_deps,
                    out: 'deps.js'
                }]
            }
        },
        
        'window.html': {
            title: 'DdbObj',
            entry: 'window.js',
            dependencies: ['antd', 'lodash', 'echarts']
        }
    }
    
    
    await Promise.all([
        ... Object.entries({
            'index.js': 'src/index.tsx',
            'window.js': 'src/window.tsx'
        }).map(async ([out, src]) => {
            const index = out === 'index.js'
            
            await rolldown(
                'web',
                fpd_root,
                fpd_out,
                { [out]: src },
                {
                    analyze: analyze && index,
                    assets: true,
                    styles: true,
                    production,
                    defines: index ? {
                        WEB_VERSION: `${info.version} (${info.time} ${info.hash})`.quote(),
                        PRODUCTION: production ? 'true' : 'false'
                    } : undefined,
                    globals: {
                        react: 'React',
                        'react/jsx-runtime': 'ReactJSX',
                        'react-dom': 'ReactDOM',
                        'react-dom/client': 'ReactDOMClient',
                        
                        antd: 'antd',
                        
                        lodash: '_',
                        'lodash-es': '_',
                        
                        echarts: 'echarts',
                        
                        // import { GridStack } from 'gridstack'
                        // 实际上 GridStack 直接暴露在了 window 上，而不是 window.GridStack.GridStack
                        gridstack: 'window',
                        
                        '@xterm/xterm': 'window',
                        
                        // 在 .js 中手动加载脚本
                        // 取 window.ReactQuill 作为 import 的返回值
                        'react-quill': 'window',
                        'react-quill-new': 'window',
                        
                        'plotly.js-dist-min': 'Plotly',
                        
                        // deps.ts 已经预打包了
                        '@ant-design/pro-components': 'AntdPro',
                        'react-router': 'ReactRouter',
                        '@xyflow/react': 'xyflow',
                        '@xterm/addon-webgl': 'XtermWebgl'
                    },
                    plugins: index ? [{
                        name: 'fix-error',
                        
                        generateBundle (options, bundle) {
                            let index_js = bundle['index.js'] as { code: string }
                            let index_css = bundle['index.css'] as { source: string }
                            index_js.code = index_js.code.replace('	IconProvider = Context.Provider;\n', '')
                            index_css.source = index_css.source
                                .replace('/*# sourceMappingURL=quill.snow.css.map*/\n', '')
                                .replace('/*# sourceMappingURL=quill.core.css.map*/\n', '')
                        }
                    }] : undefined
                })
        }),
        
        full && (async () => {
            await copy_assets(
                fpd_root,
                fpd_out,
                production,
                dependencies,
                htmls,
                {
                    productions: [
                        ... [
                            'overview/online.png', 'overview/offline.png',
                            'overview/icons/controller-background.svg',
                            'overview/icons/data-background.svg',
                            'overview/icons/computing-background.svg'
                        ].map(fp =>
                            ({ src: `src/${fp}`, out: fp })),
                        
                        'README.md', 'README.zh.md', 'LICENSE.txt',
                        
                        ... ['zh', 'en'].map(language =>
                            ({
                                src: `node_modules/dolphindb/docs.${language}.json`,
                                out: `docs.${language}.json`
                            }))
                    ]
                })
            
            // fix react-quill.js 缺少 globalThis 导出的问题，也不想自己构建一份
            await fappend(
                fpd_out + 'vendors/react-quill-new/dist/react-quill.js',
                'globalThis.ReactQuill = ReactQuill\n',
                noprint)
        })(),
        
        full && build_htmls(fpd_out, production, htmls, { template: true }),
        
        full && production && fwrite(`${fpd_out}version.json`, info, noprint)
    ])
}


await main()
