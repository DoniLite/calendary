import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import express from 'express'
import {createServer as createViteServer} from 'vite'

const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 5173)
const root = process.cwd()
const app = express()

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
}

app.use(async (request, response, next) => {
    const url = request.originalUrl

    try {
        const templatePath = isProduction ? 'dist/client/index.html' : 'index.html'
        let template = await fs.readFile(path.resolve(root, templatePath), 'utf-8')
        let render: (url: string) => Promise<string>

        if (!isProduction && vite) {
            template = await vite.transformIndexHtml(url, template)
            render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
        } else {
            const serverEntry = pathToFileURL(path.resolve(root, 'dist/server/entry-server.js')).href
            render = (await import(serverEntry)).render
        }

        const html = template.replace('<!--ssr-outlet-->', await render(url))
        response.status(200).set({'Content-Type': 'text/html'}).end(html)
    } catch (error) {
        vite?.ssrFixStacktrace(error as Error)
        next(error)
    }
})

app.listen(port, () => {
    console.log(`Calendary frontend running on http://localhost:${port}`)
})
