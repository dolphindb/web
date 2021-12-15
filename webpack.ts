import Webpack from 'webpack'

// 需要分析 bundle 大小时开启
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

import type { Options as TSLoaderOptions } from 'ts-loader'
import type { Options as SassOptions } from 'sass-loader'

import sass from 'sass'

import { fp_root } from './config.js'
import xshell from 'xshell'


const config: Webpack.Configuration = {
    name: 'MyWebpackCompiler',
    
    mode: 'development',
    
    devtool: 'source-map',
    
    entry: {
        'index.js': './index.tsx',
    },
    
    
    experiments: {
        // outputModule: true,
        topLevelAwait: true,
    },
    
    output: {
        path: fp_root,
        filename: '[name]',
        publicPath: '/',
        pathinfo: true,
        globalObject: 'globalThis',
        
        // 在 bundle 中导出 entry 文件的 export
        // library: {
        //     type: 'commonjs2',
        // }
        
        // module: true,
        
        // 解决 'ERR_OSSL_EVP_UNSUPPORTED' 错误问题 for nodejs 17
        // https://stackoverflow.com/questions/69394632/webpack-build-failing-with-err-ossl-evp-unsupported
        hashFunction: 'sha256',
    },
    
    target: ['web', 'es2020'],
    
    
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
    
    
    externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        jquery: '$',
        lodash: '_',
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
                exclude: [
                    /node_modules/,
                    /repl[/\\]repl/,
                ],
                use: [{
                    loader: 'ts-loader',
                    // https://github.com/TypeStrong/ts-loader
                    options: {
                        configFile: `${fp_root}tsconfig.json`,
                        onlyCompileBundledFiles: true,
                        transpileOnly: true,
                    } as Partial<TSLoaderOptions>
                }]
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
                test: /\.(ico|png|jpe?g|gif|svg|woff2?|ttf|eot|otf|mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
                loader: 'url-loader',
                options: {
                    name: '[path][name].[ext]',
                    limit: 30 * 10**3
                }
            },
            {
                test: /\.txt$/,
                loader: 'raw-loader',
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
    
    
    cache: {
        type: 'filesystem',
        compression: false,
    },
    
    ignoreWarnings: [
        /Failed to parse source map/
    ],
    
    stats: {
        colors: true,
        
        context: fp_root,
        
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
    
    async start () {
        this.compiler = Webpack(config)
        // this.node_fs_bak = this.compiler.outputFileSystem
        this.compiler.outputFileSystem = xshell.mfs
        
        let first = true
        
        return new Promise<Webpack.Stats>( resolve => {
            this.watcher = this.compiler.watch({
                ignored: [
                    '**/node_modules/',
                    './repl.ts', 
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
    
    async build () {
        config.mode = 'production'
        
        config.output.path += 'build/'
        
        config.devtool = false
        
        this.compiler = Webpack(config)
        
        return new Promise<void>((resolve, reject) => {
            this.compiler.run((error, stats) => {
                if (error) {
                    reject(error)
                    return
                }
                
                console.log(stats.toString(config.stats))
                resolve()
            })
        })
    }
}


export default webpack
