import { fcopy, fequals } from 'xshell'

import { default as Webpack, type Stats } from 'webpack'

// 需要分析 bundle 大小时开启
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

import { get_base_config, fpd_out_console, fpd_ramdisk_root, fpd_root, ramdisk, ci } from '../webpack.js'

export const fpd_pre_bundle = `${fpd_root}pre-bundle/`

export const fpd_pre_bundle_dist = ramdisk ? `${fpd_ramdisk_root}pre-bundle/` : `${fpd_pre_bundle}dist/`


interface IOptions {
    entry: string
    production: boolean
}


/** 将 pre-bundle/entries/{entry}.ts 打包到 {fpd_pre_bundle_dist}{entry}.js */
export async function build_bundle ({ entry, production }: IOptions) {
    const fp_project_package_json = `${fpd_root}package.json`
    const fp_cache_package_json = `${fpd_pre_bundle_dist}${entry}.package.json`
    
    async function fcopy_dist_to_out () {
        await fcopy(`${fpd_pre_bundle_dist}${entry}.js`, `${fpd_out_console}pre-bundle/${entry}.js`, { print: false })
    }
    
    // pre-bundle/entries 中的文件内容改了之后需要禁用这个缓存逻辑（一般不会改）
    if (await fequals(fp_project_package_json, fp_cache_package_json, { print: false })) {  // 已有 pre-bundle 缓存
        console.log(`${entry} 已有预打包文件`)
        await fcopy_dist_to_out()
    } else {
        const base_config = get_base_config(production)
        
        const compiler = Webpack({
            ... base_config,
            
            name: entry,
            
            entry: `${fpd_pre_bundle}entries/${entry}.ts`,
            
            output: {
                path: fpd_pre_bundle_dist,
                filename: `${entry}.js`,
                publicPath: '/',
                globalObject: 'globalThis',
                module: true,
                library: {
                    type: 'module'
                }
            },
            
            externalsType: 'global',
            
            externals: {
                react: 'React',
                'react-dom': 'ReactDOM',
                lodash: '_',
                antd: 'antd',
                dayjs: 'dayjs',
                '@ant-design/icons': 'icons',
            },
            
            resolve: {
                symlinks: true,
            },
            
            cache: {
                type: 'filesystem',
                
                ... !ci && ramdisk ? {
                    cacheDirectory: `${fpd_ramdisk_root}webpack/`,
                    compression: false
                } : {
                    compression: ci ? false : 'brotli',
                }
            },
            
            // ... entry === 'antd-pro-components' ? {
            //     plugins: [
            //         // 需要分析 bundle 大小时开启
            //         new BundleAnalyzerPlugin({ analyzerPort: 8880, openAnalyzer: false }),
            //     ]
            // } : { }
        })
        
        await new Promise<Stats>((resolve, reject) => {
            compiler.run((error, stats) => {
                if (stats)
                    console.log(
                        stats.toString(base_config.stats)
                            .replace(new RegExp(`\\n\\s*.*${entry}.* compiled .*successfully.* in (.*)`), `\n${entry} 预打包成功，用时 $1`.green)
                    )
                
                if (error)
                    reject(error)
                else if (stats.hasErrors())
                    reject(new Error('编译失败'))
                else
                    resolve(stats)
            })
        })
        
        
        await Promise.all([
            new Promise(resolve => {
                compiler.close(resolve)
            }),
            
            fcopy(fp_project_package_json, fp_cache_package_json, { print: false }),
            
            fcopy_dist_to_out()
        ])
    }
}
