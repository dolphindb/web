import type { Context } from 'koa'

import { Remote, set_inspect_options, ramdisk } from 'xshell'
import { Server } from 'xshell/server.js'
import { setup_vscode_settings, process_stdin } from 'xshell/development.js'

import { builder, fpd_root, fpd_out } from './builder.ts'


set_inspect_options()

console.log('项目根目录:', fpd_root)

await setup_vscode_settings(fpd_root)


async function stop () {
    await builder.close()
    remote?.disconnect()
}


async function recompile () {
    await builder.run()
    console.log(info)
}


class DevServer extends Server {
    override async router (ctx: Context) {
        let { request, response } = ctx
        
        const { path } = request
        
        if (path === '/api/recompile') {
            response.status = 200
            await recompile()
            return true
        }
        
        return this.try_send(
            ctx, 
            path.fext ? path.slice(1) : 'index.html', 
            { fpd_root: fpd_out }
        )
    }
}


let server = new DevServer({
    name: 'web 开发服务器',
    http: true,
    http_port: 8432
})


await Promise.all([
    server.start(),
    builder.build(false)
])


process_stdin(
    async (key) => {
        switch (key) {
            case 'r':
                try {
                    await recompile()
                } catch (error) {
                    console.log(error)
                    console.log('重新编译失败，请尝试按 x 退出后再启动')
                }
                break
                
            case 'x':
                await stop()
                process.exit()
                
            case 'i':
                console.log(info)
                break
        }
    },
    stop
)


let remote: Remote

if (ramdisk) {
    remote = new Remote({
        url: 'ws://localhost',
        
        keeper: {
            func: 'register',
            args: ['ddb.web'],
        },
        
        funcs: {
            async recompile () {
                await recompile()
                return [ ]
            },
            
            async exit () {
                await stop()
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

