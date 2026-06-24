import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { WorkspaceSessionProvider } from './features/auth/workspace-session'
import { NotificationSocketProvider } from './features/inbox/notification-socket-provider'
import { ThemeProvider } from './features/theme/theme-provider'
import i18n, { languageStorageKey, supportedLanguages, type SupportedLanguage } from './lib/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function LanguageSync() {
  useEffect(() => {
    const stored = window.localStorage.getItem(languageStorageKey)
    if (stored && supportedLanguages.includes(stored as SupportedLanguage) && stored !== i18n.language) {
      void i18n.changeLanguage(stored)
    }
  }, [])
  return null
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <WorkspaceSessionProvider>
          <NotificationSocketProvider>
            <ThemeProvider>
              {typeof window !== 'undefined' && <LanguageSync />}
              {children}
            </ThemeProvider>
          </NotificationSocketProvider>
        </WorkspaceSessionProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
}
