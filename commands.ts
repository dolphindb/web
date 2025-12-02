// 用法: node.exe commands.ts dev 或 build 或 test

import type { Context } from 'koa'

import { ramdisk, fwrite, noprint, fdclear, Remote, set_inspect_options, fdelete } from 'xshell'
import { Git } from 'xshell/git.js'
import { Bundler, type BundlerOptions } from 'xshell/builder.js'
import { Server } from 'xshell/server.js'
import { setup_vscode_settings, process_stdin } from 'xshell/development.js'


set_inspect_options()

/** LOCAL: 启用后在项目中使用本地 javascript-api 中的 browser.ts，修改后刷新 web 自动生效，调试非常方便
    (仅这个文件，不包括 browser.ts 中用相对路径导入的间接依赖，间接依赖需要手动编译为 .js 才生效)   
    修改 fp_api 的值后需要重启 devserver */
const fp_api = ''
// const fp_api = 'D:/2/ddb/api/js/browser.ts'


const fpd_root = import.meta.dirname.fpd

const fpd_out = `${fpd_root}out/`

const prefix_version = '--version='


async function main () {
    await fdelete(`${fpd_root}web/`, noprint)
    
    switch (process.argv[2]) {
        case 'build':
            await builder.build_and_close(
                true, 
                process.argv
                    .find(arg => arg.startsWith(prefix_version))
                    ?.strip_start(prefix_version))
            
            break
            
        case 'dev':
            await dev()
            
            break
    }
}


