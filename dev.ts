#!/usr/bin/env node

global.started_at = new Date()

import fs from 'fs'

import type { Context } from 'koa'

import { request_json, inspect, create_mfs, UFS, Remote, set_inspect_options } from 'xshell'
import { Server } from 'xshell/server.js'

import { DDB, DdbVectorString } from 'dolphindb'

import { webpack, fpd_root, fpd_node_modules } from './webpack.js'


let c0 = new DDB('ws://127.0.0.1:8850')

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
        super(8432)
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
        
        const { path } = request
        
        if (dapi && method === 'POST') {
            const data = await request_json(`http://${this.ddb_backend}${path}`, { body })
            console.log(`${body.functionName}(${inspect(body.params, { compact: true })})`)
            console.log(response.body = data)
            return true
        }
        
        if (path.startsWith('/v1/')) {
            try {
                response.body = await request_json(`http://192.168.0.65:32014${path}`, {
                    method: method as any,
                    queries: query,
                    headers: headers as Record<string, string>,
                    body,
                })
            } catch (error) {
                console.log(error)
                if (error.response) {
                    response.body = error.response.body
                    response.status = error.response.statusCode
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
                    fs,
                    log_404: true
                })
                return true
            }
        
        for (const prefix of ['/console/vendors/', '/cloud/vendors/'] as const)
            if (path.startsWith(prefix)) {
                await this.try_send(
                    ctx,
                    path.slice(prefix.length),
                    {
                        root: fpd_node_modules,
                        fs,
                        log_404: true
                    }
                )
                return true
            }
        
        if (path === '/console/docs.zh.json' || path === '/console/docs.en.json') {
            await this.fsend(ctx, `${fpd_node_modules}dolphindb/${path.slice('/console/'.length)}`, { fs, absolute: true })
            return true
        }
        
        return (
            await this.try_send(
                ctx,
                path.replace(/^\/console\//, ''),
                {
                    root: `${fpd_root}src/`,
                    fs,
                    log_404: false
                }
            ) ||
            await this.try_send(
                ctx,
                path,
                {
                    root: fpd_root,
                    fs: ufs,
                    log_404: true
                }
            )
        )
    }
}


set_inspect_options()

console.log('项目根目录:', fpd_root)

let mfs = create_mfs()
let ufs = new UFS([mfs, fs])


let server = new DevServer()

await Promise.all([
    server.start(),
    webpack.build({ production: false, mfs })
])


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
    }
})


console.log(
    '\n' +
    '开发服务器启动成功，请使用浏览器打开:\n'.green +
    'http://localhost:8432/console/?hostname=127.0.0.1&port=8848\n'.blue.underline +
    'http://localhost:8432/cloud/\n'.blue.underline +
    '\n' +
    '终端快捷键:\n' +
    'r: 重新编译\n' +
    'x: 退出开发服务器'
)

