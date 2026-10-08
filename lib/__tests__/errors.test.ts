import { describe, expect, it } from 'vitest'
import { errorDetail, errorKey, humanError } from '../errors'

describe('humanError', () => {
  it('известные коды из базы', () => {
    expect(humanError(new Error('not_enough_points'))).toBe('Не хватает кристаллов.')
    expect(humanError({ message: 'invalid_code' })).toContain('Код не подошёл')
    expect(humanError({ message: 'already_in_family' })).toBe('Вы уже состоите в семье.')
  })

  it('ошибки входа', () => {
    expect(humanError(new Error('Invalid login credentials'))).toBe('Неверная почта или пароль.')
    expect(humanError(new Error('User already registered'))).toContain('уже зарегистрирована')
  })

  it('короткий пароль', () => {
    expect(humanError(new Error('Password should be at least 6 characters'))).toContain('не короче 6')
  })

  it('нет интернета', () => {
    expect(humanError(new TypeError('Failed to fetch'))).toContain('Нет связи')
  })

  it('неизвестное и странные значения не ломают функцию', () => {
    const fallback = 'Что-то пошло не так. Попробуйте ещё раз.'
    expect(humanError(new Error('xyz'))).toBe(fallback)
    expect(humanError(null)).toBe(fallback)
    expect(humanError(undefined)).toBe(fallback)
    expect(humanError(42)).toBe(fallback)
  })

  it('код внутри длинного сообщения тоже находится', () => {
    expect(humanError({ message: 'P0001: not_allowed (context)' })).toBe('Нет прав на это действие.')
  })
})

describe('новые правила и переводы', () => {
  it('простой пароль, лимит попыток, ошибка базы, отключённая регистрация', () => {
    expect(humanError(new Error('Password should contain at least one character of each'))).toContain('слишком простой')
    expect(humanError(new Error('email rate limit exceeded'))).toContain('Слишком много')
    expect(humanError(new Error('Database error saving new user'))).toContain('профиль')
    expect(humanError(new Error('Signups not allowed for this instance'))).toContain('отключена')
    expect(humanError(new Error('Invalid API key'))).toContain('ключ')
  })

  it('ошибка чтения фото из lib/avatar', () => {
    expect(humanError(new Error('bad_image'))).toContain('Не удалось прочитать фото')
  })

  it('errorKey отдаёт ключ перевода', () => {
    expect(errorKey(new Error('not_enough_points'))).toBe('err.notEnoughPoints')
    expect(errorKey(null)).toBe('err.unknown')
  })

  it('второй аргумент подставляет другой язык', () => {
    const en = (k: string) => `EN:${k}`
    expect(humanError(new Error('invalid_code'), en)).toBe('EN:err.invalidCode')
  })

  it('errorDetail отдаёт исходный текст и код', () => {
    expect(errorDetail({ message: 'boom', status: 500 })).toBe('boom [500]')
    expect(errorDetail(null)).toBe('')
    expect(errorDetail(undefined)).toBe('')
  })
})

describe('этап 3: профиль ребёнка', () => {
  it('ошибки функции update_child_profile', () => {
    expect(errorKey({ message: 'bad_name' })).toBe('err.badName')
    expect(errorKey({ message: 'bad_avatar' })).toBe('err.badImage')
    expect(humanError(new Error('bad_name'))).toContain('от 1 до 40')
  })
})

describe('этап B: восстановление пароля', () => {
  it('ссылка из письма устарела', () => {
    expect(errorKey({ message: 'Email link is invalid or has expired' })).toBe('err.linkExpired')
    expect(errorKey({ message: 'otp_expired' })).toBe('err.linkExpired')
    expect(errorKey({ message: 'Auth session missing!' })).toBe('err.linkExpired')
  })
  it('новый пароль совпал со старым', () => {
    expect(errorKey({ message: 'New password should be different from the old password.' })).toBe('err.samePassword')
  })
  it('слишком частые письма', () => {
    expect(errorKey({ message: 'For security purposes, you can only request this after 52 seconds.' })).toBe('err.rateLimit')
  })
})
