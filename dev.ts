#!/usr/bin/env node

global.started_at = new Date()

import fs from 'fs'

import type { Context } from 'koa'

import { request_json, log_section, inspect, create_mfs, UFS } from 'xshell'
import { Server } from 'xshell/server.js'

import { get_monaco, webpack, fpd_root, fpd_out_console } from './webpack.js'


class DevServer extends Server {
    constructor () {
        super(8440, { rpc: true })
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
        
        let { path } = request
        
        if (dapi && method === 'POST') {
            const data = await request_json(`http://127.0.0.1:8848${path}`, { body })
            log_section(`${body.functionName}(${inspect(body.params?.[0]?.value)})`)
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
        
        let font_matches = /^\/(?:console|cloud)\/fonts\/(myfontb?.woff2)/.exec(path)
        if (font_matches)
            return this.try_send(ctx, font_matches[1], {
                root: `${fpd_root}node_modules/xshell/`,
                fs,
                log_404: true
            })
        
        for (const prefix of ['/console/monaco/', '/min-maps/vs/'] as const)
            if (path.startsWith(prefix))
                return this.try_send(ctx, path.slice(prefix.length), {
                    root: `${fpd_out_console}monaco/`,
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
    //get_monaco(),
    server.start(),
    webpack.start(mfs)
])

console.log(
    'devserver 启动完成\n' +
    '请使用浏览器打开:\n' +
    'http://localhost:8440/console/index.html?hostname=127.0.0.1&port=8848\n' +
    'http://localhost:8440/cloud/index.html'
)

