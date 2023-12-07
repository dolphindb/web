import { default as Webpack, type Stats } from 'webpack'

import { get_base_config, fpd_out_console, fpd_ramdisk_root, fpd_root, ramdisk, ci } from '../webpack.js'

export const fpd_pre_bundle = `${fpd_root}pre-bundle/`

export const fpd_pre_bundle_entries = `${fpd_pre_bundle}entries/`
export const fpd_pre_bundle_dist = ramdisk ? `${fpd_out_console}pre-bundle/` : `${fpd_pre_bundle}dist/`


interface IOptions {
    entry: string
    production: boolean
}


/** 将 pre-bundle/entries/{entry}.ts 打包到 pre-bundle/dist/{entry}.js */
export async function build_bundle ({ entry, production }: IOptions) {
    const base_config = get_base_config(production)
    
    const compiler = Webpack({
        ... base_config,
        
        name: entry,
        
        entry: `${fpd_pre_bundle_entries}${entry}.ts`,
        
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
        }
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
    
    await new Promise(resolve => {
        compiler.close(resolve)
    })
}
