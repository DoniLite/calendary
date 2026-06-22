export type ThemeId =
  | 'solar-orange'
  | 'paper-green'
  | 'clear-blue'
  | 'ember-dark'
  | 'graphite-cyan'
  | 'plum-night'

export type ThemeMode = 'light' | 'dark'

export const themes: Array<{
  id: ThemeId
  label: string
  mode: ThemeMode
  accent: string
}> = [
  { id: 'solar-orange', label: 'Solar Orange', mode: 'light', accent: '#f97316' },
  { id: 'paper-green', label: 'Paper Green', mode: 'light', accent: '#2f9b62' },
  { id: 'clear-blue', label: 'Clear Blue', mode: 'light', accent: '#1d7ed0' },
  { id: 'ember-dark', label: 'Ember Dark', mode: 'dark', accent: '#fb7a22' },
  { id: 'graphite-cyan', label: 'Graphite Cyan', mode: 'dark', accent: '#1dc0d4' },
  { id: 'plum-night', label: 'Plum Night', mode: 'dark', accent: '#a878df' },
]

export const defaultTheme: ThemeId = 'solar-orange'
