import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import express from 'express'
import {createServer as createViteServer} from 'vite'

const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 5173)
const root = process.cwd()
const app = express()

// The browser talks directly to the backend's own public origin (CORS-enabled there) instead
// of going through a same-origin proxy on this server. Baked into the HTML below so client-side
// code can read it; SSR reads `process.env.CALENDARY_API_BASE_URL` directly (see lib/api.ts).
const backendBaseUrl = process.env.CALENDARY_API_BASE_URL ?? 'http://localhost:8080'

let vite: Awaited<ReturnType<typeof createViteServer>> | undefined

if (!isProduction) {
    vite = await createViteServer({
        root,
        server: {middlewareMode: true},
        appType: 'custom',
    })
    app.use(vite.middlewares)
} else {
    app.use('/assets', express.static(path.resolve(root, 'dist/client/assets'), {immutable: true, maxAge: '1y'}))
    // Vite copies everything from `public/` (favicon.ico, avatar.jpeg, ...) to the root of
    // `dist/client` at build time, not into `dist/client/assets`. Without this, requests for
    // those files fall through to the SSR catch-all below, which returns the app's HTML
    // instead of the actual file.
    app.use(express.static(path.resolve(root, 'dist/client'), {index: false}))
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

        const injectedConfig = `<script>window.__API_BASE_URL__=${JSON.stringify(isProduction ? backendBaseUrl : '')}</script>`
        const html = template.replace('<!--ssr-outlet-->', result.html).replace('</head>', `${injectedConfig}</head>`)
        response.status(200).set({'Content-Type': 'text/html'}).end(html)
    } catch (error) {
        vite?.ssrFixStacktrace(error as Error)
        next(error)
    }
})

app.listen(port, () => {
    console.log(`Calendary frontend running on http://localhost:${port}`)
})
