import { fileURLToPath } from 'url'

import dayjs from 'dayjs'

import { default as Webpack, type Compiler, type Configuration, type Stats } from 'webpack'

// 需要分析 bundle 大小时开启
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

import type { Options as TSLoaderOptions } from 'ts-loader'

import * as sass from 'sass'
import type { Options as SassOptions } from 'sass-loader'

import { fexists, Lock } from 'xshell'


/** LOCAL: 启用后在项目中使用本地 javascript-api 中的 browser.ts，修改后刷新 web 自动生效，调试非常方便
    (仅这个文件，不包括 browser.ts 中用相对路径导入的间接依赖，间接依赖需要手动编译为 .js 才生效)   
    修改 fp_api 的值后需要重启 devserver */
const fp_api = ''
// const fp_api = 'D:/2/ddb/api/js/browser.ts'


export const fpd_root = fileURLToPath(import.meta.url).fdir

export const ramdisk = fexists('T:/TEMP/', { print: false })
export const fpd_ramdisk_root = 'T:/2/ddb/web/'

export const fpd_node_modules = `${fpd_root}node_modules/`

export const fpd_src_console = `${fpd_root}console/`
export const fpd_src_cloud = `${fpd_root}cloud/`

export const fpd_out = ramdisk ? fpd_ramdisk_root : fpd_root
export const fpd_out_console = `${fpd_out}web/`
export const fpd_out_cloud = `${fpd_out}web.cloud/`


export const base_config: Webpack.Configuration = {
    devtool: 'source-map',
    
    experiments: {
        outputModule: true,
    },
    
    target: ['web', 'es2023'],
    
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: 'pre',
                use: ['source-map-loader'],
            },
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'ts-loader',
                // https://github.com/TypeStrong/ts-loader
                options: {
                    configFile: `${fpd_root}tsconfig.json`,
                    onlyCompileBundledFiles: true,
                    transpileOnly: true,
                } as Partial<TSLoaderOptions>
            },
            {
                test: /\.s[ac]ss$/,
                use: [
                    'style-loader',
                    {
                        // https://github.com/webpack-contrib/css-loader
                        loader: 'css-loader',
                        options: {
                            url: false,
                        }
                    },
                    {
                        // https://webpack.js.org/loaders/sass-loader
                        loader: 'sass-loader',
                        options: {
                            implementation: sass,
                            // 解决 url(search.png) 打包出错的问题
                            webpackImporter: false,
                            sassOptions: {
                                indentWidth: 4,
                            },
                        } as SassOptions,
                    }
                ]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                oneOf: [
                    {
                        test: /\.icon\.svg$/,
                        issuer: /\.[jt]sx?$/,
                        loader: '@svgr/webpack',
                        options: { icon: true }
                    },
                    {
                        test: /\.(svg|ico|png|jpe?g|gif|woff2?|ttf|eot|otf|mp4|webm|ogg|mp3|wav|flac|aac)$/,
                        type: 'asset/inline',
                    },
                ]
            },
            {
                test: /\.txt$/,
                type: 'asset/source',
            }
        ],
    },
    
    optimization: {
        minimize: false,
    },
    
    performance: {
        hints: false,
    },
    
    ignoreWarnings: [
        /Failed to parse source map/
    ],
    
    stats: {
        colors: true,
        
        context: fpd_root,
        
        entrypoints: false,
        
        errors: true,
        errorDetails: true,
        
        hash: false,
        
        version: false,
        
        timings: true,
        
        children: false,
        
        assets: true,
        assetsSpace: 20,
        
        modules: false,
        modulesSpace: 20,
        
        cachedAssets: false,
        cachedModules: false,
    },
}


