import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useI18n, type Lang } from '../i18n'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { useOnline } from '../hooks/useOnline'
import ThemeSwitcher from '../theme/ThemeSwitcher'
import LanguageSelect from '../components/LanguageSelect'
import PushSettings from '../components/PushSettings'
import { openTour } from '../components/WelcomeTour'
import { HelpCircle } from 'lucide-react'

// Вкладка «Настройки»: тема, язык (у каждого участника свой, хранится в его профиле) и уведомления.
export default function Settings() {
  const { t, setLang, setForced } = useI18n()
  const { session, refresh } = useAuth()
  const online = useOnline()
  const uid = session?.user.id ?? ''
  const [error, setError] = useState<string | null>(null)

  // Язык применяем сразу и сохраняем в профиле — на всех устройствах этого человека будет одинаковым
  async function onLang(l: Lang) {
    setLang(l)
    setForced(l)
    if (!uid || !online) return
    setError(null)
    try {
      await callRpc('set_member_language', { p_user: uid, p_lang: l })
      await refresh()
    } catch (e) {
      setError(humanError(e, t))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">{t('settings.title')}</h1>

      <div className="card flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink/70">{t('settings.theme')}</span>
          <ThemeSwitcher />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink/70">{t('settings.language')}</span>
          <LanguageSelect onChange={onLang} />
          <p className="text-xs text-ink/50">{t('settings.langHint')}</p>
          {error && (
            <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              {error}
            </p>
          )}
        </div>
      </div>

      <PushSettings />

      <button type="button" className="btn-soft w-full" onClick={openTour}>
        <HelpCircle size={18} aria-hidden /> {t('tour.replay')}
      </button>
    </div>
  )
}
