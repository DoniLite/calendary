import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import express from 'express'
import {createProxyMiddleware} from 'http-proxy-middleware'
import {createServer as createViteServer} from 'vite'

const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 5173)
const root = process.cwd()
const app = express()

let vite: Awaited<ReturnType<typeof createViteServer>> | undefined
let apiProxy: ReturnType<typeof createProxyMiddleware> | undefined

if (!isProduction) {
    vite = await createViteServer({
        root,
        server: {middlewareMode: true},
        appType: 'custom',
    })
    app.use(vite.middlewares)
} else {
    // Vite's own `server.proxy` (vite.config.ts) forwards /api, /public and /ws to the
    // backend in dev, but that config never runs here: this branch skips Vite entirely.
    // Without an equivalent proxy, relative API calls from the browser would resolve
    // against the frontend's own origin instead of reaching the backend container.
    //
    // Mounted at the app root (not via `app.use('/api', ...)`) so Express never strips
    // the matched prefix from `req.url` before the proxy sees it — otherwise the backend
    // would receive `/auth/me` instead of `/api/auth/me`. `pathFilter` does the routing
    // instead, leaving the original path intact.
    const backendBaseUrl = process.env.CALENDARY_API_BASE_URL ?? 'http://backend:8080'
    apiProxy = createProxyMiddleware({
        target: backendBaseUrl,
        changeOrigin: true,
        ws: true,
        pathFilter: ['/api', '/public', '/ws'],
    })
    app.use(apiProxy)
    app.use('/assets', express.static(path.resolve(root, 'dist/client/assets'), {immutable: true, maxAge: '1y'}))
}

app.use(async (request, response, next) => {
    const url = request.originalUrl

    if (url === '/app') {
        response.redirect(302, '/app/calendar')
        return
    }

    try {
        const templatePath = isProduction ? 'dist/client/index.html' : 'index.html'
        let template = await fs.readFile(path.resolve(root, templatePath), 'utf-8')
        let render: (url: string) => Promise<{html: string; redirect?: {href: string; statusCode: number}}>

        if (!isProduction && vite) {
            template = await vite.transformIndexHtml(url, template)
            render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
        } else {
            const serverEntry = pathToFileURL(path.resolve(root, 'dist/server/entry-server.js')).href
            render = (await import(serverEntry)).render
        }

        const result = await render(url)
        if (result.redirect) {
            response.redirect(result.redirect.statusCode, result.redirect.href)
            return
        }

        const html = template.replace('<!--ssr-outlet-->', result.html)
        response.status(200).set({'Content-Type': 'text/html'}).end(html)
    } catch (error) {
        vite?.ssrFixStacktrace(error as Error)
        next(error)
    }
})

const httpServer = app.listen(port, () => {
    console.log(`Calendary frontend running on http://localhost:${port}`)
})

if (apiProxy) {
    httpServer.on('upgrade', apiProxy.upgrade)
}
