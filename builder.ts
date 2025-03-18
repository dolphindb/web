import { ramdisk, fwrite, noprint, fequals, fcopy, fdclear } from 'xshell'
import { Git } from 'xshell/git.js'
import { Bundler, type BundlerOptions } from 'xshell/builder.js'


/** LOCAL: 启用后在项目中使用本地 javascript-api 中的 browser.ts，修改后刷新 web 自动生效，调试非常方便
    (仅这个文件，不包括 browser.ts 中用相对路径导入的间接依赖，间接依赖需要手动编译为 .js 才生效)   
    修改 fp_api 的值后需要重启 devserver */
const fp_api = ''
// const fp_api = 'D:/2/ddb/api/js/browser.ts'


export const fpd_root = import.meta.dirname.fpd

const ci = process.argv.includes('--ci')

const fpd_ramdisk_root = 'T:/2/ddb/web/'

const external = !ci && ramdisk

export const fpd_out = `${ external ? fpd_ramdisk_root : fpd_root }web/`


export let builder = {
    deps_bundler: null as Bundler,
    
    bundler: null as Bundler,
    
    
    async build (production: boolean, version_name?: string) {
        console.log(`开始构建${production ? '生产' : '开发'}模式的 web`)
        
        await fdclear(fpd_out)
        
        let git = new Git(fpd_root)
        
        let info = await git.get_version_info(version_name)
        
        const source_map = !production || version_name === 'dev'
        
        const fpd_cache = external ? `${fpd_ramdisk_root}webpack/` : `${fpd_root}node_modules/.cache/webpack/`
        
        const dependencies: BundlerOptions['dependencies'] = ['antd-icons', 'lodash', 'xterm', 'gridstack', 'echarts', 'quill', 'vscode-oniguruma', 'monaco']
        
        
        // --- 根据 package.json, deps.ts 缓存 deps.js
        const deps_src = ['package.json', 'src/deps.ts']
        
        if ((
            await Promise.all(deps_src.map(async fp => 
                fequals(`${fpd_root}${fp}`, `${fpd_cache}${fp.fname}`, { print: false })
            ))).every(Boolean)
        )
            console.log('deps.js 使用已缓存的版本')
        else
            this.deps_bundler = new Bundler(
                'deps', 
                'web',
                fpd_root,
                fpd_cache,
                fpd_cache,
                { 'deps.js': './src/deps.ts' },
                {
                    source_map: true,
                    external_dayjs: true,
                    production,
                    dependencies,
                    expose: true
                }
            )
        
        
        this.bundler = new Bundler(
            'web',
            'web',
            fpd_root,
            fpd_out,
            external ? `${fpd_ramdisk_root}webpack/` : undefined,
            {
                'index.js': './src/index.tsx',
                'window.js': './src/window.tsx'
            },
            {
                source_map,
                external_dayjs: true,
                production,
                externals: {
                    // 使用官方的 node_modules/@ant-design/pro-components/dist/pro-components.min.js 会有样式问题
                    '@ant-design/pro-components': 'AntdProComponents',
                    
                    // import { GridStack } from 'gridstack'
                    // 实际上 GridStack 直接暴露在了 window 上，而不是 window.GridStack.GridStack
                    gridstack: 'window',
                    
                    // 在 .js 中手动加载脚本
                    // 取 window.ReactQuill 作为 import 的返回值
                    'react-quill': 'ReactQuill',
                },
                resolve_alias: {
                    '@': `${fpd_root}src`,
                    '@i18n': `${fpd_root}i18n/index.ts`,
                    '@model': `${fpd_root}src/model.ts`,
                    '@utils': `${fpd_root}src/utils.ts`,
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
                        icon: {
                            src: 'src/logo.png',
                            out: 'logo.png'
                        },
                        scripts: {
                            before: [{
                                // deps_bundler 构建出来的 deps.js 缓存
                                src: `${fpd_cache}deps.js`,
                                out: 'deps.js'
                            }]
                        },
                        dependencies: ['antd-icons', 'xterm', 'lodash', 'echarts', 'gridstack'],
                    },
                    
                    'window.html': {
                        title: 'DdbObj',
                        icon: {
                            src: 'src/logo.png',
                            out: 'logo.png'
                        },
                        entry: 'window.js',
                        dependencies: ['antd-icons', 'lodash', 'echarts'],
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
                            src: `${fpd_cache}deps.js.map`,
                            out: 'deps.js.map'
                        }] : [ ],
                    ]
                }
            }
        )
        
        // this.bundler 依赖 deps_bundler 生成的文件
        await this.deps_bundler?.build()
        
        await Promise.all([
            this.deps_bundler?.close(),
            // 缓存依赖
            this.deps_bundler && Promise.all(
                deps_src.map(async fp => 
                    fcopy(`${fpd_root}${fp}`, `${fpd_cache}${fp.fname}`, { print: false }))),
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
