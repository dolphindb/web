#!/usr/bin/env node

import type { Context } from 'koa'

import { request_json, inspect, Remote, set_inspect_options, type RequestError } from 'xshell'
import { Server } from 'xshell/server.js'

import { DDB, DdbVectorString } from 'dolphindb'

import { webpack, fpd_root, fpd_node_modules, fpd_src_console, fpd_src_cloud } from './webpack.js'
import { build_bundle, fpd_pre_bundle_dist } from './pre-bundle/index.js'

let c0 = new DDB('ws://127.0.0.1:8850')

// k8s 开发环境需要使用自签名的证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

class DevServer extends Server {
    ddb_backend = '127.0.0.1:8848'
    
    override remote = new Remote({
        funcs: {
            async recompile () {
                await webpack.run()
                return [ ]
            },
            
            async start_data_node () {
                await c0.call('startDataNode', [new DdbVectorString(['d0', 'd1'])])
                return [ ]
            }
        }
    })
    
    
    constructor () {
        super({ port: 8432 })
    }
    
    
    override async router (ctx: Context) {
        const {
            request: {
                query,
                method,
                body,
                headers: {
                    'x-ddb': dapi
                }
            },
            headers
        } = ctx
        
        let { request, response } = ctx
        
        if (
            request.path === '/console' ||
            request.path === '/cloud'
        ) {
            const path_ = `${request.path}/`
            response.redirect(path_)
            response.status = 301
            console.log(`301 重定向  ${request.originalUrl} → ${path_}`.yellow)
            return true
        }
        
        if (request.path === '/console/') {
            this.ddb_backend = `${query.hostname || '127.0.0.1'}:${query.port || '8848'}`
            request.path = '/console/index.dev.html'
        }
        
        if (request.path === '/cloud/')
            request.path = '/cloud/index.dev.html'
        
        if (request.path === '/cloud/ddb.svg')
            request.path = '/console/ddb.svg'
        
        const { path } = request
        
        if (dapi && method === 'POST') {
            const data = await request_json(`http://${this.ddb_backend}${path}`, { body })
            console.log(`${body.functionName}(${inspect(body.params, { compact: true })})`)
            console.log(response.body = data)
            return true
        }
        
        if (path.startsWith('/v1/') || path === '/login') {
            try {
                response.body = await request_json(`https://192.168.0.107:30443${path}`, {
                    method: method as any,
                    queries: query,
                    headers: headers as Record<string, string>,
                    body,
                })
            } catch (error) {
                console.log(error)
                if (error.response) {
                    const { text, status }: RequestError['response'] = error.response
                    response.body = text
                    response.status = status
                    response.type = 'json'
                } else {
                    response.status = 500
                    response.body = inspect(error, { colors: false })
                }
            }
            return true
        }
        
        for (const prefix of ['/console/vs/', '/min-maps/vs/'] as const)
            if (path.startsWith(prefix)) {
                await this.try_send(ctx, path.slice(prefix.length), {
                    root: `${fpd_node_modules}monaco-editor/dev/vs/`,
                    log_404: true
                })
                return true
            }
        
        for (const prefix of ['/console/pre-bundle/', '/cloud/pre-bundle/'] as const)
            if (path.startsWith(prefix)) {
                await this.try_send(
                    ctx,
                    path.slice(prefix.length),
                    {
                        root: fpd_pre_bundle_dist,
                        log_404: true
                    }
                )
                return true
            }
        
        for (const prefix of ['/console/vendors/', '/cloud/vendors/'] as const)
            if (path.startsWith(prefix)) {
                await this.try_send(
                    ctx,
                    path.slice(prefix.length),
                    {
                        root: fpd_node_modules,
                        log_404: true
                    }
                )
                return true
            }
        
        if (path === '/console/docs.zh.json' || path === '/console/docs.en.json') {
            await this.fsend(ctx, `${fpd_node_modules}dolphindb/${path.slice('/console/'.length)}`, { absolute: true })
            return true
        }
        
        const project = /^\/(console|cloud)\//.exec(path)?.[1] as undefined | 'console' | 'cloud'
        if (project) {
            // 去掉前面 /console/ 部分的剩余路径
            const fp = path.slice(project.length + 2)
            
            return (
                (project === 'console' && await this.try_send(
                    ctx,
                    fp,
                    {
                        root: `${fpd_root}src/`,
                        log_404: false
                    }
                )) ||
                
                // index.js
                await this.try_send(
                    ctx,
                    fp,
                    {
                        root: `${webpack.config.output.path}${ project === 'console' ? 'web' : 'web.cloud' }/`,
                        log_404: false
                    }
                ) ||
                
                // index.html
                this.try_send(
                    ctx,
                    fp,
                    {
                        root: project === 'console' ? fpd_src_console : fpd_src_cloud,
                        log_404: true
                    }
                )
            )
        }
    }
}


set_inspect_options()

console.log('项目根目录:', fpd_root)

let server = new DevServer()

await Promise.all([
    server.start(),
    build_bundle({
        entry: 'formily',
        library_name: 'Formily',
        production: false,
    }),
    webpack.build({ production: false })
])


if (process.argv.includes('--watch')) 
    webpack.watch()
else {
    // 监听终端快捷键
    // https://stackoverflow.com/a/12506613/7609214
    
    let { stdin } = process
    
    stdin.setRawMode(true)
    
    stdin.resume()
    
    stdin.setEncoding('utf-8')
    
    // on any data into stdin
    stdin.on('data', function (key: any) {
        // ctrl-c ( end of text )
        if (key === '\u0003')
            process.exit()
        
        // write the key to stdout all normal like
        console.log(key)
        
        switch (key) {
            case 'r':
                webpack.run()
                break
                
            case 'x':
                process.exit()
                
            case 'i':
                console.log(info)
                break
        }
    })
}


const info = 
    'web:\n' +
    'http://localhost:8432/console/?hostname=115.239.209.123&port=8892\n'.blue.underline +
    'http://localhost:8432/console/?hostname=192.168.0.200&port=20000\n'.blue.underline +
    'http://localhost:8432/console/?hostname=192.168.0.200&port=20023\n'.blue.underline +
    'http://localhost:8432/console/?hostname=115.239.209.123&port=8810\n'.blue.underline +
    'http://localhost:8432/console/?hostname=127.0.0.1&port=8848\n'.blue.underline +
    '\n' +
    'cloud:\n' +
    'http://localhost:8432/cloud/\n'.blue.underline +
    '\n'
    


console.log(
    '\n' +
    '开发服务器启动成功，请使用浏览器打开:\n'.green +
    info +
    '终端快捷键:\n' +
    'r: 重新编译\n' +
    'i: 打印地址信息\n' +
    'x: 退出开发服务器\n'
)

