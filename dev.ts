import type { Context } from 'koa'

import { Remote, set_inspect_options, fexists, check, ramdisk, noprint } from 'xshell'
import { Server } from 'xshell/server.js'

import { builder, fpd_root, fpd_out } from './builder.ts'


set_inspect_options()

console.log('项目根目录:', fpd_root)

check(ramdisk || fexists(`${fpd_root}.vscode/settings.json`, noprint), '需要将 .vscode/settings.template.json 复制为 .vscode/settings.json')


class DevServer extends Server {
    override async router (ctx: Context) {
        let { request, response } = ctx
        
        const { path } = request
        
        if (path === '/api/recompile') {
            response.status = 200
            await builder.run()
            return true
        }
        
        return this.try_send(
            ctx, 
            fpd_out, 
            path.fext ? path.slice(1) : 'index.html', 
            true
        )
    }
}


let server = new DevServer({
    name: 'web 开发服务器',
    http: true,
    http_port: 8432,
})


await Promise.all([
    server.start(),
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


const info = 'http://localhost:8432/\n'.blue.underline


console.log(
    '\n' +
    '开发服务器启动成功，请使用浏览器打开:\n'.green +
    info +
    '终端快捷键:\n' +
    'r: 重新编译\n' +
    'i: 打印地址信息\n' +
    'x: 退出开发服务器\n'
)

