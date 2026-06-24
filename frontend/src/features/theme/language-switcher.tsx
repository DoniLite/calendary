import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { languageStorageKey, supportedLanguages, type SupportedLanguage } from '../../lib/i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <label className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm">
      <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
      <select
        className="w-full bg-transparent text-sm outline-none"
        value={i18n.language}
        onChange={(event) => {
          const next = event.target.value as SupportedLanguage
          void i18n.changeLanguage(next)
          window.localStorage.setItem(languageStorageKey, next)
        }}
        aria-label={t('language.label')}
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {t(`language.${lang}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
