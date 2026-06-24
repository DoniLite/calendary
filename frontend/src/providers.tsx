import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { WorkspaceSessionProvider } from './features/auth/workspace-session'
import { NotificationSocketProvider } from './features/inbox/notification-socket-provider'
import { ThemeProvider } from './features/theme/theme-provider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceSessionProvider>
        <NotificationSocketProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NotificationSocketProvider>
      </WorkspaceSessionProvider>
    </QueryClientProvider>
  )
}
