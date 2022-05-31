import Webpack from 'webpack'

// 需要分析 bundle 大小时开启
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

import type { Options as TSLoaderOptions } from 'ts-loader'
import sass from 'sass'
import type { Options as SassOptions } from 'sass-loader'

import {
    type MFS,
    request,
    fwrite,
    fexists,
    MyProxy
} from 'xshell'

import { fpd_root, fpd_out_console, fpd_out_cloud, fpd_src_console } from './config.js'


export async function get_monaco (update = false) {
    return Promise.all(
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
            'base/worker/workerMain.js',
            'base/worker/workerMain.js.map',
            'base/browser/ui/codicons/codicon/codicon.ttf',
        ].map(async fname => {
            const fp = `${fpd_out_console}monaco/${fname}`
            
            if (!update && fexists(fp))
                return
            
            return fwrite(
                fp,
                await request(
                    `https://cdn.jsdelivr.net/npm/monaco-editor/${ fname.endsWith('.map') ? 'min-maps' : 'min' }/vs/${fname}`,
                    {
                        encoding: 'binary',
                        retries: true,
                        proxy: MyProxy.socks5
                    }
                ),
                { mkdir: true }
            )
        })
    )
}

export async function get_docs (update = false) {
    return Promise.all(
        (['zh', 'en'] as const).map(async language => {
            const fname = `docs.${language}.json`
            const fp = fpd_src_console + fname
            if (!update && fexists(fp))
                return
            
            return fwrite(
                fp,
                await request(`https://cos.shenhongfei.com/assets/${fname}`)
            )
        })
    )
    
}


const config: Webpack.Configuration = {
    name: 'DdbWebpackCompiler',
    
    mode: 'development',
    
    devtool: 'source-map',
    
    entry: {
        'console/index.js': './console/index.tsx',
        'console/window.js': './console/window.tsx',
        'cloud/index.js': './cloud/index.tsx',
    },
    
    experiments: {
        // outputModule: true,
        topLevelAwait: true,
    },
    
    output: {
        path: fpd_root,
        filename: '[name]',
        publicPath: '/',
        pathinfo: true,
        globalObject: 'globalThis',
        
        // 在 bundle 中导出 entry 文件的 export
        // library: {
        //     type: 'commonjs2',
        // }
        
        // HookWebpackError: HMR is not implemented for module chunk format yet
        // module: true,
    },
    
    target: ['web', 'es2022'],
    
    
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        symlinks: false,
        
        // modules: [
        //     'd:/1/i18n/node_modules/',
        // ],
        
        // fallback: {
        //     os: false,
        // }
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
                use: [
                    'style-loader',
                    'css-loader',
                ]
            },
            {
                oneOf: [
                    {
                        test: /\.icon\.svg$/,
                        issuer: /\.[jt]sx?$/,
                        loader: '@svgr/webpack',
                        options: {
                            icon: true,
                        }
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
        // new Webpack.HotModuleReplacementPlugin(),
        
        // new Webpack.DefinePlugin({
        //     process: { env: { }, argv: [] }
        // })
        
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
        compression: 'brotli',
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
        
        children: true,
        
        assets: false,
        assetsSpace: 100,
        
        cachedAssets: false,
        cachedModules: false,
        
        modules: false,
        // modulesSpace: 30
    },
}

export let webpack = {
    compiler: null as Webpack.Compiler,
    
    node_fs_bak: null as Webpack.Compiler['outputFileSystem'],
    
    watcher: null as Webpack.Watching,
    
    async start (mfs: MFS.IFs) {
        this.compiler = Webpack(config)
        // this.node_fs_bak = this.compiler.outputFileSystem
        this.compiler.outputFileSystem = mfs
        
        let first = true
        
        return new Promise<Webpack.Stats>( resolve => {
            this.watcher = this.compiler.watch({
                ignored: [
                    '**/node_modules/',
                ],
                aggregateTimeout: 500
            }, (error, stats) => {
                if (error)
                    console.log(error)
                console.log(stats.toString(config.stats))
                if (!first) return
                first = false
                resolve(stats)
            })
        })
    },
    
    
    async stop () {
        if (!this.watcher) return
        return new Promise<Error>(resolve => {
            this.watcher.close(resolve)
        })
    },
    
    
    async build (is_cloud: boolean) {
        config.entry = is_cloud ?
                {
                    'index.js': './cloud/index.tsx',
                }
            :
                {
                    'index.js': './console/index.tsx',
                    'window.js': './console/window.tsx'
                }
        
        config.mode = 'production'
        
        config.output.path = is_cloud ? fpd_out_cloud : fpd_out_console
        
        config.devtool = false
        
        ;(config.stats as any).colors = false
        ;(config.stats as any).assets = true
        ;(config.stats as any).assetsSpace = 20
        ;(config.stats as any).modules = true
        ;(config.stats as any).modulesSpace = 20
        
        this.compiler = Webpack(config)
        
        await new Promise<void>((resolve, reject) => {
            this.compiler.run((error, stats) => {
                if (error || stats.hasErrors()) {
                    console.log(stats.toString(config.stats))
                    reject(error || stats)
                    return
                }
                
                console.log(stats.toString(config.stats))
                resolve()
            })
        })
        
        await new Promise(resolve => {
            this.compiler.close(resolve)
        })
    }
}
