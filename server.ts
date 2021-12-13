#!/usr/bin/env node

global.started_at = new Date()


import type { Context } from 'koa'

import { start_repl } from 'xshell/repl.js'
import { server } from 'xshell/server.js'

import { fp_root } from './config.js'
import { webpack } from './webpack.js'


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
                host
            }
        },
    } = ctx
    
    return server.try_send(ctx, path, { root: fp_root })
}


console.log('fp_root:', fp_root)
global.repl_router = repl_router
await start_repl()
await webpack.start()

console.log('console.server 启动完成')
