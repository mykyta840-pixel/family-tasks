import { ImageIcon } from 'lucide-react'
import { TaskIconTile } from './TaskVisual'
import { ICON_GROUPS, iconsOfGroup, type TaskIconKey } from '../lib/taskIconKeys'
import { useI18n } from '../i18n'

// Выбор встроенной иконки задания. value = null означает «оставить прежнюю загруженную картинку» (только у старых заданий).
export default function TaskIconPicker({ value, onChange, legacyImage }: { value: TaskIconKey | null; onChange: (k: TaskIconKey | null) => void; legacyImage?: string | null }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-4" role="radiogroup" aria-label={t('form.icon')}>
      {legacyImage && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          className={`flex min-h-[56px] items-center gap-3 rounded-ctl border p-2 text-left transition duration-fast active:scale-[0.98] ${value === null ? 'border-brand bg-brand-soft shadow-glow' : 'border-ink/10 bg-surface/70'}`}
        >
          <img src={legacyImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <span className="flex items-center gap-1.5 text-sm font-medium"><ImageIcon size={16} aria-hidden /> {t('form.iconLegacy')}</span>
        </button>
      )}
      {ICON_GROUPS.map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{t(`iconGroup.${g}`)}</h3>
          <div className="grid grid-cols-4 gap-2">
            {iconsOfGroup(g).map((k) => {
              const active = value === k
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(k)}
                  className={`flex min-h-[76px] min-w-0 flex-col items-center gap-1.5 rounded-ctl border px-1 py-2 transition duration-fast active:scale-95 ${active ? 'border-brand bg-brand-soft/60' : 'border-transparent'}`}
                >
                  <TaskIconTile iconKey={k} className="h-11 w-11 rounded-xl" iconSize={22} selected={active} />
                  <span className="w-full truncate text-center text-[11px] leading-tight text-ink/70">{t(`icon.${k}`)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
