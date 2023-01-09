import { fileURLToPath } from 'url'
import path from 'upath'

import { default as Webpack, type Compiler, type Configuration, type Stats } from 'webpack'

// 需要分析 bundle 大小时开启
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

import type { Options as TSLoaderOptions } from 'ts-loader'

import sass from 'sass'
import type { Options as SassOptions } from 'sass-loader'

import { type MFS } from 'xshell'


export const fpd_root = `${path.dirname(fileURLToPath(import.meta.url))}/`

export const fpd_node_modules = `${fpd_root}node_modules/`

export const fpd_src_console = `${fpd_root}console/`
export const fpd_src_cloud = `${fpd_root}cloud/`

export const fpd_out_console = `${fpd_root}web/`
export const fpd_out_cloud = `${fpd_root}web.cloud/`


const config: Configuration = {
    name: 'DdbWeb',
    
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
    },
    
    resolve: {
        extensions: ['.js'],
        
        symlinks: false,
        
        plugins: [{
            apply (resolver) {
                const target = resolver.ensureHook('file')
                
                for (const extension of ['.ts', '.tsx'] as const)
                    resolver.getHook('raw-file').tapAsync('ResolveTypescriptPlugin', (request, ctx, callback) => {
                        if (
                            typeof request.path !== 'string' ||
                            /(^|[\\/])node_modules($|[\\/])/.test(request.path)
                        ) {
                            callback()
                            return
                        }
                        
                        if (request.path.endsWith('.js')) {
                            const path = request.path.slice(0, -3) + extension
                            
                            resolver.doResolve(
                                target,
                                {
                                    ...request,
                                    path,
                                    relativePath: request.relativePath?.replace(/\.js$/, extension)
                                },
                                `using path: ${path}`,
                                ctx,
                                callback
                            )
                        } else
                            callback()
                    })
            }
        }]
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
    compiler: null as Compiler,
    
    
    async build ({ production, is_cloud, mfs }: { production: boolean, is_cloud?: boolean, mfs?: MFS.IFs }) {
        if (production) {
            config.entry = is_cloud ?
                    { 'index.js': './cloud/index.tsx' }
                :
                    {
                        'index.js': './console/index.tsx',
                        'window.js': './console/window.tsx'
                    }
            config.mode = 'production'
            config.output.path = is_cloud ? fpd_out_cloud : fpd_out_console
            config.cache = false
        }
        
        this.compiler = Webpack(config)
        
        if (!production)
            this.compiler.outputFileSystem = mfs
        
        await this.run()
    },
    
    
    async run () {
        return new Promise<Stats>((resolve, reject) => {
            this.compiler.run((error, stats) => {
                if (stats)
                    console.log(
                        stats.toString(config.stats)
                            .replace(/\n\s*.*DdbWeb.* compiled .*successfully.* in (.*)/, '\n编译成功，用时 $1'.green)
                    )
                
                if (error)
                    reject(error)
                else if (stats.hasErrors())
                    reject(new Error('构建失败'))
                else
                    resolve(stats)
            })
        })
    }
}
