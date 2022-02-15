import {
    createSecureServer as http2_create_server,
    type Http2SecureServer
} from 'http2'

import zlib from 'zlib'

// --- 3rd party
import qs from 'qs'


// --- koa & koa middleware
import {
    default as Koa,
    type Context,
    type Next
} from 'koa'

import KoaCompress from 'koa-compress'

declare module 'koa' {
    interface Request {
        _path: string
        body: any
    }
    
    interface Context {
        compress: boolean
    }
}

import xsh from 'xshell'

import { fp_root } from '../config.js'

const { stream_to_buffer, inspect, output_width, fread } = xsh


declare module 'http' {
    interface IncomingMessage {
        tunnel?: boolean
        id?: string
        body?: Buffer
    }
    
    interface ServerResponse {
        body?: Buffer
    }
}

// ------------ my server
export const server = {
    app: null as Koa,
    
    handler: null as ReturnType<Koa['callback']>,
    
    https_server: null as Http2SecureServer,
    
    
    /** start http server and listen */
    async start () {
        // --- init koa app
        let app = new Koa()
        
        app.on('error', (error, ctx) => {
            console.error(error)
            console.log(ctx)
        })
        
        app.use(
            this.entry.bind(this)
        )
        
        app.use(KoaCompress({
            br: {
                // https://nodejs.org/api/zlib.html#zlib_class_brotlioptions
                params: {
                    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 6  // default 11 (maximized compression), may lead to news/get generated 14mb json taking 24s
                },
            },
            threshold: 512
        }))
        
        app.use(this.router.bind(this))
        
        this.app = app
        
        this.handler = this.app.callback()
        
        const [
            cert_dolphindb,
            key_dolphindb
        ] = await Promise.all([
            fread(`${fp_root}server/cert/dolphindb.crt`),
            fread(`${fp_root}server/cert/dolphindb.key`),
        ])
        
        this.https_server  = http2_create_server(
            {
                cert: cert_dolphindb,
                key: key_dolphindb,
                
                // 通过设置环境变量 NODE_EXTRA_CA_CERTS=d:/0/cfg/my-root-cas.pem 增加 nodejs 根证书（内置的为 tls.rootCertificates）
                // https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file
                // ca: await fread(`${fp_root}cfg/root-ca.pem`, { print: false }),
                
                allowHTTP1: true,
            },
            this.handler
        )
        
        await new Promise<void>(resolve => {
            this.https_server.listen(443, resolve)
        })
    },
    
    
    stop () {
        this.https_server.close()
    },
    
    
    async entry (ctx: Context, next: Next) {
        let { response } = ctx
        
        await this.parse(ctx)
        
        // ------------ next
        try {
            await next()
        } catch (error) {
            if (error.status !== 404)
                console.error(error)
            response.status = error.status || 500
            response.body = inspect(error, { colors: false })
            response.type = 'text/plain'
        }
    },
    
    
    /** 
        parse req.body to request.body  
        process request.ip
    */
    async parse (ctx: Context) {
        const {
            request,
            req,
            req: { tunnel },
        } = ctx
        
        if (!tunnel) {
            const buf = await stream_to_buffer(req)
            if (buf.length)
                req.body = buf
        }
        
        // --- parse request.ip
        request.ip = (request.headers['x-real-ip'] as string || request.ip).replace(/^::ffff:/, '')
        
        
        // --- parse body
        if (!req.body) return
        
        if (ctx.is('application/json') || ctx.is('text/plain'))
            request.body = JSON.parse(req.body.toString())
        else if (ctx.is('application/x-www-form-urlencoded'))
            request.body = qs.parse(req.body.toString())
        else if (ctx.is('multipart/form-data')) {
            throw new Error('multipart/form-data is not supported')
        } else
            request.body = req.body
    },
    
    
    async router (ctx: Context, next: Next) {
        let { request, response } = ctx
        const _path = request._path = decodeURIComponent(request.path)
        Object.defineProperty(request, 'path', {
            value: _path,
            configurable: true,
            enumerable: true,
            writable: true
        })
        
        const { path, method, headers, body }  = request
        
        
        // ------------ log
        this.logger(ctx)
        
        
        // ------------ repl_router hook
        if (await global.repl_router?.(ctx))
            return
            
        
        if (path === '/heartbeat') {
            response.body = {
                ... method === 'POST' ? {
                    code: 0,
                } : {
                    code: 100,
                    message: 'Incorrect HTTP method. POST is required'
                },
                request: {
                    method,
                    headers,
                    body,
                },
            }
            return
        }
        
        
        await next?.()
    },
    
    
    logger (ctx: Context) {
        const { request } = ctx
        const {
            query, 
            body, 
            path, _path, 
            protocol,
            host,
            req: { httpVersion: http_version },
            ip,
        } = request
        
        let { method } = request
        
        
        let s = ''
        
        // --- time
        s += `${new Date().to_time_str()}    `
        
        
        // --- ip
        s += (ip || '').pad(40) + '  '
        
        
        // --- https／2.0
        // if (req.tunnel) `tunnel／${http_version}`.pad(10).cyan
        s += `${`${protocol.pad(5)}／${http_version}`.pad(10)}    `
        
        
        // --- method
        method = method.toLowerCase()
        s += method === 'get' ? method.pad(10) : method.pad(10).yellow
        
        
        // --- host
        s += `${host.pad(20)}  `
        
        
        // --- path
        s += (() => {
            if (path.toLowerCase() !== _path.toLowerCase())
                return `${_path.blue} → ${path}`
            if (!path.includes('.'))
                return path.yellow
            return path
        })()
        
        
        // --- query
        if (Object.keys(query).length) {
            let t = inspect(query, { compact: true })
                .replace('[Object: null prototype] ', '')
            
            if (t.endsWith('\n'))
                t = t.slice(0, -1)
            
            s += (s + t).width > output_width ? '\n' : '    '
            
            s += t
        }
        
        
        // --- body
        if (body && Object.keys(body).length)
            s += '\n' + inspect(body).replace('[Object: null prototype] ', '')
        
        
        // --- print log
        console.log(s)
    },
}


server.start()
console.log('webserver 启动成功，可访问 https://license.dolphindb.com/heartbeat 或 https://localhost/heartbeat')

