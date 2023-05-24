import { default as Webpack, type Stats } from 'webpack'
import type { Options as TSLoaderOptions } from 'ts-loader'
import sass from 'sass'
import type { Options as SassOptions } from 'sass-loader'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface IOptions {
    entry: string
    library_name: string
    production: boolean
}

const fpd_root = `${path.dirname(fileURLToPath(import.meta.url))}/`

export const pre_bundle_entry_path = path.join(fpd_root, 'pre-bundle/entry')
export const pre_bundle_dist_path = path.join(fpd_root, 'pre-bundle/dist')

export async function build_pre_bundle_library ({ library_name, production, entry }: IOptions) {
    return new Promise<Stats>((resolve, reject) => {
        const compiler = Webpack({
            name: `${library_name}-umd`,

            mode: production ? 'production' : 'development',

            devtool: 'source-map',

            entry: path.join(pre_bundle_entry_path, entry),

            output: {
                path: pre_bundle_dist_path,
                filename: `${library_name}.umd.js`,
                publicPath: '/',
                globalObject: 'globalThis',
                library: {
                    type: 'umd',
                    name: library_name,
                }
            },

            target: ['web', 'es2022'],

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

            cache: {
                type: 'filesystem',

                version: `${library_name}-umd`,
            },

            ignoreWarnings: [
                /Failed to parse source map/
            ],

            stats: {
                colors: true,

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

        compiler.run((err, stats) => {
            if (err)
                reject(err)

            if (stats?.hasErrors())
                reject(stats.toString('errors-only'))

            resolve(stats!)
        })
    })
}
