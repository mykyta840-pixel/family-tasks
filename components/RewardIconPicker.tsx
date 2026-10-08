import { RewardIconTile } from './RewardIcon'
import { REWARD_GROUPS, rewardIconsOfGroup, type RewardIconKey } from '../lib/rewardIconKeys'
import { useI18n } from '../i18n'

export default function RewardIconPicker({ value, onChange }: { value: RewardIconKey; onChange: (k: RewardIconKey) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-4" role="radiogroup" aria-label={t('rew.icon')}>
      {REWARD_GROUPS.map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{t(`rewGroup.${g}`)}</h3>
          <div className="grid grid-cols-4 gap-2">
            {rewardIconsOfGroup(g).map((k) => {
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
                  <RewardIconTile icon={k} className="h-11 w-11 rounded-xl" iconSize={22} selected={active} />
                  <span className="w-full truncate text-center text-[11px] leading-tight text-ink/70">{t(`rewIcon.${k}`)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
