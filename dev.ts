import type { Context } from 'koa'

import {
    request_json, inspect, Remote, set_inspect_options,
    fexists, assert, ramdisk
} from 'xshell'
import { Server } from 'xshell/server.js'

import { builder, fpd_root, fpd_out } from './builder.js'


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
        } = ctx
        
        let { request, response } = ctx
        
        if (request.path === '/') {
            this.ddb_backend = `${query.hostname || '127.0.0.1'}:${query.port || '8848'}`
            request.path = '/index.dev.html'
        }
        
        const { path } = request
        
        if (path === '/api/recompile') {
            response.status = 200
            await builder.run()
            return true
        }
        
        if (dapi && method === 'POST') {
            const data = await request_json(`http://${this.ddb_backend}${path}`, { body })
            console.log(`${body.functionName}(${inspect(body.params, { compact: true })})`)
            console.log(response.body = data)
            return true
        }
        
        await this.try_send(
            ctx,
            fpd_out,
            path.slice(1),
            true
        )
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
    builder.build_bundles(false),
    builder.build(false)
])


let remote: Remote


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
            builder.run()
            break
            
        case 'x':
            remote?.disconnect()
            process.exit()
            
        case 'i':
            console.log(info)
            break
    }
})


if (ramdisk) {
    remote = new Remote({
        url: 'ws://localhost',
        
        keeper: {
            func: 'register',
            args: ['ddb.web'],
        },
        
        funcs: {
            async recompile () {
                await builder.run()
                return [ ]
            },
            
            async exit () {
                await builder.close()
                remote.disconnect()
                process.exit()
            }
        }
    })
    
    await remote.connect()
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

