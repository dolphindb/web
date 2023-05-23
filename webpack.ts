import { fileURLToPath } from 'url'
import path from 'upath'

import dayjs from 'dayjs'

import { default as Webpack, type Compiler, type Configuration, type Stats } from 'webpack'

// 需要分析 bundle 大小时开启
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

import type { Options as TSLoaderOptions } from 'ts-loader'

import sass from 'sass'
import type { Options as SassOptions } from 'sass-loader'

import { fexists, Lock } from 'xshell'


export const fpd_root = `${path.dirname(fileURLToPath(import.meta.url))}/`

const ramdisk = fexists('t:/TEMP/', { print: false })
const fpd_ramdisk_root = 't:/2/ddb/web/'

export const fpd_node_modules = `${fpd_root}node_modules/`

export const fpd_src_console = `${fpd_root}console/`
export const fpd_src_cloud = `${fpd_root}cloud/`

export const fpd_out = ramdisk ? fpd_ramdisk_root : fpd_root
export const fpd_out_console = `${fpd_out}web/`
export const fpd_out_cloud = `${fpd_out}web.cloud/`


export let webpack = {
    config: null as Configuration,
    
    lcompiler: new Lock<Compiler>(null),
    
    
    async build ({ production, is_cloud }: { production: boolean, is_cloud?: boolean }) {
        await this.lcompiler.request(async () => {
            this.lcompiler.resource = Webpack(this.config = {
                name: 'web',
                
                mode: production ? 'production' : 'development',
                
                devtool: 'source-map',
                
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
                        'web.cloud/index.js': './cloud/index.tsx'
                    },
                
                experiments: {
                    // outputModule: true,
                    topLevelAwait: true,
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
                },
                
                target: ['web', 'es2022'],
                
                externals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    lodash: '_',
                    xterm: 'Terminal',
                    antd: 'antd',
                    dayjs: 'dayjs',
                    '@ant-design/icons': 'icons',
                    '@ant-design/plots': 'Plots',
                    echarts: 'echarts',
                    '@formily/core': 'Formily.Core',
                    '@formily/react': 'Formily.React',
                    '@formily/antd-v5': 'Formily.AntdV5',
                },
                
                resolve: {
                    extensions: ['.js'],
                    
                    symlinks: true,
                    
                    extensionAlias: {
                        '.js': ['.js', '.ts', '.tsx']
                    },
                },
                
                
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
                
                
                plugins: [
                    new Webpack.DefinePlugin({
                        BUILD_TIME: dayjs().format('YYYY.MM.DD HH:mm:ss').quote()
                    }),
                    
                    ... await (async () => {
                        if (production) {
                            const { LicenseWebpackPlugin } = await import('license-webpack-plugin')
                            const ignoreds = new Set(['xshell', 'react-object-model', '@ant-design/icons-svg', '@ant-design/pro-layout', '@ant-design/pro-provider'])
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
                
                
                optimization: {
                    minimize: false,
                },
                
                performance: {
                    hints: false,
                },
                
                cache: {
                    type: 'filesystem',
                    
                    version: is_cloud ? 'cloud' : 'web',
                    
                    ... ramdisk ? {
                        cacheDirectory: `${fpd_ramdisk_root}webpack/`,
                        compression: false
                    } : {
                        compression: 'brotli',
                    }
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
            new Promise(resolve => {
                compiler.close(resolve)
            })
        )
    }
}