export let webpack = {
    config: null as Configuration,
    
    lcompiler: new Lock<Compiler>(null),
    
    
    async build ({ production, is_cloud }: { production: boolean, is_cloud?: boolean }) {
        await this.lcompiler.request(async () => {
            this.lcompiler.resource = Webpack(this.config = {
                ...base_config,
                
                name: 'web',
                
                mode: production ? 'production' : 'development',
                
                entry: production ?
                    is_cloud ?
                        { 'index.js': './cloud/index.tsx' }
                    :
                        {
                            'index.js': './console/index.tsx',
                            'window.js': './console/window.tsx'
                        }
                :
                    {
                        'web/index.js': './console/index.tsx',
                        'web/window.js': './console/window.tsx',
                        
                        // 目前停止开发了
                        // 'web.cloud/index.js': './cloud/index.tsx'
                    },
                
                
                output: {
                    path: production ?
                            is_cloud ? fpd_out_cloud : fpd_out_console
                        :
                            fpd_out,
                    filename: '[name]',
                    publicPath: '/',
                    pathinfo: true,
                    globalObject: 'globalThis',
                    module: true,
                    library: {
                        type: 'module',
                    }
                },
                
                externalsType: 'global',
                
                // 以 react: 'React', 为例，含义为
                // 取全局变量 window.React 的值作为 import { useState } from 'react' 中 { ... } 这部分的结果，再解构里面的 useState 属性
                externals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    lodash: '_',
                    
                    // import { Terminal } from 'xterm'
                    // 实际上 Terminal 直接暴露在了 window 上，而不是 window.Terminal.Terminal
                    xterm: 'window',
                    
                    antd: 'antd',
                    dayjs: 'dayjs',
                    '@ant-design/icons': 'icons',
                    '@ant-design/plots': 'Plots',
                    echarts: 'echarts',
                    
                    // import { GridStack } from 'gridstack'
                    // 实际上 GridStack 直接暴露在了 window 上，而不是 window.GridStack.GridStack
                    gridstack: 'window',
                    
                    'react-quill': 'ReactQuill',
                    '@formily/core': ['module ./pre-bundle/formily.js', 'Core'],
                    '@formily/react': ['module ./pre-bundle/formily.js', 'React'],
                    '@formily/antd-v5': ['module ./pre-bundle/formily.js', 'AntdV5'],
                },
                
                resolve: {
                    extensions: ['.js'],
                    
                    symlinks: true,
                    
                    extensionAlias: {
                        '.js': ['.js', '.ts', '.tsx']
                    },
                    
                    ... fp_api ? {
                        alias: {
                            'dolphindb/browser.js': 'D:/2/ddb/api/js/browser.ts'
                        },
                    } : { },
                },
                
                plugins: [
                    new Webpack.DefinePlugin({
                        BUILD_TIME: dayjs().format('YYYY.MM.DD HH:mm:ss').quote()
                    }),
                    
                    ... await (async () => {
                        if (production) {
                            const { LicenseWebpackPlugin } = await import('license-webpack-plugin')
                            
                            const ignoreds = new Set([
                                'xshell', 
                                'react-object-model', 
                                '@ant-design/icons-svg', 
                                '@ant-design/pro-layout', 
                                '@ant-design/pro-provider', 
                                'toggle-selection', 
                                'ahooks', 
                                'dolphindb-web', 
                                'size-sensor'
                            ])
                            
                            return [
                                new LicenseWebpackPlugin({
                                    perChunkOutput: false,
                                    outputFilename: 'ThirdPartyNotice.txt',
                                    excludedPackageTest: pkgname => ignoreds.has(pkgname),
                                }) as any
                            ]
                        } else
                            return [ ]
                    })(),
                    
                    // 需要分析 bundle 大小时开启
                    // new BundleAnalyzerPlugin({ analyzerPort: 8880, openAnalyzer: false }),
                ],
                
                cache: {
                    type: 'filesystem',
                    
                    version: is_cloud ? 
                            'cloud'
                        :
                            fp_api ?
                                'web.api'
                            :
                                'web',
                    
                    ... ramdisk ? {
                        cacheDirectory: `${fpd_ramdisk_root}webpack/`,
                        compression: false
                    } : {
                        compression: 'brotli',
                    }
                }
            })
        })
        
        await this.run()
    },
    
    
    watch () {
        this.lcompiler.resource.watch({ }, (error, stats) => {
            if (error)  {
                console.error(error)
                return
            }
            
            if (stats)
                console.log(
                    stats.toString(this.config.stats)
                        .replace(/\n\s*.*web.* compiled .*successfully.* in (.*)/, '\n编译成功，用时 $1'.green)
                )
        })
    },
    
    
    async run () {
        return this.lcompiler.request(async compiler =>
            new Promise<Stats>((resolve, reject) => {
                compiler.run((error, stats) => {
                    if (stats)
                        console.log(
                            stats.toString(this.config.stats)
                                .replace(/\n\s*.*web.* compiled .*successfully.* in (.*)/, '\n编译成功，用时 $1'.green)
                        )
                    
                    if (error)
                        reject(error)
                    else if (stats.hasErrors())
                        reject(new Error('编译失败'))
                    else
                        resolve(stats)
                })
            })
        )
    },
    
    
    async close () {
        await this.lcompiler.request(async compiler =>
            new Promise<void>((resolve, reject) => {
                compiler.close(error => {
                    if (error)
                        reject(error)
                    else
                        resolve()
                })
            })
        )
    }
}
