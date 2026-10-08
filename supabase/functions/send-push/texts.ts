// Тексты уведомлений для push на языке получателя (в приложении те же строки лежат в src/i18n/locales/*.ts, ключи notice.*).
// Если менять тексты, правьте в обоих местах.
export const LANGS = ['en', 'de', 'ru', 'uk'] as const
export type Lang = (typeof LANGS)[number]
export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v)

export const TEXTS: Record<Lang, Record<string, string>> = {
  "ru": {
    "task_new.t": "🎉 Новое задание: {title}",
    "task_new.b": "+{points} 💎",
    "task_submitted.t": "🔔 {name}: задание выполнено",
    "task_submitted.b": "«{title}». Проверьте выполнение.",
    "task_approved.t": "⭐ Отлично! Задание подтверждено",
    "task_approved.b": "+{points} 💎 за «{title}»",
    "task_rejected.t": "🔁 Нужно доработать",
    "task_rejected.b": "«{title}»{reason}",
    "reward_requested.t": "🎁 {name} хочет награду",
    "reward_requested.b": "«{title}» за {cost} 💎",
    "reward_approved.t": "🎁 Награда одобрена",
    "reward_approved.b": "«{title}». Списано {cost} 💎",
    "reward_rejected.t": "🙅 Награда пока недоступна",
    "reward_rejected.b": "«{title}»{reason}",
    "member_joined.t": "👋 {name} в семье",
    "member_joined.child": "Новый ребёнок присоединился.",
    "member_joined.parent": "Второй родитель присоединился.",
    "member_returned.t": "🔑 {name}: вход с нового устройства",
    "member_returned.b": "Ребёнок вернулся в профиль по коду возврата."
  },
  "en": {
    "task_new.t": "🎉 New task: {title}",
    "task_new.b": "+{points} 💎",
    "task_submitted.t": "🔔 {name} finished a task",
    "task_submitted.b": "“{title}”. Please review it.",
    "task_approved.t": "⭐ Well done! Task approved",
    "task_approved.b": "+{points} 💎 for “{title}”",
    "task_rejected.t": "🔁 Needs another go",
    "task_rejected.b": "“{title}”{reason}",
    "reward_requested.t": "🎁 {name} wants a reward",
    "reward_requested.b": "“{title}” for {cost} 💎",
    "reward_approved.t": "🎁 Reward approved",
    "reward_approved.b": "“{title}”. {cost} 💎 spent",
    "reward_rejected.t": "🙅 Reward not available yet",
    "reward_rejected.b": "“{title}”{reason}",
    "member_joined.t": "👋 {name} joined the family",
    "member_joined.child": "A new child has joined.",
    "member_joined.parent": "The second parent has joined.",
    "member_returned.t": "🔑 {name}: signed in on a new device",
    "member_returned.b": "The child returned to their profile with a return code."
  },
  "de": {
    "task_new.t": "🎉 Neue Aufgabe: {title}",
    "task_new.b": "+{points} 💎",
    "task_submitted.t": "🔔 {name} hat eine Aufgabe erledigt",
    "task_submitted.b": "„{title}“. Bitte prüfen.",
    "task_approved.t": "⭐ Super! Aufgabe bestätigt",
    "task_approved.b": "+{points} 💎 für „{title}“",
    "task_rejected.t": "🔁 Bitte nochmal überarbeiten",
    "task_rejected.b": "„{title}“{reason}",
    "reward_requested.t": "🎁 {name} möchte eine Belohnung",
    "reward_requested.b": "„{title}“ für {cost} 💎",
    "reward_approved.t": "🎁 Belohnung genehmigt",
    "reward_approved.b": "„{title}“. {cost} 💎 ausgegeben",
    "reward_rejected.t": "🙅 Belohnung vorerst nicht verfügbar",
    "reward_rejected.b": "„{title}“{reason}",
    "member_joined.t": "👋 {name} ist in der Familie",
    "member_joined.child": "Ein neues Kind ist beigetreten.",
    "member_joined.parent": "Der zweite Elternteil ist beigetreten.",
    "member_returned.t": "🔑 {name}: Anmeldung auf einem neuen Gerät",
    "member_returned.b": "Das Kind ist mit einem Rückkehrcode in sein Profil zurückgekehrt."
  },
  "uk": {
    "task_new.t": "🎉 Нове завдання: {title}",
    "task_new.b": "+{points} 💎",
    "task_submitted.t": "🔔 {name}: завдання виконано",
    "task_submitted.b": "«{title}». Перевірте виконання.",
    "task_approved.t": "⭐ Чудово! Завдання підтверджено",
    "task_approved.b": "+{points} 💎 за «{title}»",
    "task_rejected.t": "🔁 Потрібно доопрацювати",
    "task_rejected.b": "«{title}»{reason}",
    "reward_requested.t": "🎁 {name} хоче нагороду",
    "reward_requested.b": "«{title}» за {cost} 💎",
    "reward_approved.t": "🎁 Нагороду схвалено",
    "reward_approved.b": "«{title}». Списано {cost} 💎",
    "reward_rejected.t": "🙅 Нагорода поки недоступна",
    "reward_rejected.b": "«{title}»{reason}",
    "member_joined.t": "👋 {name} у родині",
    "member_joined.child": "Нова дитина приєдналася.",
    "member_joined.parent": "Другий із батьків приєднався.",
    "member_returned.t": "🔑 {name}: вхід з нового пристрою",
    "member_returned.b": "Дитина повернулася в профіль за кодом повернення."
  }
}

export function fill(raw: string, vars: Record<string, string | number>): string {
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}
