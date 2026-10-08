// Разбор адреса, с которым человек пришёл по ссылке из письма Supabase (восстановление пароля).
// Чистая функция без браузера: удобно тестировать. Ссылка приходит вида
//   https://сайт/#access_token=…&type=recovery        — всё хорошо, это вход для смены пароля
//   https://сайт/#error=access_denied&error_code=otp_expired&…  — ссылка устарела или уже использована

export interface UrlAuth {
  /** Пришли по рабочей ссылке восстановления пароля */
  recovery: boolean
  /** Ссылка из письма не сработала: 'expired' (устарела/использована) или 'other' */
  error: 'expired' | 'other' | null
}

export const NO_URL_AUTH: UrlAuth = { recovery: false, error: null }

function paramsOf(part: string): URLSearchParams {
  return new URLSearchParams(part.replace(/^[#?]/, ''))
}

export function parseAuthUrl(hash: string, search: string): UrlAuth {
  const h = paramsOf(hash)
  const s = paramsOf(search)
  const get = (k: string) => h.get(k) ?? s.get(k)

  const errCode = get('error_code') ?? ''
  const errName = get('error') ?? ''
  const errDesc = get('error_description') ?? ''
  if (errCode || errName) {
    const expired = errCode === 'otp_expired' || /expired|invalid/i.test(errDesc)
    return { recovery: false, error: expired ? 'expired' : 'other' }
  }
  if (get('type') === 'recovery' && (h.has('access_token') || s.has('code'))) {
    return { recovery: true, error: null }
  }
  return NO_URL_AUTH
}
