import { Check } from 'lucide-react'
import { THEMES, THEME_SWATCH, useTheme } from './theme'
import { useI18n } from '../i18n'

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  return (
    <div role="radiogroup" aria-label={t('settings.theme')} className="flex gap-3">
      {THEMES.map((k) => (
        <button
          key={k} role="radio" aria-checked={theme === k} aria-label={t(`theme.${k}`)}
          onClick={() => setTheme(k)}
          className={`grid h-11 w-11 place-items-center rounded-full border-2 transition duration-fast active:scale-95 ${
            theme === k ? 'border-ink' : 'border-ink/15'}`}
          style={{ background: THEME_SWATCH[k] }}
        >
          {theme === k && <Check size={18} className="text-white drop-shadow" />}
        </button>
      ))}
    </div>
  )
}
