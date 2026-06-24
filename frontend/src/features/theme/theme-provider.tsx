import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useWorkspaceThemeMutation } from '../../lib/api'
import { defaultTheme, themes, type ThemeId } from './themes'

type ThemeContextValue = {
  themeId: ThemeId
  setThemeId: (themeId: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const themeStorageKey = 'calendary.theme'

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && themes.some((theme) => theme.id === value)
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const { activeWorkspace, isAuthenticated } = useWorkspaceSession()
  const themeMutation = useWorkspaceThemeMutation(activeWorkspace?.id)
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof document === 'undefined') {
      return defaultTheme
    }
    const current = document.documentElement.dataset.theme
    return isThemeId(current) ? current : defaultTheme
  })
  // Tracks whether the workspace's server-side theme has already been applied once, so we
  // don't keep overwriting a user's in-flight local change every time the workspace query
  // refetches.
  const appliedWorkspaceTheme = useRef<string | undefined>(undefined)

  // Anonymous visitors (no session) keep using localStorage only — there's no account to
  // persist a preference against. Authenticated users get the workspace's theme as the
  // source of truth once it loads.
  useEffect(() => {
    if (!isAuthenticated || !activeWorkspace?.theme) return
    if (appliedWorkspaceTheme.current === activeWorkspace.theme) return
    appliedWorkspaceTheme.current = activeWorkspace.theme
    if (isThemeId(activeWorkspace.theme)) {
      setThemeIdState(activeWorkspace.theme)
    }
  }, [isAuthenticated, activeWorkspace?.theme])

  useEffect(() => {
    const theme = themes.find((item) => item.id === themeId) ?? themes[0]
    document.documentElement.dataset.theme = theme.id
    document.documentElement.dataset.mode = theme.mode
    window.localStorage.setItem(themeStorageKey, theme.id)
  }, [themeId])

  const workspaceId = activeWorkspace?.id
  const setThemeId = useCallback(
    (next: ThemeId) => {
      setThemeIdState(next)
      if (isAuthenticated && workspaceId) {
        appliedWorkspaceTheme.current = next
        themeMutation.mutate({ theme: next })
      }
    },
    [isAuthenticated, workspaceId, themeMutation],
  )

  const value = useMemo(() => ({ themeId, setThemeId }), [themeId, setThemeId])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.')
  }
  return context
}
