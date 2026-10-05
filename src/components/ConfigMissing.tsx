import { KeyRound } from 'lucide-react'
import { useI18n } from '../i18n'

export default function ConfigMissing() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-6">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-brand/25 bg-brand-soft text-brand">
        <KeyRound size={32} aria-hidden />
      </div>
      <h1 className="font-display text-2xl font-semibold">{t('cfg.title')}</h1>
      <p className="text-ink/70">{t('cfg.text')}</p>
      <p className="text-sm text-ink/50">{t('cfg.hint')}</p>
    </div>
  )
}
