import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { createCalendaryRouter } from './router'
import { AppProviders } from './providers'
import './styles/globals.css'

const router = createCalendaryRouter()

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
