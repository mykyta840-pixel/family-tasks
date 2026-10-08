import type { Role } from './types'

// Чистая логика кодов приглашения и кодов возврата (без сети и React, чтобы её можно было проверить тестами).
// Коды выглядят так: FAM-7K29X (приглашение), RET-7K29X8 (код возврата ребёнка). Старые коды из 10 символов тоже работают.

/** Только латиница и цифры, заглавные: «fam-7k29x » -> «FAM7K29X». Так код сравнивает и база. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Вид кода, который показываем в поле ввода: после FAM/RET сам ставится дефис. */
export function formatCodeInput(raw: string): string {
  const n = normalizeCode(raw).slice(0, 12)
  const m = /^(FAM|RET)(.+)$/.exec(n)
  return m ? `${m[1]}-${m[2]}` : n
}

/** Достаточно ли символов, чтобы отправлять код на проверку. */
export function looksLikeCode(raw: string): boolean {
  return normalizeCode(raw).length >= 6
}

export type CheckResult =
  | { kind: 'invite'; role: Role; family: string }
  | { kind: 'return'; child: string }

interface Reply {
  ok?: unknown
  reason?: unknown
  kind?: unknown
  role?: unknown
  family?: unknown
  child?: unknown
}

function asReply(data: unknown): Reply {
  return data && typeof data === 'object' ? (data as Reply) : {}
}

/** Ответ базы «код не подошёл / слишком много попыток» превращаем в ошибку, которую понимает humanError. */
function failure(r: Reply): Error {
  return new Error(r.reason === 'too_many' ? 'too_many_attempts' : 'invalid_code')
}

/** Ответ check_invite -> что это за код. Бросает ошибку, если код неверный или попыток слишком много. */
export function parseCheckReply(data: unknown): CheckResult {
  const r = asReply(data)
  if (r.ok !== true) throw failure(r)
  if (r.kind === 'return') return { kind: 'return', child: typeof r.child === 'string' ? r.child : '' }
  if (r.kind === 'invite' && (r.role === 'child' || r.role === 'parent')) {
    return { kind: 'invite', role: r.role, family: typeof r.family === 'string' ? r.family : '' }
  }
  throw new Error('invalid_code')
}

/** Ответ join_with_code / redeem_return_code: если не «ok», бросает ошибку. */
export function assertOkReply(data: unknown): void {
  const r = asReply(data)
  if (r.ok !== true) throw failure(r)
}
