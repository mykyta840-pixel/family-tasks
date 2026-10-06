import { ruT, type TFn } from '../i18n/ruT'

// Техническая подстрока в ошибке -> ключ перевода (первое совпадение выигрывает)
const RULES: [string, string][] = [
  ['Invalid login credentials', 'err.invalidLogin'],
  ['User already registered', 'err.alreadyRegistered'],
  ['Email not confirmed', 'err.emailNotConfirmed'],
  ['Database error saving new user', 'err.dbSaveUser'],
  ['Password should contain', 'err.weakPassword'],
  ['rate limit', 'err.rateLimit'],
  ['Signups not allowed', 'err.signupsOff'],
  ['Invalid API key', 'err.badKey'],
  ['invalid_code', 'err.invalidCode'],
  ['already_in_family', 'err.alreadyInFamily'],
  ['not_allowed', 'err.notAllowed'],
  ['not_pending', 'err.notPending'],
  ['already_submitted', 'err.alreadySubmitted'],
  ['already_requested', 'err.alreadyRequested'],
  ['not_enough_points', 'err.notEnoughPoints'],
  ['bad_image', 'err.badImage'],
  ['bad_name', 'err.badName'],
  ['bad_avatar', 'err.badImage'],
  ['remind_too_soon', 'err.remindTooSoon'],
]

function messageOf(err: unknown): string {
  return err instanceof Error
    ? err.message
    : typeof err === 'object' && err && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err)
}

export function errorKey(err: unknown): string {
  const msg = messageOf(err)
  for (const [part, key] of RULES) if (msg.includes(part)) return key
  if (/password/i.test(msg) && /(6|short|weak)/i.test(msg)) return 'err.shortPassword'
  if (/fetch|network|failed to/i.test(msg)) return 'err.network'
  return 'err.unknown'
}

// Превращает техническую ошибку в понятный текст на языке интерфейса.
// Без второго аргумента отвечает по-русски (так работают тесты).
export function humanError(err: unknown, t: TFn = ruT): string {
  return t(errorKey(err))
}

// Техническая причина: мелким текстом под ошибкой, чтобы её можно было прислать разработчику
export function errorDetail(err: unknown): string {
  const msg = err == null ? '' : messageOf(err)
  const status = typeof err === 'object' && err && 'status' in err ? ` [${String((err as { status: unknown }).status)}]` : ''
  return msg && msg !== 'undefined' ? `${msg}${status}` : ''
}
