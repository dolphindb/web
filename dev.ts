#!/usr/bin/env node

global.started_at = new Date()

import fs from 'fs'

import type { Context } from 'koa'

import { request_json, log_section, inspect, create_mfs, UFS } from 'xshell'
import { Server } from 'xshell/server.js'

import { fp_root } from './config.js'
import { webpack } from './webpack.js'


class DevServer extends Server {
    constructor () {
        super(8421, { rpc: true })
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
        
        let { response } = ctx
        
        let path = ctx.request.path
        
        if (dapi && method === 'POST') {
            const data = await request_json(`http://127.0.0.1:8848${path}`, { body })
            log_section(`${body.functionName}(${inspect(body.params?.[0]?.value)})`)
            console.log(response.body = data)
            return true
        }
        
        if (path.startsWith('/v1')) {
            response.body = await request_json(`http://192.168.1.99:30483${path}`, {
                method: method as any,
                queries: query,
                body,
            })
            
            return true
        }
        
        path = path.replace('/cloud/fonts/', '/fonts/')
        path = path.replace('/console/fonts/', '/fonts/')
        
        return (
            await this.try_send(
                ctx,
                path.replace(/^\/console\//, ''),
                {
                    root: `${fp_root}src/`,
                    fs,
                    log_404: false
                }
            ) ||
            await this.try_send(
                ctx,
                path,
                {
                    root: fp_root,
                    fs: ufs,
                    log_404: false
                }
            )
        )
    }
}

console.log('fp_root:', fp_root)

let mfs = create_mfs()
let ufs = new UFS([mfs, fs])


let server = new DevServer()

await server.start()
await webpack.start(mfs)

console.log(
    'devserver 启动完成\n' +
    '请使用浏览器打开:\n' +
    'http://localhost:8421/console/index.html?hostname=127.0.0.1&port=8848\n' +
    'http://localhost:8421/cloud/index.html'
)

