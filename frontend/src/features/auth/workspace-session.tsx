import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { apiGet, fallbackWorkspaceId, type AuthenticatedUserResponse, type WorkspaceResponse } from '../../lib/api'

type WorkspaceSessionValue = {
  user?: AuthenticatedUserResponse
  workspaces: WorkspaceResponse[]
  activeWorkspace?: WorkspaceResponse
  activeWorkspaceId: string
  apiEnabled: boolean
  isAuthenticated: boolean
  isLoading: boolean
  setActiveWorkspaceId: (workspaceId: string) => void
  refreshSession: () => Promise<void>
  clearSession: () => void
}

const activeWorkspaceStorageKey = 'calendary.activeWorkspaceId'
const WorkspaceSessionContext = createContext<WorkspaceSessionValue | null>(null)

export function WorkspaceSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => {
    if (typeof window === 'undefined') return fallbackWorkspaceId
    return window.localStorage.getItem(activeWorkspaceStorageKey) || fallbackWorkspaceId
  })

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiGet<AuthenticatedUserResponse>('/api/auth/me'),
    retry: false,
  })

  const workspacesQuery = useQuery({
    queryKey: ['me', 'workspaces'],
    queryFn: () => apiGet<{ items: WorkspaceResponse[] }>('/api/me/workspaces'),
    enabled: Boolean(meQuery.data),
    retry: false,
  })

  const workspaces = workspacesQuery.data?.items ?? []
  const activeWorkspace = useMemo(() => {
    if (!workspaces.length) return undefined
    return workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0]
  }, [selectedWorkspaceId, workspaces])

  useEffect(() => {
    if (!activeWorkspace || activeWorkspace.id === selectedWorkspaceId) return
    setSelectedWorkspaceId(activeWorkspace.id)
  }, [activeWorkspace, selectedWorkspaceId])

  useEffect(() => {
    if (typeof window === 'undefined' || !activeWorkspace?.id) return
    window.localStorage.setItem(activeWorkspaceStorageKey, activeWorkspace.id)
  }, [activeWorkspace?.id])

  const value = useMemo<WorkspaceSessionValue>(
    () => ({
      user: meQuery.data,
      workspaces,
      activeWorkspace,
      activeWorkspaceId: activeWorkspace?.id ?? fallbackWorkspaceId,
      apiEnabled: Boolean(activeWorkspace?.id),
      isAuthenticated: Boolean(meQuery.data),
      isLoading: meQuery.isPending || (Boolean(meQuery.data) && workspacesQuery.isPending),
      setActiveWorkspaceId: setSelectedWorkspaceId,
      refreshSession: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
          queryClient.invalidateQueries({ queryKey: ['me', 'workspaces'] }),
        ])
      },
      clearSession: () => {
        queryClient.removeQueries({ queryKey: ['auth'] })
        queryClient.removeQueries({ queryKey: ['me'] })
        setSelectedWorkspaceId(fallbackWorkspaceId)
      },
    }),
    [activeWorkspace, meQuery.data, meQuery.isPending, queryClient, workspaces, workspacesQuery.isPending],
  )

  return <WorkspaceSessionContext.Provider value={value}>{children}</WorkspaceSessionContext.Provider>
}

export function useWorkspaceSession() {
  const value = useContext(WorkspaceSessionContext)
  if (!value) {
    throw new Error('useWorkspaceSession must be used inside WorkspaceSessionProvider.')
  }
  return value
}
