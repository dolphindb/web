#!/usr/bin/env node

global.started_at = new Date()

import fs from 'fs'

import type { Context } from 'koa'

import { start_repl } from 'xshell/repl.js'
import { server } from 'xshell/server.js'
import xsh from 'xshell'

import { fp_root, libs } from './config.js'
import { webpack } from './webpack.js'

const { request_json, log_section, inspect } = xsh

async function repl_router (ctx: Context): Promise<boolean> {
    const {
        response,
        request: {
            query,
            method,
            body,
            hostname,
            headers: {
                cookie,
                host,
                'x-ddb': dapi
            }
        },
    } = ctx
    
    let path = ctx.request.path
    
    if (dapi && method === 'POST') {
        const data = await request_json(`http://127.0.0.1:8848${path}`, { body })
        log_section(`${body.functionName}(${inspect(body.params?.[0]?.value)})`)
        console.log(response.body = data)
        return true
    }
    
    if (path.startsWith('/v1')) {
        response.body = await request_json(`http://192.168.1.241:31897${path}`, {
            method: method as any,
            queries: query,
            body,
        })
        
        return true
    }
    
    const fname = path.split('/').last
    
    if (fname in libs) {
        const fp = libs[fname]
        response.redirect(`https://cdn.jsdelivr.net/npm/${fp}`)
        response.status = 301
        return
    }
    
    path = path.replace('/cloud/fonts/', '/fonts/')
    path = path.replace('/console/fonts/', '/fonts/')
    
    return (
        await server.try_send(
            ctx,
            path.replace(/^\/console\//, ''),
            {
                root: `${fp_root}src/`,
                fs,
                log_404: false
            }
        ) ||
        await server.try_send(
            ctx,
            path,
            {
                root: fp_root,
                log_404: false
            }
        )
    )
}


console.log('fp_root:', fp_root)
global.repl_router = repl_router
await start_repl()
await webpack.start()

console.log(
    'console.server 启动完成\n' +
    '请使用浏览器打开:\n' +
    'http://localhost:8421/console/index.html?hostname=127.0.0.1&port=8848\n' +
    'http://localhost:8421/cloud/index.html'
)
