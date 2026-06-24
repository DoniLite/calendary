import { RouterProvider } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { createCalendaryRouter } from './router'
import { AppProviders } from './providers'
import './styles/globals.css'

export type RenderResult = { html: string; redirect?: { href: string; statusCode: number } }

export async function render(url: string): Promise<RenderResult> {
  const router = createCalendaryRouter(url)
  await router.load()

  // beforeLoad/loader redirects (e.g. the public-calendar root redirect) only update
  // router.state during SSR — there's no History API to follow them. Without surfacing
  // this, renderToString silently renders nothing for the redirected route.
  const redirect = router.state.redirect
  if (redirect) {
    return { html: '', redirect: { href: redirect.options.href ?? '/', statusCode: redirect.status || 307 } }
  }

  const html = renderToString(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { html }
}
