import { useQueryClient } from '@tanstack/react-query'
import { useEffect, type PropsWithChildren } from 'react'
import { createNotificationSocketClient } from '../../lib/notification-socket'
import { useWorkspaceSession } from '../auth/workspace-session'

export function NotificationSocketProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useWorkspaceSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !user?.id || typeof window === 'undefined') return

    const client = createNotificationSocketClient(user.id, () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      // Covers INVITATION_ACCEPTED/COLLABORATION_ACCEPTED — the sidebar's member/collaboration
      // lists otherwise only refresh on a full page reload, never when someone else joins live.
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] })
      queryClient.invalidateQueries({ queryKey: ['collaborations'] })
    })
    client.activate()

    return () => {
      client.deactivate()
    }
  }, [isAuthenticated, user?.id, queryClient])

  return <>{children}</>
}
