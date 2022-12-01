#!/usr/bin/env node

global.started_at = new Date()

import fs from 'fs'

import { type Context } from 'koa'

import { request_json, inspect, create_mfs, UFS, Remote } from 'xshell'
import { Server } from 'xshell/server.js'

import { get_monaco, webpack, fpd_root, fpd_out_console } from './webpack.js'


class DevServer extends Server {
    ddb_backend = '127.0.0.1:8848'
    
    override remote = new Remote({
        funcs: {
            async recompile () {
                await webpack.run()
                return [ ]
            }
        }
    })
    
    
    constructor () {
        super(8432)
    }
    
    override async router (ctx: Context) {
        const {
            request,
            request: {
                query,
                method,
                body,
                headers: {
                    'x-ddb': dapi
                }
            },
        } = ctx
        
        let { response } = ctx
        
        let { path } = request
        
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
        
        if (path === '/console/') {
            this.ddb_backend = `${query.hostname || '127.0.0.1'}:${query.port || '8848'}`
            path = '/console/index.html'
        }
        
        if (dapi && method === 'POST') {
            const data = await request_json(`http://${this.ddb_backend}${path}`, { body })
            console.log(`${body.functionName}(${inspect(body.params, { compact: true })})`)
            console.log(response.body = data)
            return true
        }
        
        if (path.startsWith('/v1/grafana/url')) {
            response.body = await request_json(
                `http://192.168.0.75:31832${path}`,
                {
                    method: method as any,
                    queries: query,
                    body,
                }
            )
            return true
        }
        
        if (path.startsWith('/dolphindb-webserver')) {
                try {
                    response.body = await request_json(`http://192.168.1.99:30080${path}`, {
                        method: method as any,
                        queries: query,
                        body,
                    })
                } catch (error) {
                    response.body = error.response.body
                    response.status = error.response.statusCode
                    response.type = 'json'
                }
            return true
        }
        
        if (path.startsWith('/v1')) {
            response.body = await request_json(`http://192.168.1.99:30080/dolphindb-webserver${path}`, {
                method: method as any,
                queries: query,
                body,
            })
            
            return true
        }
        
        for (const prefix of ['/console/vs/', '/min-maps/vs/'] as const)
            if (path.startsWith(prefix))
                return this.try_send(ctx, path.slice(prefix.length), {
                    root: `${fpd_out_console}vs/`,
                    fs,
                    log_404: true
                })
        
        if (path === '/console/onig.wasm') {
            await this.fsend(ctx, `${fpd_root}node_modules/vscode-oniguruma/release/onig.wasm`, { fs, absolute: true })
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
                    log_404: false
                }
            )
        )
    }
}

console.log('fpd_root:', fpd_root)

let mfs = create_mfs()
let ufs = new UFS([mfs, fs])


let server = new DevServer()

await Promise.all([
    get_monaco(),
    server.start(),
    webpack.build({ production: false, mfs })
])

console.log(
    'devserver 启动完成\n' +
    '请使用浏览器打开:\n' +
    'http://localhost:8432/console/?hostname=127.0.0.1&port=8848\n' +
    'http://localhost:8432/cloud/'
)