async function dev () {
    console.log('项目根目录:', fpd_root)
    
    await setup_vscode_settings(fpd_root)
    
    
    async function stop () {
        await builder.close()
        remote?.disconnect()
    }
    
    
    async function recompile () {
        await builder.run()
        console.log(info)
    }
    
    
    class DevServer extends Server {
        override async router (ctx: Context) {
            let { request, response } = ctx
            
            const { path } = request
            
            if (path === '/favicon.ico') {
                response.status = 404
                return true
            }
            
            if (path === '/api/recompile') {
                response.status = 200
                await recompile()
                return true
            }
            
            return this.try_send(
                ctx, 
                path.fext ? path.slice(1) : 'index.html', 
                { fpd_root: fpd_out }
            )
        }
    }
    
    
    let server = new DevServer({
        name: 'web 开发服务器',
        http: true,
        http_port: 8432
    })
    
    
    await Promise.all([
        server.start(),
        builder.build(false)
    ])
    
    
    process_stdin(
        async (key) => {
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
        stop
    )
    
    const url = `http://localhost:8432/`
    
    const info = `${url}\n`.blue.underline
    
    console.log(
        '\n' +
        `开发服务器启动成功，请使用浏览器打开:\n`.green +
        info +
        '终端快捷键:\n' +
        'r: 重新编译\n' +
        'i: 打印地址信息\n' +
        'x: 退出开发服务器\n')
    
    
    let remote: Remote
    
    if (ramdisk) {
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
    } else {
        const { default: open } = await import('open')
        await open(url)
    }
}


let builder = {
    deps_bundler: null as Bundler,
    
    bundler: null as Bundler,
    
    
    async build (production: boolean, version_name?: string) {
        console.log(`开始构建${production ? '生产' : '开发'}模式的 web`)
        
        await fdclear(fpd_out)
        
        let git = new Git(fpd_root)
        
        let info = await git.get_version_info(version_name)
        
        const source_map = !production || version_name === 'dev'
        
        const fpdt_cache = `${fpd_root}node_modules/.cache/webpack/`
        
        const dependencies: BundlerOptions['dependencies'] = ['react', 'lodash', 'xterm', 'gridstack', 'echarts', 'quill', 'vscode-oniguruma', 'monaco']
        
        
        // --- 根据 package.json, deps.ts 缓存 deps.js
        // const deps_src = ['package.json', 'src/deps.ts']
        // 
        // if ((
        //     await Promise.all(deps_src.map(fp => 
        //         fequals(`${fpd_root}${fp}`, `${fpdt_cache}${fp.fname}`, noprint)
        //     ))).every(Boolean)
        // )
        //     console.log('deps.js 使用已缓存的版本')
        // else
        //     this.deps_bundler = new Bundler(
        //         'deps', 
        //         'web',
        //         fpd_root,
        //         fpdt_cache,
        //         fpdt_cache,
        //         { 'deps.js': './src/deps.ts' },
        //         {
        //             source_map: true,
        //             external_dayjs: true,
        //             production,
        //             dependencies,
        //             expose: true
        //         }
        //     )
        
        
        this.bundler = new Bundler(
            'web',
            'web',
            fpd_root,
            fpd_out,
            fpdt_cache,
            {
                'index.js': './src/index.tsx',
                'window.js': './src/window.tsx'
            },
            {
                source_map,
                external_dayjs: false,
                production,
                externals: {
                    // 使用官方的 node_modules/@ant-design/pro-components/dist/pro-components.min.js 会有样式问题
                    // '@ant-design/pro-components': 'AntdProComponents',
                    
                    // import { GridStack } from 'gridstack'
                    // 实际上 GridStack 直接暴露在了 window 上，而不是 window.GridStack.GridStack
                    gridstack: 'window',
                    
                    // 在 .js 中手动加载脚本
                    // 取 window.ReactQuill 作为 import 的返回值
                    'react-quill': 'ReactQuill',
                    
                    antd: null,
                    
                    '@ant-design/icons': null,
                    '@ant-design/plots': null,
                },
                resolve_alias: {
                    '@': `${fpd_root}src`,
                    '@test': `${fpd_root}test`,
                    '@i18n': `${fpd_root}i18n/index.ts`,
                    '@model': `${fpd_root}src/model.ts`,
                    '@utils': `${fpd_root}src/utils.ts`,
                    '@theme': `${fpd_root}src/theme.ts`,
                    '@components': `${fpd_root}src/components`,
                    ... fp_api ? { 'dolphindb/browser.js': fp_api } : { },
                },
                globals: {
                    WEB_VERSION: `${info.version} (${info.time} ${info.hash})`.quote(),
                    PRODUCTION: production ? 'true' : 'false'
                },
                cache_version: fp_api ? 'web.api' : 'web',
                license: production,
                dependencies,
                htmls: {
                    'index.html': {
                        title: 'DolphinDB',
                        // scripts: {
                        //     before: [{
                        //         // deps_bundler 构建出来的 deps.js 缓存
                        //         src: `${fpdt_cache}deps.js`,
                        //         out: 'deps.js'
                        //     }]
                        // },
                        dependencies: ['react', 'xterm', 'lodash', 'echarts', 'gridstack'],
                    },
                    
                    'window.html': {
                        title: 'DdbObj',
                        entry: 'window.js',
                        dependencies: ['react', 'lodash', 'echarts'],
                    }
                },
                
                template: production,
                
                assets: {
                    productions: [
                        ... [
                            'overview/online.png', 'overview/offline.png',
                            'overview/icons/controller-background.svg',
                            'overview/icons/data-background.svg',
                            'overview/icons/computing-background.svg',
                        ].map(fp => 
                            ({ src: `src/${fp}`, out: fp })),
                        
                        'README.md', 'README.zh.md', 'LICENSE.txt',
                        
                        ... ['zh', 'en'].map(language => 
                            ({ src: `node_modules/dolphindb/docs.${language}.json`, out: `docs.${language}.json` })),
                        
                        ... source_map ? [{
                            src: `${fpdt_cache}deps.js.map`,
                            out: 'deps.js.map'
                        }] : [ ],
                    ]
                }
            }
        )
        
        // this.bundler 依赖 deps_bundler 生成的文件
        // await this.deps_bundler?.build()
        
        await Promise.all([
            // this.deps_bundler?.close(),
            // // 缓存依赖
            // this.deps_bundler && Promise.all(
            //     deps_src.map(fp => 
            //         fcopy(`${fpd_root}${fp}`, `${fpdt_cache}${fp.fname}`, noprint))),
            this.bundler.build_all(),
            fwrite(`${fpd_out}version.json`, info, noprint)
        ])
    },
    
    
    async build_and_close (production: boolean, version_name?: string) {
        await this.build(production, version_name)
        await this.close()
    },
    
    
    async run () {
        await this.bundler.build()
    },
    
    
    async close () {
        await this.bundler.close()
    }
}

await main()
