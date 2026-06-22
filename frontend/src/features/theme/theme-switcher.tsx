import { Paintbrush } from 'lucide-react'
import { themes, type ThemeId } from './themes'
import { useTheme } from './theme-provider'

export function ThemeSwitcher() {
  const { themeId, setThemeId } = useTheme()

  return (
    <label className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm">
      <Paintbrush className="h-4 w-4 text-muted-foreground" aria-hidden />
      <select
        className="w-full bg-transparent text-sm outline-none"
        value={themeId}
        onChange={(event) => setThemeId(event.target.value as ThemeId)}
        aria-label="Theme"
      >
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
    </label>
  )
}
