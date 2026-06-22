import { RouterProvider } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { createCalendaryRouter } from './router'
import { AppProviders } from './providers'
import './styles/globals.css'

export async function render(url: string) {
  const router = createCalendaryRouter(url)
  await router.load()

  return renderToString(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}
