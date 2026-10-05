import { LANGS, LOCALES, useI18n } from '../i18n'

export default function LanguageSelect({ value, onChange }: { value?: string; onChange?: (l: (typeof LANGS)[number]) => void }) {
  const ctx = useI18n()
  const current = value ?? ctx.lang
  const pick = onChange ?? ctx.setLang
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {LANGS.map((l) => (
        <button
          key={l} type="button" role="radio" aria-checked={current === l} onClick={() => pick(l)}
          className={`flex min-h-[48px] items-center gap-2 rounded-ctl border px-3 text-sm font-semibold transition duration-fast active:scale-[0.97] ${
            current === l ? 'border-brand bg-brand-soft text-brand' : 'border-ink/15 bg-surface/60 text-ink/80'}`}
        >
          <span aria-hidden className="text-lg">{LOCALES[l].flag}</span>{LOCALES[l].name}
        </button>
      ))}
    </div>
  )
}
