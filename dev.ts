#!/usr/bin/env node

global.started_at = new Date()

import fs from 'fs'

import type { Context } from 'koa'

import { request_json, inspect, create_mfs, UFS, Remote, set_inspect_options } from 'xshell'
import { Server } from 'xshell/server.js'

import { DDB, DdbVectorString } from 'dolphindb'

import { webpack, fpd_root, fpd_out_console, get_vendors } from './webpack.js'


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
            request.path = '/console/index.html'
        }
        
        if (request.path === '/cloud/')
            request.path = '/cloud/index.html'
        
        const { path } = request
        
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
            response.body = await request_json(`http://192.168.0.75:31302${path}`, {
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
        
        for (const prefix of ['/console/vendors/', '/cloud/vendors/'] as const)
            if (path.startsWith(prefix))
                return this.try_send(ctx, path.slice(prefix.length), {
                    root: `${fpd_out_console}vendors/`,
                    fs,
                    log_404: true
                })
        
        if (path === '/console/onig.wasm') {
            await this.fsend(ctx, `${fpd_root}node_modules/vscode-oniguruma/release/onig.wasm`, { fs, absolute: true })
            return true
        }
        
        if (path === '/console/docs.zh.json' || path === '/console/docs.en.json') {
            await this.fsend(ctx, `${fpd_root}node_modules/dolphindb/${path.slice('/console/'.length)}`, { fs, absolute: true })
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

console.log('根目录:', fpd_root)

let mfs = create_mfs()
let ufs = new UFS([mfs, fs])


let server = new DevServer()

await Promise.all([
    get_vendors(true),
    server.start(),
    webpack.build({ production: false, mfs })
])

console.log(
    '开发服务器启动成功，请使用浏览器打开:\n' +
    'http://localhost:8432/console/?hostname=127.0.0.1&port=8848\n' +
    'http://localhost:8432/cloud/'
)

