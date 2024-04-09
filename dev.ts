#!/usr/bin/env node

import type { Context } from 'koa'

import {
    request_json, inspect, Remote, set_inspect_options,
    type RequestError, type RemoteReconnectingOptions, fexists, assert
} from 'xshell'
import { Server } from 'xshell/server.js'

import { webpack, fpd_root, fpd_node_modules, fpd_src_console, fpd_src_cloud, ramdisk } from './webpack.js'


// k8s 开发环境需要使用自签名的证书
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'


class DevServer extends Server {
    ddb_backend = '127.0.0.1:8848'
    
    
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
        
        if (path === '/api/recompile') {
            response.status = 200
            await webpack.run()
            return true
        }
        
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
                    const { body, status }: RequestError['response'] = error.response
                    response.body = body
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
                await this.try_send(ctx, `${fpd_node_modules}monaco-editor/dev/vs/`, path.slice(prefix.length), true)
                return true
            }
        
        for (const prefix of ['/console/vendors/', '/cloud/vendors/'] as const)
            if (path.startsWith(prefix)) {
                await this.try_send(ctx, fpd_node_modules, path.slice(prefix.length), true)
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
                (project === 'console' && await this.try_send(ctx, `${fpd_root}src/`, fp, false)) ||
                
                // index.js
                await this.try_send(
                    ctx,
                    `${webpack.config.output.path}${ project === 'console' ? 'web' : 'web.cloud' }/`,
                    fp,
                    false
                ) ||
                
                // index.html
                this.try_send(
                    ctx,
                    project === 'console' ? fpd_src_console : fpd_src_cloud,
                    fp,
                    true
                )
            )
        }
    }
}


set_inspect_options()

console.log('项目根目录:', fpd_root)

assert(ramdisk || fexists(`${fpd_root}.vscode/settings.json`), '需要将 .vscode/settings.template.json 复制为 .vscode/settings.json')

let server = new DevServer({
    name: 'web 开发服务器',
    http: true,
    http_port: 8432,
})

await Promise.all([
    server.start(),
    webpack.build_bundles(false),
    webpack.build({ production: false })
])


let remote: Remote


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
                remote?.disconnect()
                process.exit()
                
            case 'i':
                console.log(info)
                break
        }
    })
}


if (ramdisk) {
    const reconnecting_options: RemoteReconnectingOptions = {
        func: 'register',
        args: ['ddb.web'],
        on_error (error: Error) {
            console.log(error.message)
        }
    }
    
    remote = new Remote({
        url: 'ws://localhost',
        
        funcs: {
            async recompile () {
                await webpack.run()
                return [ ]
            },
            
            async exit () {
                await webpack.close()
                remote.disconnect()
                process.exit()
            }
        },
        
        on_error (error) {
            console.log(error.message)
            remote.start_reconnecting({ ...reconnecting_options, first_delay: 1000 })
        }
    })
    
    remote.start_reconnecting(reconnecting_options)
}


const info = 
    'web:\n' +
    'http://localhost:8432/console/?hostname=192.168.0.200&port=20023\n'.blue.underline
    // '\n' +
    // 'cloud:\n' +
    // 'http://localhost:8432/cloud/\n'.blue.underline +
    // '\n'


console.log(
    '\n' +
    '开发服务器启动成功，请使用浏览器打开:\n'.green +
    info +
    '终端快捷键:\n' +
    'r: 重新编译\n' +
    'i: 打印地址信息\n' +
    'x: 退出开发服务器\n'
)

