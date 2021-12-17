#!/usr/bin/env node

global.started_at = new Date()

import fs from 'fs'

import type { Context } from 'koa'

import { start_repl } from 'xshell/repl.js'
import { server } from 'xshell/server.js'
import xsh from 'xshell'

import { fp_root } from './config.js'
import { webpack } from './webpack.js'

const { request_json, log_section, inspect } = xsh

async function repl_router (ctx: Context): Promise<boolean> {
    const {
        response,
        request: {
            path,
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
    
    if (dapi && method === 'POST') {
        const data = await request_json(`http://ddb253.shenhongfei.com:8850${path}`, { body })
        log_section(`${body.functionName}(${inspect(body.params?.[0]?.value)})`)
        console.log(response.body = data)
        return true
    }
    
    
    return await server.try_send(
        ctx,
        path,
        {
            root: `${fp_root}src/`,
            fs,
            log_404: false
        }) ||
        await server.try_send(
            ctx,
            path,
            {
                root: fp_root,
                log_404: false
            }
        )
}


console.log('fp_root:', fp_root)
global.repl_router = repl_router
await start_repl()
await webpack.start()

console.log('console.server 启动完成')
console.log('请使用浏览器打开 http://localhost:8421/index.html?hostname=ddb253.shenhongfei.com&port=8850')

