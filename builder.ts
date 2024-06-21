import { fcopy, fequals, ramdisk, fwrite, noprint, flist } from 'xshell'
import { Git } from 'xshell/git.js'
import { Bundler } from 'xshell/builder.js'


/** LOCAL: 启用后在项目中使用本地 javascript-api 中的 browser.ts，修改后刷新 web 自动生效，调试非常方便
    (仅这个文件，不包括 browser.ts 中用相对路径导入的间接依赖，间接依赖需要手动编译为 .js 才生效)   
    修改 fp_api 的值后需要重启 devserver */
const fp_api = ''
// const fp_api = 'D:/2/ddb/api/js/browser.ts'


export const fpd_root = import.meta.dirname.fpd

const ci = process.argv.includes('--ci')

const fpd_ramdisk_root = 'T:/2/ddb/web/'

export const fpd_out = `${!ci && ramdisk ? fpd_ramdisk_root : fpd_root}web/`

const fpd_pre_bundle = `${fpd_root}pre-bundle/`


export let builder = {
    bundler: null as Bundler,
    
    
    pre_bundle_entries: ['formily', 'antd-pro-components'],
    
    
    async build (production: boolean, version_name?: string) {
        console.log(`开始构建${production ? '生产' : '开发'}模式的 web`)
        
        let git = new Git(fpd_root)
        
        let info = await git.get_version_info(version_name)
        
        const source_map = !production
        
        // 和 build_bundles 中的保持一致
        const fpd_pre_bundle_dist = `${ ramdisk ? `${fpd_ramdisk_root}pre-bundle/` : `${fpd_pre_bundle}dist/` }${ production ? 'production' : 'dev' }/`
        
        this.bundler ??= new Bundler(
            'web',
            'web',
            fpd_root,
            fpd_out,
            !ci && ramdisk ? `${fpd_ramdisk_root}webpack/` : undefined,
            {
                'index.js': './console/index.tsx',
                'window.js': './console/window.tsx'
            },
            {
                source_map,
                external_dayjs: true,
                externals: {
                    // 使用官方的 node_modules/@ant-design/pro-components/dist/pro-components.min.js 会有样式问题
                    '@ant-design/pro-components': ['module ./pre-bundle/antd-pro-components.js', 'ProComponents'],
                    
                    // import { GridStack } from 'gridstack'
                    // 实际上 GridStack 直接暴露在了 window 上，而不是 window.GridStack.GridStack
                    gridstack: 'window',
                    
                    // await import('react-quill') 时，会先通过在 head 中增加 <script> 标签的方式加载脚本，
                    // 之后取 window.ReactQuill 作为 import 的返回值
                    'react-quill': ['script ./vendors/react-quill/dist/react-quill.js', 'ReactQuill'],
                    
                    '@formily/core': ['module ./pre-bundle/formily.js', 'Core'],
                    '@formily/react': ['module ./pre-bundle/formily.js', 'React'],
                    '@formily/antd-v5': ['module ./pre-bundle/formily.js', 'AntdV5'],
                },
                resolve_alias: fp_api ? { 'dolphindb/browser.js': fp_api } : { },
                globals: {
                    WEB_VERSION: `${info.version} (${info.time} ${info.hash})`.quote(),
                },
                cache_version: fp_api ? 'web.api' : 'web',
                license: {
                    ignores: ['dolphindb-web']
                },
                dependencies: ['antd-icons', 'antd-plots', 'lodash', 'xterm', 'gridstack', 'echarts'],
                htmls: {
                    'index.html': {
                        title: 'DolphinDB',
                        icon: {
                            src: 'src/ico/logo.png',
                            out: 'ico/logo.png'
                        },
                        mscripts: this.pre_bundle_entries.map(entry => ({
                            src: `${fpd_pre_bundle_dist}${entry}.js`, 
                            out: `pre-bundle/${entry}.js`
                        })),
                        dependencies: ['antd-icons', 'antd-plots', 'xterm', 'lodash', 'echarts', 'gridstack'],
                    },
                    
                    'window.html': {
                        title: 'DdbObj',
                        icon: {
                            src: 'src/ico/logo.png',
                            out: 'ico/logo.png'
                        },
                        fp_entry: './window.js',
                        dependencies: ['antd-icons', 'antd-plots', 'lodash'],
                    }
                },
                
                assets: {
                    productions: [
                        ... [
                            'ddb.svg',
                            'overview/online.png', 'overview/offline.png',
                            'overview/icons/controller-background.svg',
                            'overview/icons/data-background.svg',
                            'overview/icons/computing-background.svg',
                        ].map(fp => 
                            ({ src: `console/${fp}`, out: fp })),
                        
                        'README.md', 'README.zh.md', 'LICENSE.txt',
                        
                        ... ['zh', 'en'].map(language => 
                            ({ src: `node_modules/dolphindb/docs.${language}.json`, out: `docs.${language}.json` })),
                        
                        // ... (await flist(`${fpd_root}src/`, noprint))
                        //         .map(fp => ({ src: `src/${fp}`, out: fp })),
                        
                        ... source_map ? this.pre_bundle_entries.map(entry => ({
                            src: `${fpd_pre_bundle_dist}${entry}.js.map`, 
                            out: `pre-bundle/${entry}.js.map`
                        })) : [ ],
                    ]
                }
            }
        )
        
        await this.bundler.build_all()
        
        await fwrite(`${fpd_out}version.json`, info, noprint)
    },
    
    
    /** 将 pre-bundle/entries/{entry}.ts 打包到 {fpd_pre_bundle_dist}{entry}.js */
    async build_bundles (production?: boolean) {
        const fp_project_package_json = `${fpd_root}package.json`
        const fpd_pre_bundle_dist = `${ ramdisk ? `${fpd_ramdisk_root}pre-bundle/` : `${fpd_pre_bundle}dist/` }${ production ? 'production' : 'dev' }/`
        const fp_cache_package_json = `${fpd_pre_bundle_dist}package.json`
        
        // pre-bundle/entries 中的文件内容改了之后需要禁用这个缓存逻辑（一般不会改）
        if (await fequals(fp_project_package_json, fp_cache_package_json, noprint))  // 已有 pre-bundle 缓存
            this.pre_bundle_entries.forEach(entry => {
                console.log(`${entry} 已有预打包文件`)
            })
        else {
            await Promise.all(
                this.pre_bundle_entries.map(async entry => {
                    let bundler = new Bundler(
                        entry,
                        'web',
                        fpd_root,
                        fpd_pre_bundle_dist,
                        `${fpd_ramdisk_root}webpack/`,
                        { [`${entry}.js`]: `./pre-bundle/entries/${entry}.ts` },
                        {
                            external_dayjs: true,
                        }
                    )
                    
                    await bundler.build_all_and_close()
                })
            )
            
            await fcopy(fp_project_package_json, fp_cache_package_json, noprint)
        }
    },
    
    
    async run () {
        await this.bundler.build()
    },
    
    
    async close () {
        await this.bundler.close()
    }
}
