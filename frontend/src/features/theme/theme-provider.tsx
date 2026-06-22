import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { defaultTheme, themes, type ThemeId } from './themes'

type ThemeContextValue = {
  themeId: ThemeId
  setThemeId: (themeId: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeId] = useState<ThemeId>(defaultTheme)

  useEffect(() => {
    const stored = window.localStorage.getItem('calendary.theme') as ThemeId | null
    if (stored && themes.some((theme) => theme.id === stored)) {
      setThemeId(stored)
    }
  }, [])

  useEffect(() => {
    const theme = themes.find((item) => item.id === themeId) ?? themes[0]
    document.documentElement.dataset.theme = theme.id
    document.documentElement.dataset.mode = theme.mode
    window.localStorage.setItem('calendary.theme', theme.id)
  }, [themeId])

  const value = useMemo(() => ({ themeId, setThemeId }), [themeId])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.')
  }
  return context
}
